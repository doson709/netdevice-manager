from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json

from database import get_db
from models import TopologyLayout
from pydantic import BaseModel
from auth import verify_admin_token

router = APIRouter(prefix="/api/topology", tags=["Topology"])

class TopologySaveSchema(BaseModel):
    node_positions: dict
    custom_elements: list

@router.get("")
def get_topology(db: Session = Depends(get_db)):
    """Lấy sơ đồ mạng và các vật dụng đã lưu trữ trên Server."""
    layout = db.query(TopologyLayout).filter(TopologyLayout.layout_key == "default").first()
    if not layout:
        return {
            "node_positions": {},
            "custom_elements": []
        }
    
    try:
        positions = json.loads(layout.node_positions)
    except Exception:
        positions = {}
        
    try:
        elements = json.loads(layout.custom_elements)
    except Exception:
        elements = []
        
    return {
        "node_positions": positions,
        "custom_elements": elements
    }

@router.post("")
def save_topology(
    payload: TopologySaveSchema, 
    db: Session = Depends(get_db),
    current_user: str = Depends(verify_admin_token)
):
    """Lưu trữ/Đồng bộ sơ đồ mạng và các vật dụng từ Client lên Server."""
    layout = db.query(TopologyLayout).filter(TopologyLayout.layout_key == "default").first()
    
    positions_json = json.dumps(payload.node_positions, ensure_ascii=False)
    elements_json = json.dumps(payload.custom_elements, ensure_ascii=False)
    
    if not layout:
        layout = TopologyLayout(
            layout_key="default",
            node_positions=positions_json,
            custom_elements=elements_json
        )
        db.add(layout)
    else:
        layout.node_positions = positions_json
        layout.custom_elements = elements_json
        
    try:
        db.commit()
        return {"status": "success", "message": "Đã lưu sơ đồ mạng thành công!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi lưu sơ đồ: {e}"
        )
