from typing import Optional
from pydantic import BaseModel


# ── User Schemas ──────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    name: str
    role: str
    department: str
    manager_id: Optional[str] = None
    active: bool

    class Config:
        from_attributes = True


class CreateUser(BaseModel):
    id: str
    name: str
    role: str
    department: str
    password: str
    manager_id: Optional[str] = None


class StatusToggle(BaseModel):
    active: bool


class PasswordReset(BaseModel):
    password: str


# ── Auth Schemas ──────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Task Schemas ──────────────────────────────────────────────────────────────

class TaskOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    employee_id: str
    manager_id: Optional[str] = None
    assigned_by: Optional[str] = None
    department: str
    severity: str
    status: str
    rework_count: int = 0
    assigned_date: Optional[str] = None
    due_date: Optional[str] = None
    completed_date: Optional[str] = None

    class Config:
        from_attributes = True


class CreateTask(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    employee_id: str
    manager_id: Optional[str] = None
    assigned_by: Optional[str] = None
    department: str
    severity: str
    assigned_date: Optional[str] = None
    due_date: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


class ReassignTask(BaseModel):
    employee_id: str
    new_due_date: Optional[str] = None
    reason: Optional[str] = None
