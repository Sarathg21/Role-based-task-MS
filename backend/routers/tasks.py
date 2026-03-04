import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from fastapi.responses import FileResponse
import os
import shutil
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=List[schemas.TaskOut])
def get_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    scope: str = Query("mine"),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    department_id: Optional[str] = None,
    search: Optional[str] = None,
    due: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = db.query(models.Task)

    # 1. Scope filtering
    if scope == "mine":
        query = query.filter(models.Task.employee_id == current_user.id)
    elif scope == "department":
        # Usually manager's dept
        dept = current_user.department
        query = query.filter(models.Task.department == dept)
    elif scope == "org":
        if current_user.role not in ("CFO", "ADMIN"):
            raise HTTPException(status_code=403, detail="Only CFO/Admin can see org-wide tasks")
        if department_id:
            query = query.filter(models.Task.department == department_id)
    
    # 2. Status & Priority filters
    if status:
        query = query.filter(models.Task.status == status.upper())
    if priority:
        query = query.filter(models.Task.severity == priority.upper())
    
    # 3. Search filter
    if search:
        query = query.filter(
            (models.Task.title.ilike(f"%{search}%")) |
            (models.Task.description.ilike(f"%{search}%"))
        )
    
    # 4. Due date filters
    from datetime import date
    today_str = str(date.today())
    
    if due == "today":
        query = query.filter(models.Task.due_date == today_str)
    elif due == "overdue":
        query = query.filter(
            models.Task.due_date < today_str,
            models.Task.status.notin_(["COMPLETED", "APPROVED", "CANCELLED"])
        )
    elif due == "range" or (from_date and to_date):
        if from_date:
            query = query.filter(models.Task.due_date >= from_date)
        if to_date:
            query = query.filter(models.Task.due_date <= to_date)

    return query.order_by(models.Task.due_date.desc()).offset(offset).limit(limit).all()


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task_by_id(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("", response_model=schemas.TaskOut, status_code=201)
def create_task(
    payload: schemas.CreateTask,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("MANAGER", "ADMIN", "CFO"):
        raise HTTPException(status_code=403, detail="Not authorized to create tasks")

    task_id = payload.id or f"TSK-{str(uuid.uuid4())[:8].upper()}"

    existing = db.query(models.Task).filter(models.Task.id == task_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Task ID already exists")

    from datetime import date
    
    new_task = models.Task(
        id=task_id,
        title=payload.title,
        description=payload.description,
        employee_id=payload.assigned_to_emp_id,
        manager_id=current_user.id,
        assigned_by=current_user.id,
        department=payload.department or current_user.department,
        severity=payload.priority.upper(),
        status="NEW",
        rework_count=0,
        assigned_date=str(date.today()),
        due_date=payload.due_date,
        completed_date=None,
        parent_task_id=payload.parent_task_id
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


@router.post("/{task_id}/transition", response_model=schemas.TaskOut)
def transition_task(
    task_id: str,
    payload: schemas.TaskTransition,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    action = payload.action.upper()
    old_status = task.status
    new_status = old_status

    # RBAC check
    is_assignee = (task.employee_id == current_user.id)
    is_manager = (current_user.role in ("MANAGER", "CFO", "ADMIN"))

    if action == "START":
        if not is_assignee:
            raise HTTPException(status_code=403, detail="Only assignee can start task")
        if old_status not in ("NEW", "REWORK"):
            raise HTTPException(status_code=400, detail=f"Cannot START task from {old_status}")
        new_status = "IN_PROGRESS"

    elif action == "SUBMIT":
        if not is_assignee:
            raise HTTPException(status_code=403, detail="Only assignee can submit task")
        if old_status != "IN_PROGRESS":
            raise HTTPException(status_code=400, detail=f"Cannot SUBMIT task from {old_status}")
        new_status = "SUBMITTED"

    elif action == "APPROVE":
        if not is_manager:
            raise HTTPException(status_code=403, detail="Only managers/CFO can approve tasks")
        if old_status != "SUBMITTED":
            raise HTTPException(status_code=400, detail=f"Cannot APPROVE task from {old_status}")
        new_status = "APPROVED"

    elif action == "REWORK":
        if not is_manager:
            raise HTTPException(status_code=403, detail="Only managers/CFO can request rework")
        if old_status != "SUBMITTED":
            raise HTTPException(status_code=400, detail=f"Cannot request REWORK from {old_status}")
        new_status = "REWORK"
        task.rework_count = (task.rework_count or 0) + 1

    elif action == "CANCEL":
        if not is_manager:
            raise HTTPException(status_code=403, detail="Only managers/CFO can cancel tasks")
        new_status = "CANCELLED"

    elif action == "RESTART":
        if not is_assignee:
            raise HTTPException(status_code=403, detail="Only assignee can restart task")
        if old_status != "REWORK":
            raise HTTPException(status_code=400, detail=f"Cannot RESTART task from {old_status}")
        new_status = "IN_PROGRESS"
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    # Set completed_date
    if new_status == "APPROVED":
        from datetime import date
        task.completed_date = str(date.today())

    task.status = new_status
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}/subtasks", response_model=List[schemas.TaskOut])
def get_subtasks(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Task).filter(models.Task.parent_task_id == task_id).all()


@router.get("/{task_id}/history")
def get_task_history(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Future enhancement: Track status changes in a separate table
    # For now return empty list or mock data
    return []


@router.patch("/{task_id}/status", response_model=schemas.TaskOut)
def update_task_status(
    task_id: str,
    payload: schemas.StatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = payload.status
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/reassign", response_model=schemas.TaskOut)
def reassign_task(
    task_id: str,
    payload: schemas.ReassignTask,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("MANAGER", "ADMIN", "CFO"):
        raise HTTPException(status_code=403, detail="Not authorized to reassign tasks")

    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Verify assignee exists
    new_assignee = db.query(models.User).filter(models.User.id == payload.employee_id).first()
    if not new_assignee:
        raise HTTPException(status_code=404, detail="New assignee not found")

    task.employee_id = payload.employee_id
    task.assigned_by = current_user.id
    if payload.new_due_date:
        task.due_date = payload.new_due_date
    # If was SUBMITTED, reset to IN_PROGRESS
    if task.status == "SUBMITTED":
        task.status = "IN_PROGRESS"

    db.commit()
    db.refresh(task)
    return task


# ── Attachments ──────────────────────────────────────────────────────────────

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/{task_id}/attachments", response_model=schemas.AttachmentOut)
def upload_attachment(
    task_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    new_attachment = models.Attachment(
        id=file_id,
        task_id=task_id,
        filename=file.filename,
        file_path=file_path,
        file_type=file.content_type,
        uploaded_by=current_user.id
    )
    db.add(new_attachment)
    db.commit()
    db.refresh(new_attachment)
    return new_attachment

@router.get("/{task_id}/attachments", response_model=List[schemas.AttachmentOut])
def get_attachments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Attachment)\
             .filter(models.Attachment.task_id == task_id)\
             .order_by(models.Attachment.uploaded_at.desc())\
             .all()

@router.get("/{task_id}/attachments/{attachment_id}")
def download_attachment(
    task_id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    attachment = db.query(models.Attachment).filter(
        models.Attachment.id == attachment_id,
        models.Attachment.task_id == task_id
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.filename,
        media_type=attachment.file_type
    )
