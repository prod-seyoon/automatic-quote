import os
import sys
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, Order, Estimate, Inquiry, Client

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class OrderCreate(BaseModel):
    estimate_id: int
    payment_method: str # 카드, 세금계산서, 현금영수증

class OrderUpdate(BaseModel):
    payment_status: Optional[str] = None
    tax_invoice_number: Optional[str] = None
    tax_invoice_date: Optional[datetime] = None
    is_deposit_confirmed: Optional[bool] = None
    payment_link: Optional[str] = None

class OrderResponse(BaseModel):
    id: int
    estimate_id: int
    payment_method: str
    payment_link: Optional[str]
    payment_status: str
    tax_invoice_number: Optional[str]
    tax_invoice_date: Optional[datetime]
    is_deposit_confirmed: bool
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/orders", response_model=OrderResponse)
def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    # Verify estimate exists
    db_est = db.query(Estimate).filter(Estimate.id == order_data.estimate_id).first()
    if not db_est:
        raise HTTPException(status_code=404, detail="Estimate not found")
        
    # Generate dummy PayApp link if payment_method is 카드
    dummy_link = None
    if order_data.payment_method == "카드":
        # In a real scenario, this would call PayApp API with the calculated amount
        dummy_link = f"https://payapp.kr/sandbox_pay?order_id=TMP_{order_data.estimate_id}"
        
    db_order = Order(
        estimate_id=order_data.estimate_id,
        payment_method=order_data.payment_method,
        payment_link=dummy_link,
        payment_status="결제대기"
    )
    db.add(db_order)
    
    # Update Inquiry status
    db_inq = db.query(Inquiry).filter(Inquiry.id == db_est.inquiry_id).first()
    if db_inq:
        db_inq.status = '발주확정'
        
    try:
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders")
def list_orders(db: Session = Depends(get_db)):
    # Return orders with client name and amount
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    result = []
    for o in orders:
        est = o.estimate
        inq = est.inquiry if est else None
        client = inq.client if inq else None
        
        result.append({
            "id": o.id,
            "estimate_id": o.estimate_id,
            "payment_method": o.payment_method,
            "payment_status": o.payment_status,
            "payment_link": o.payment_link,
            "tax_invoice_number": o.tax_invoice_number,
            "tax_invoice_date": o.tax_invoice_date,
            "is_deposit_confirmed": o.is_deposit_confirmed,
            "created_at": o.created_at,
            "calculated_amount": est.calculated_amount if est else 0,
            "company_name": client.company_name if client else "알 수 없음",
            "customer_name": client.customer_name if client else "알 수 없음",
            "item_name": inq.item_name if inq else "알 수 없음"
        })
    return result

@router.put("/orders/{order_id}")
def update_order(order_id: int, update_data: OrderUpdate, db: Session = Depends(get_db)):
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if update_data.payment_status is not None:
        db_order.payment_status = update_data.payment_status
    if update_data.tax_invoice_number is not None:
        db_order.tax_invoice_number = update_data.tax_invoice_number
    if update_data.tax_invoice_date is not None:
        db_order.tax_invoice_date = update_data.tax_invoice_date
    if update_data.is_deposit_confirmed is not None:
        db_order.is_deposit_confirmed = update_data.is_deposit_confirmed
    if update_data.payment_link is not None:
        db_order.payment_link = update_data.payment_link
        
    try:
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
