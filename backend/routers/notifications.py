from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=List[schemas.NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Notification)\
             .filter(models.Notification.user_id == current_user.id)\
             .order_by(models.Notification.created_at.desc())\
             .all()

@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.read = True
    db.commit()
    return {"status": "success"}

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.read == False
    ).update({"read": True}, synchronize_session=False)
    db.commit()
    return {"status": "success"}
