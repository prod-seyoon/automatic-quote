from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./crm.db" # Using SQLite initially for rapid development as per plan, can migrate to PG later

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True)
    customer_name = Column(String)
    email = Column(String)
    phone = Column(String)
    is_new = Column(Boolean, default=True)
    business_registration_number = Column(String, nullable=True) # For tax invoices
    business_registration_file = Column(String, nullable=True) 
    created_at = Column(DateTime, default=datetime.utcnow)
    
    inquiries = relationship("Inquiry", back_populates="client")

class Partner(Base):
    __tablename__ = "partners"
    id = Column(Integer, primary_key=True, index=True)
    partner_name = Column(String, index=True)
    contact = Column(String)
    specialty = Column(String) # e.g., SLA, SLS, CNC
    account_info = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    outsourcings = relationship("Outsourcing", back_populates="partner")

class Inquiry(Base):
    __tablename__ = "inquiries"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    customer_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    receiver_name = Column(String) # 접수자
    service_type = Column(String) # 3D프린팅, 설계, CNC 등
    item_name = Column(String)
    consultation_details = Column(Text)
    status = Column(String, default="접수") # 접수, 견적완료, 발주확정, 제작중, 완료
    created_at = Column(DateTime, default=datetime.utcnow)
    replied_at = Column(DateTime, nullable=True)
    
    client = relationship("Client", back_populates="inquiries")
    estimates = relationship("Estimate", back_populates="inquiry")

class Estimate(Base):
    __tablename__ = "estimates"
    id = Column(Integer, primary_key=True, index=True)
    inquiry_id = Column(Integer, ForeignKey("inquiries.id"))
    version = Column(Integer, default=1)
    file_paths = Column(JSON) # List of 3D files
    production_method = Column(String) # SLA, SLS, FDM, CNC
    material = Column(String) # abs like, pla, PA12, TPU
    quantity = Column(Integer, default=1)
    is_hollow = Column(Boolean, default=False)
    shell_thickness = Column(Float, nullable=True)
    calculated_amount = Column(Integer)
    pdf_path = Column(String, nullable=True)
    bin_packing_data = Column(JSON, nullable=True) # Used for print3d.kr logic storage
    created_at = Column(DateTime, default=datetime.utcnow)
    
    inquiry = relationship("Inquiry", back_populates="estimates")
    order = relationship("Order", back_populates="estimate", uselist=False)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"), unique=True)
    payment_method = Column(String) # 카드, 세금계산서, 현금영수증
    payment_link = Column(String, nullable=True) # PayApp link
    payment_status = Column(String, default="결제대기") # 결제대기, 결제완료
    tax_invoice_number = Column(String, nullable=True) # 수동발행 번호 기록
    tax_invoice_date = Column(DateTime, nullable=True)
    is_deposit_confirmed = Column(Boolean, default=False) # 수동 입금 확인
    created_at = Column(DateTime, default=datetime.utcnow)
    
    estimate = relationship("Estimate", back_populates="order")
    outsourcings = relationship("Outsourcing", back_populates="order")

class Outsourcing(Base):
    __tablename__ = "outsourcings"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    partner_id = Column(Integer, ForeignKey("partners.id"))
    outsourcing_cost = Column(Integer)
    is_paid_to_partner = Column(Boolean, default=False)
    inspection_date = Column(DateTime, nullable=True)
    shipping_date = Column(DateTime, nullable=True)
    tracking_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    order = relationship("Order", back_populates="outsourcings")
    partner = relationship("Partner", back_populates="outsourcings")

class Settings(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(JSON)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
