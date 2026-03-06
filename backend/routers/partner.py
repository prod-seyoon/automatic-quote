import os
import sys
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, Partner, Outsourcing, Order

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Schemas ---
class PartnerCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    specialty: Optional[str] = None
    account_info: Optional[str] = None

class OutsourcingCreate(BaseModel):
    order_id: int
    partner_id: int
    outsourcing_cost: int

class OutsourcingUpdate(BaseModel):
    is_paid_to_partner: Optional[bool] = None
    inspection_date: Optional[datetime] = None
    shipping_date: Optional[datetime] = None
    tracking_number: Optional[str] = None

# --- Endpoints ---
@router.post("/partners")
def create_partner(partner: PartnerCreate, db: Session = Depends(get_db)):
    db_partner = Partner(**partner.dict())
    db.add(db_partner)
    try:
        db.commit()
        db.refresh(db_partner)
        return db_partner
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/partners")
def get_partners(db: Session = Depends(get_db)):
    return db.query(Partner).all()

@router.post("/outsourcings")
def create_outsourcing(data: OutsourcingCreate, db: Session = Depends(get_db)):
    db_order = db.query(Order).filter(Order.id == data.order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    db_partner = db.query(Partner).filter(Partner.id == data.partner_id).first()
    if not db_partner:
        raise HTTPException(status_code=404, detail="Partner not found")
        
    db_out = Outsourcing(**data.dict())
    db.add(db_out)
    
    try:
        db.commit()
        db.refresh(db_out)
        return db_out
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/outsourcings")
def get_outsourcings(db: Session = Depends(get_db)):
    outsourcings = db.query(Outsourcing).order_by(Outsourcing.created_at.desc()).all()
    result = []
    for out in outsourcings:
        order = out.order
        partner = out.partner
        est = order.estimate if order else None
        inq = est.inquiry if est else None
        client = inq.client if inq else None
        
        result.append({
            "id": out.id,
            "order_id": out.order_id,
            "partner_id": out.partner_id,
            "partner_name": partner.name if partner else "Unknown",
            "outsourcing_cost": out.outsourcing_cost,
            "is_paid_to_partner": out.is_paid_to_partner,
            "inspection_date": out.inspection_date,
            "shipping_date": out.shipping_date,
            "tracking_number": out.tracking_number,
            "created_at": out.created_at,
            "item_name": inq.item_name if inq else "Unknown",
            "client_name": client.company_name if client else "Unknown"
        })
    return result

@router.put("/outsourcings/{out_id}")
def update_outsourcing(out_id: int, data: OutsourcingUpdate, db: Session = Depends(get_db)):
    db_out = db.query(Outsourcing).filter(Outsourcing.id == out_id).first()
    if not db_out:
        raise HTTPException(status_code=404, detail="Outsourcing record not found")
        
    if data.is_paid_to_partner is not None:
        db_out.is_paid_to_partner = data.is_paid_to_partner
    if data.inspection_date is not None:
        db_out.inspection_date = data.inspection_date
    if data.shipping_date is not None:
        db_out.shipping_date = data.shipping_date
    if data.tracking_number is not None:
        db_out.tracking_number = data.tracking_number
        
    try:
        db.commit()
        db.refresh(db_out)
        return db_out
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
