from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import shutil
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, Estimate, Inquiry, Settings

# --- Pydantic Schemas ---
class EstimateCreate(BaseModel):
    inquiry_id: int
    file_paths: List[str]
    production_method: str
    material: str
    quantity: int
    is_hollow: bool = False
    shell_thickness: Optional[float] = None
    calculated_amount: int
    bin_packing_data: Optional[List[Dict[str, Any]]] = None

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import sys
import os

# Hardcode the absolute path because dynamic os.path tree traversal fails under uvicorn Windows execution context
calculator_dir = r"Z:\1 공통 운영\【05】 S·W／양식／매뉴얼\11 안티그래비티 개발\3D file detect"
sys.path.append(calculator_dir)

import calculator
import trimesh

# --- Estimate Generation Logic ---
@router.post("/estimate/calculate")
async def calculate_estimate(
    file: UploadFile = File(...),
    method: str = Form(...),
    material: str = Form(...),
    quantity: int = Form(1),
    is_hollow: bool = Form(False),
    shell_thickness: float = Form(2.0),
    db: Session = Depends(get_db)
):
    os.makedirs("temp_files", exist_ok=True)
    temp_path = os.path.join("temp_files", file.filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 1. Load the mesh
        mesh = trimesh.load(temp_path, force='mesh')
        if not mesh.is_watertight:
            print("Warning: Mesh is not watertight. Calculations might be approximate.")
            
        volume_mm3 = float(mesh.volume)
        area_mm2 = float(mesh.area)
        bbox = mesh.bounding_box.extents
        
        # 2. Run the calculation based on method
        cost_result = {}
        target_cost = 0

        # Fetch Quotes dynamic configurations
        setting_obj = db.query(Settings).filter(Settings.key == "quoting_config").first()
        quoting_config = setting_obj.value if setting_obj and setting_obj.value else {}
        
        method_config = quoting_config.get(method, {})
        equipment_fee = method_config.get("equipment_fee", 0)
        
        material_config = next((m for m in method_config.get("materials", []) if m["name"] == material), {})
        price_per_gram = material_config.get("price_per_gram", 600)
        min_cost = material_config.get("min_cost", 20000)
        
        if method == "SLA":
            target_cost = calculator.calculate_sla(mesh, is_hollow, shell_thickness, price_per_gram, min_cost) * quantity
        elif method == "FDM":
            target_cost = calculator.calculate_fdm(mesh, is_hollow, shell_thickness, price_per_gram, min_cost) * quantity
        elif method == "SLS":
            # SLS uses heightmap binpacking for a batch of items
            items_for_sls = [{
                'mesh': mesh,
                'name': file.filename,
                'quantity': quantity
            }]
            sls_result = calculator.calculate_sls(items_for_sls, is_hollow, shell_thickness, price_per_gram, equipment_fee, min_cost)
            if sls_result['fits']:
                target_cost = sls_result['total_cost']
                cost_result['height_cm'] = sls_result['height_cm']
            else:
                return {"error": "The items exceed the chamber height limits and cannot be packed."}
                
        # 3. Save to DB (optional step for later, returning pure response for now)
        return {
            "filename": file.filename,
            "volume_mm3": volume_mm3,
            "area_mm2": area_mm2,
            "bounding_box": [float(bbox[0]), float(bbox[1]), float(bbox[2])],
            "estimated_cost": target_cost,
            "method": method,
            "material": material,
            "quantity": quantity,
            "details": cost_result
        }
        
    except Exception as e:
        return {"error": str(e)}
        
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/estimates")
def create_estimate(estimate: EstimateCreate, db: Session = Depends(get_db)):
    db_estimate = Estimate(
        inquiry_id=estimate.inquiry_id,
        file_paths=estimate.file_paths, # Store raw array to JSON field
        production_method=estimate.production_method,
        material=estimate.material,
        quantity=estimate.quantity,
        is_hollow=estimate.is_hollow,
        shell_thickness=estimate.shell_thickness,
        calculated_amount=estimate.calculated_amount,
        bin_packing_data=estimate.bin_packing_data
    )
    db.add(db_estimate)
    try:
        db.commit()
        db.refresh(db_estimate)
        
        # Also update the Inquiry status to '견적완료'
        db_inq = db.query(Inquiry).filter(Inquiry.id == estimate.inquiry_id).first()
        if db_inq:
            db_inq.status = '견적완료'
            db.commit()
            
        return db_estimate
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/estimates/{estimate_id}/pdf")
def get_estimate_pdf(estimate_id: int, db: Session = Depends(get_db)):
    db_estimate = db.query(Estimate).filter(Estimate.id == estimate_id).first()
    if not db_estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
        
    # Get client info if inquiry exists
    client_data = {}
    from database import Inquiry, Client
    db_inq = db.query(Inquiry).filter(Inquiry.id == db_estimate.inquiry_id).first()
    if db_inq:
        db_client = db.query(Client).filter(Client.id == db_inq.client_id).first()
        if db_client:
            client_data = {
                "company_name": db_client.company_name,
                "customer_name": db_client.customer_name
            }
            
    estimate_data = {
        "production_method": db_estimate.production_method,
        "material": db_estimate.material,
        "is_hollow": db_estimate.is_hollow,
        "shell_thickness": db_estimate.shell_thickness,
        "quantity": db_estimate.quantity,
        "file_paths": db_estimate.file_paths,
        "calculated_amount": db_estimate.calculated_amount,
        "bin_packing_data": db_estimate.bin_packing_data
    }
    
    import utils.pdf
    pdf_bytes = utils.pdf.generate_estimate_pdf(estimate_data, client_data)
    
    headers = {
        'Content-Disposition': f'attachment; filename="quotation_{estimate_id}.pdf"'
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
