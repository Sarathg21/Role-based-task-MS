import bcrypt
from typing import List, Optional
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


@router.get("/tree", response_model=schemas.OrgTreeOut)
def get_org_tree(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("ADMIN", "CFO"):
        raise HTTPException(status_code=403, detail="Not authorized")

    all_users = db.query(models.User).all()
    user_map = {
        u.id: schemas.TreeNode(user=schemas.UserOut.model_validate(u), children=[])
        for u in all_users
    }

    tree = schemas.OrgTreeOut(
        cfo=None, 
        orphan_managers=[], 
        orphan_employees=[],
        total_managers=len([u for u in all_users if u.role == "MANAGER"]),
        total_employees=len([u for u in all_users if u.role == "EMPLOYEE"])
    )

    for u in all_users:
        node = user_map[u.id]
        if u.role == "CFO":
            tree.cfo = node
        elif not u.manager_id:
            if u.role == "ADMIN":
                continue  # Admins don't usually sit in the reporting tree
            if u.role == "MANAGER":
                tree.orphan_managers.append(node)
            elif u.role == "EMPLOYEE":
                tree.orphan_employees.append(node)
        else:
            if u.manager_id in user_map:
                user_map[u.manager_id].children.append(node)
            else:
                if u.role == "MANAGER":
                    tree.orphan_managers.append(node)
                elif u.role == "EMPLOYEE":
                    tree.orphan_employees.append(node)

    return tree


@router.get("/assignable", response_model=List[schemas.UserOut])
def get_assignable_employees(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    search: Optional[str] = None,
):
    """
    Manager: returns dept employees (excl CFO/Admin)
    CFO/Admin: returns all org employees (excl CFO/Admin)
    """
    query = db.query(models.User).filter(models.User.active == True)

    if current_user.role == "MANAGER":
        query = query.filter(models.User.department == current_user.department)
    
    # Exclude CFO and ADMIN from being assignable tasks in this flow
    query = query.filter(models.User.role.notin_(["CFO", "ADMIN"]))

    if search:
        query = query.filter(models.User.name.ilike(f"%{search}%"))

    return query.order_by(models.User.name).all()


@router.post("", response_model=schemas.UserOut, status_code=201)
def create_user(
    payload: schemas.CreateUser,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("ADMIN", "CFO"):
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
    if current_user.role not in ("ADMIN", "CFO"):
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
    if current_user.role not in ("ADMIN", "CFO"):
        raise HTTPException(status_code=403, detail="Not authorized")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.password)
    db.commit()
    return {"detail": f"Password reset for {user_id}"}
