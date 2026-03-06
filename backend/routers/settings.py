from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, Dict
from pydantic import BaseModel
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, Settings

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initial Default JSON Configuration
DEFAULT_QUOTING_CONFIG = {
    "SLA": {
        "equipment_fee": 0,
        "materials": [
            {"name": "abs like", "price_per_gram": 600, "min_cost": 20000},
            {"name": "clear", "price_per_gram": 800, "min_cost": 30000},
            {"name": "rubber like", "price_per_gram": 1000, "min_cost": 30000}
        ]
    },
    "SLS": {
        "equipment_fee": 50000,
        "materials": [
            {"name": "PA12", "price_per_gram": 1000, "min_cost": 50000},
            {"name": "PA12S", "price_per_gram": 1200, "min_cost": 50000},
            {"name": "TPU", "price_per_gram": 1500, "min_cost": 60000}
        ]
    },
    "FDM": {
        "equipment_fee": 0,
        "materials": [
            {"name": "PLA", "price_per_gram": 500, "min_cost": 20000},
            {"name": "ABS", "price_per_gram": 600, "min_cost": 20000},
            {"name": "TPU", "price_per_gram": 800, "min_cost": 30000},
            {"name": "PC", "price_per_gram": 1000, "min_cost": 40000}
        ]
    },
    "CNC": {
        "equipment_fee": 100000,
        "materials": [
            {"name": "ABS", "price_per_gram": 2000, "min_cost": 100000},
            {"name": "PP", "price_per_gram": 2200, "min_cost": 100000},
            {"name": "PC", "price_per_gram": 2500, "min_cost": 120000},
            {"name": "아크릴", "price_per_gram": 3000, "min_cost": 150000},
            {"name": "AL", "price_per_gram": 5000, "min_cost": 200000}
        ]
    }
}

@router.get("/settings/quoting")
def get_quoting_config(db: Session = Depends(get_db)):
    setting = db.query(Settings).filter(Settings.key == "quoting_config").first()
    if not setting:
        # Create default if not exists
        setting = Settings(key="quoting_config", value=DEFAULT_QUOTING_CONFIG, description="Quoting prices configuration")
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting.value

class QuotingConfigUpdate(BaseModel):
    config: Dict[str, Any]

@router.put("/settings/quoting")
def update_quoting_config(config_update: QuotingConfigUpdate, db: Session = Depends(get_db)):
    setting = db.query(Settings).filter(Settings.key == "quoting_config").first()
    if not setting:
        setting = Settings(key="quoting_config", value=config_update.config)
        db.add(setting)
    else:
        setting.value = config_update.config
    
    db.commit()
    return {"message": "Configuration updated successfully."}
