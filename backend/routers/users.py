import bcrypt
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/users", tags=["users"])

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


@router.get("", response_model=List[schemas.UserOut])
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.User).order_by(models.User.role, models.User.name).all()


@router.post("", response_model=schemas.UserOut, status_code=201)
def create_user(
    payload: schemas.CreateUser,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("Admin", "CFO"):
        raise HTTPException(status_code=403, detail="Not authorized")

    existing = db.query(models.User).filter(models.User.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="User ID already exists")

    new_user = models.User(
        id=payload.id,
        name=payload.name,
        role=payload.role,
        department=payload.department,
        password_hash=hash_password(payload.password),
        manager_id=payload.manager_id,
        active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/{user_id}/status", response_model=schemas.UserOut)
def toggle_status(
    user_id: str,
    payload: schemas.StatusToggle,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("Admin", "CFO"):
        raise HTTPException(status_code=403, detail="Not authorized")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.active = payload.active
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/password")
def reset_password(
    user_id: str,
    payload: schemas.PasswordReset,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("Admin", "CFO"):
        raise HTTPException(status_code=403, detail="Not authorized")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.password)
    db.commit()
    return {"detail": f"Password reset for {user_id}"}
