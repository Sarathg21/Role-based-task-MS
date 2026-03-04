from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re


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
    assigned_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    completed_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")

    class Config:
        from_attributes = True


class CreateTask(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    priority: str = Field(..., alias="priority") # mappings in router
    assigned_to_emp_id: str
    due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    parent_task_id: Optional[str] = None
    department: Optional[str] = None # Added back just in case

    class Config:
        populate_by_name = True


class StatusUpdate(BaseModel):
    status: str


class TaskTransition(BaseModel):
    action: str  # START|SUBMIT|APPROVE|REWORK|CANCEL|RESTART
    comment: Optional[str] = None


class ReassignTask(BaseModel):
    employee_id: str
    new_due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    reason: Optional[str] = None


# ── Attachment Schemas ────────────────────────────────────────────────────────

class AttachmentOut(BaseModel):
    id: str
    task_id: str
    filename: str
    file_type: Optional[str] = None
    uploaded_at: datetime
    uploaded_by: str

    class Config:
        from_attributes = True


# ── Notification Schemas ──────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    user_id: str
    title: str
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TreeNode(BaseModel):
    user: UserOut
    children: List["TreeNode"] = []


class OrgTreeOut(BaseModel):
    cfo: Optional[TreeNode] = None
    orphan_managers: List[TreeNode] = []
    orphan_employees: List[TreeNode] = []
    total_managers: int = 0
    total_employees: int = 0


TreeNode.model_rebuild()
