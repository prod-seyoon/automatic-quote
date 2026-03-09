from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, Client, Inquiry, Estimate, Order

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Schemas ---
class ClientCreate(BaseModel):
    company_name: str
    customer_name: str
    email: str
    phone: str
    is_new: bool = True
    business_registration_number: Optional[str] = None

class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    customer_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
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
    db_client = Client(**client.dict())
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

@router.post("/inquiries")
def create_inquiry(inquiry: InquiryCreate, db: Session = Depends(get_db)):
    db_inquiry = Inquiry(**inquiry.dict())
    db.add(db_inquiry)
    db.commit()
    db.refresh(db_inquiry)
    return db_inquiry

@router.put("/inquiries/{inquiry_id}")
def update_inquiry(inquiry_id: int, inquiry_update: InquiryUpdate, db: Session = Depends(get_db)):
    db_inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not db_inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    update_data = inquiry_update.dict(exclude_unset=True)
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
