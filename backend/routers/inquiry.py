from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, Client, Inquiry

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

class InquiryCreate(BaseModel):
    client_id: int
    receiver_name: str
    service_type: str
    item_name: str
    consultation_details: str
    status: str = "접수대기"

# --- API Endpoints ---
@router.post("/clients")
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    db_client = Client(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@router.get("/clients")
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Client).offset(skip).limit(limit).all()

@router.post("/inquiries")
def create_inquiry(inquiry: InquiryCreate, db: Session = Depends(get_db)):
    db_inquiry = Inquiry(**inquiry.dict())
    db.add(db_inquiry)
    db.commit()
    db.refresh(db_inquiry)
    return db_inquiry

@router.get("/inquiries")
def read_inquiries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    inquiries = db.query(Inquiry).order_by(Inquiry.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    from database import Estimate
    for inq in inquiries:
        # Get latest estimate
        latest_est = db.query(Estimate).filter(Estimate.inquiry_id == inq.id).order_by(Estimate.created_at.desc()).first()
        
        result.append({
            "id": inq.id,
            "client_id": inq.client_id,
            "client_name": inq.client.company_name if inq.client else None,
            "receiver_name": inq.receiver_name,
            "service_type": inq.service_type,
            "item_name": inq.item_name,
            "consultation_details": inq.consultation_details,
            "status": inq.status,
            "created_at": inq.created_at,
            "latest_estimate_id": latest_est.id if latest_est else None,
            "calculated_amount": latest_est.calculated_amount if latest_est else None
        })
    return result
