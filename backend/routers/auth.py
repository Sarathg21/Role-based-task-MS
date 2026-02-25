import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import create_access_token
import models
import schemas

router = APIRouter(prefix="/auth", tags=["auth"])

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    # Case-insensitive ID lookup
    user = db.query(models.User).filter(
        models.User.id.ilike(payload.id.strip())
    ).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
        )

    token = create_access_token({"sub": user.id, "role": user.role})

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserOut.from_orm(user),
    )
