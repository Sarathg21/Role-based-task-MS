import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from auth import create_access_token, get_current_user
import models
import schemas

router = APIRouter(prefix="/auth", tags=["auth"])


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── Legacy login (kept for backward compat) ───────────────────────────────────
@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.id.ilike(payload.id.strip())
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")
    token = create_access_token({"sub": user.id})
    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserOut.model_validate(user),
    )


# ── JWT login (JSON body with emp_id + password) ──────────────────────────────
class LoginJsonRequest(BaseModel):
    emp_id: str
    password: str


@router.post("/login-json", response_model=schemas.TokenResponse)
def login_json(payload: LoginJsonRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.id.ilike(payload.emp_id.strip())
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.id})
    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserOut.model_validate(user),
    )


# ── Current user ──────────────────────────────────────────────────────────────
@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user
