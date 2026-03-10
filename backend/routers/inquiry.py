from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import shutil

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, Client, Inquiry, Estimate, Order
from utils.ocr import extract_business_registration

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ContactInfo(BaseModel):
    name: str
    phone: str
    email: str
    notes: Optional[str] = ""

class ClientCreate(BaseModel):
    company_name: str
    representative_name: Optional[str] = None
    customer_name: str
    email: str
    phone: str
    contacts: List[ContactInfo] = []
    is_new: bool = True
    business_registration_number: Optional[str] = None

class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    representative_name: Optional[str] = None
    customer_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    contacts: Optional[List[ContactInfo]] = None
    business_registration_number: Optional[str] = None

class InquiryCreate(BaseModel):
    client_id: int
    customer_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    receiver_name: str
    service_type: str
    item_name: str
    consultation_details: str
    status: str = "접수대기"
    created_at: Optional[datetime] = None

class InquiryUpdate(BaseModel):
    service_type: Optional[str] = None
    item_name: Optional[str] = None
    consultation_details: Optional[str] = None
    status: Optional[str] = None
    receiver_name: Optional[str] = None
    customer_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None

# --- API Endpoints ---
@router.post("/clients")
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    client_dict = client.dict()
    # If no contacts passed but customer info exists, initialize it
    if not client_dict.get("contacts") and client_dict.get("customer_name"):
        client_dict["contacts"] = [{
            "name": client_dict["customer_name"],
            "phone": client_dict.get("phone", ""),
            "email": client_dict.get("email", ""),
            "notes": "기본 등록"
        }]
    # Re-serialize for json storage if needed, but dict list is fine for SQLAlchemy JSON column
    db_client = Client(**client_dict)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@router.put("/clients/{client_id}")
def update_client(client_id: int, client_update: ClientUpdate, db: Session = Depends(get_db)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client, key, value)
        
    db.commit()
    db.refresh(db_client)
    return db_client

@router.get("/clients")
def read_clients(
    skip: int = 0, 
    limit: int = 100, 
    search_term: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(Client)
    if search_term:
        query = query.filter(
            (Client.company_name.contains(search_term)) | 
            (Client.customer_name.contains(search_term)) |
            (Client.email.contains(search_term)) |
            (Client.phone.contains(search_term))
        )
    return query.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()

@router.post("/clients/{client_id}/upload-business-registration")
def upload_business_registration(
    client_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    save_path = os.path.join(upload_dir, f"biz_reg_{client_id}{file_extension}")
    
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    extracted_data = {}
    try:
        extracted_data = extract_business_registration(save_path)
    except Exception as e:
        print(f"Error during OCR extraction: {e}")
        
    if not extracted_data:
        raise HTTPException(status_code=400, detail="OCR 파싱에 실패했습니다. Render 환경변수에 GEMINI_API_KEY가 등록되어 있는지 혹은 이미지 품질이 좋은지 확인해주세요.")
        
    if extracted_data.get("business_registration_number"):
        db_client.business_registration_number = extracted_data["business_registration_number"]
    if extracted_data.get("company_name"):
        db_client.company_name = extracted_data["company_name"]
    if extracted_data.get("representative_name"):
        db_client.representative_name = extracted_data["representative_name"]
    if extracted_data.get("address"):
        db_client.address = extracted_data["address"]
    if extracted_data.get("business_type"):
        db_client.business_type = extracted_data["business_type"]
    if extracted_data.get("business_item"):
        db_client.business_item = extracted_data["business_item"]
        
    # Store path relative to backend root
    db_client.business_registration_file = f"uploads/biz_reg_{client_id}{file_extension}"
        
    db.commit()
    db.refresh(db_client)
    
    return {
        "message": "File uploaded and processed successfully",
        "client": db_client,
        "extracted_data": extracted_data
    }

@router.post("/inquiries")
def create_inquiry(inquiry: InquiryCreate, db: Session = Depends(get_db)):
    inquiry_data = inquiry.dict()
    created_at_val = inquiry.created_at
    if created_at_val is not None and created_at_val.tzinfo is not None:
        inquiry_data['created_at'] = created_at_val.replace(tzinfo=None)
    db_inquiry = Inquiry(**inquiry_data)
    db.add(db_inquiry)
    
    # Auto-append new contact to the client's contact list
    if inquiry.client_id and inquiry.customer_name:
        db_client = db.query(Client).filter(Client.id == inquiry.client_id).first()
        if db_client:
            existing_contacts = db_client.contacts if db_client.contacts else []
            if not any(c.get("name") == inquiry.customer_name for c in existing_contacts):
                updated_contacts = existing_contacts.copy()
                updated_contacts.append({
                    "name": inquiry.customer_name,
                    "phone": inquiry.phone or "",
                    "email": inquiry.email or "",
                    "notes": "추가 문의 접수"
                })
                # In SQLAlchemy, setting the attribute to a new list triggers the update
                db_client.contacts = updated_contacts
                
    db.commit()
    db.refresh(db_inquiry)
    return db_inquiry

@router.put("/inquiries/{inquiry_id}")
def update_inquiry(inquiry_id: int, inquiry_update: InquiryUpdate, db: Session = Depends(get_db)):
    db_inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not db_inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    update_data = inquiry_update.dict(exclude_unset=True)
    if 'created_at' in update_data and update_data['created_at'] is not None and update_data['created_at'].tzinfo is not None:
        update_data['created_at'] = update_data['created_at'].replace(tzinfo=None)
    if 'replied_at' in update_data and update_data['replied_at'] is not None and update_data['replied_at'].tzinfo is not None:
        update_data['replied_at'] = update_data['replied_at'].replace(tzinfo=None)
        
    for key, value in update_data.items():
        setattr(db_inquiry, key, value)
        
    db.commit()
    db.refresh(db_inquiry)
    return db_inquiry

@router.get("/inquiries")
def read_inquiries(
    skip: int = 0, 
    limit: int = 100, 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search_term: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Inquiry).join(Client)
    
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Inquiry.created_at >= sd)
        except ValueError:
            pass
    
    if end_date:
        try:
            # Set to end of day
            ed = datetime.strptime(end_date + " 23:59:59", "%Y-%m-%d %H:%M:%S")
            query = query.filter(Inquiry.created_at <= ed)
        except ValueError:
            pass
            
    if search_term:
        query = query.filter(
            (Client.company_name.contains(search_term)) |
            (Client.customer_name.contains(search_term)) |
            (Inquiry.item_name.contains(search_term)) |
            (Inquiry.receiver_name.contains(search_term))
        )
        
    inquiries = query.order_by(Inquiry.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for inq in inquiries:
        # Check if client has any completed orders
        has_completed_order = db.query(Order).join(Estimate).join(Inquiry).filter(
            Inquiry.client_id == inq.client_id,
            Order.payment_status == "결제완료"
        ).first() is not None
        
        client_type = "기존" if has_completed_order else "신규"
        
        # Get latest estimate
        latest_est = db.query(Estimate).filter(Estimate.inquiry_id == inq.id).order_by(Estimate.created_at.desc()).first()
        
        result.append({
            "id": inq.id,
            "client_id": inq.client_id,
            "client_name": inq.client.company_name if inq.client else None,
            "customer_name": inq.customer_name or (inq.client.customer_name if inq.client else None),
            "email": inq.email or (inq.client.email if inq.client else None),
            "phone": inq.phone or (inq.client.phone if inq.client else None),
            "client_type": client_type,
            "receiver_name": inq.receiver_name,
            "service_type": inq.service_type,
            "item_name": inq.item_name,
            "consultation_details": inq.consultation_details,
            "status": inq.status,
            "created_at": inq.created_at,
            "replied_at": inq.replied_at,
            "latest_estimate_id": latest_est.id if latest_est else None,
            "calculated_amount": latest_est.calculated_amount if latest_est else None
        })
    return result
