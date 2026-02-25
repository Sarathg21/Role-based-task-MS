import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
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
):
    """Return tasks according to role:
    - Employee  → only their own tasks
    - Manager   → all tasks where managerId = their ID (team) + their own tasks
    - CFO/Admin → all tasks
    """
    query = db.query(models.Task)

    if current_user.role == "Employee":
        query = query.filter(models.Task.employee_id == current_user.id)
    elif current_user.role == "Manager":
        query = query.filter(
            (models.Task.manager_id == current_user.id) |
            (models.Task.employee_id == current_user.id)
        )
    # CFO / Admin → no filter, all tasks

    return query.order_by(models.Task.due_date).all()


@router.post("", response_model=schemas.TaskOut, status_code=201)
def create_task(
    payload: schemas.CreateTask,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("Manager", "Admin", "CFO"):
        raise HTTPException(status_code=403, detail="Not authorized to create tasks")

    task_id = payload.id or f"TSK-{str(uuid.uuid4())[:8].upper()}"

    existing = db.query(models.Task).filter(models.Task.id == task_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Task ID already exists")

    new_task = models.Task(
        id=task_id,
        title=payload.title,
        description=payload.description,
        employee_id=payload.employee_id,
        manager_id=payload.manager_id or current_user.id,
        assigned_by=payload.assigned_by or current_user.id,
        department=payload.department,
        severity=payload.severity,
        status="NEW",
        rework_count=0,
        assigned_date=payload.assigned_date,
        due_date=payload.due_date,
        completed_date=None,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


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

    new_status = payload.status

    # Increment rework count when sending back to employee
    if new_status == "REWORK":
        task.rework_count = (task.rework_count or 0) + 1

    # Set completed_date when status moves to Completed/APPROVED
    if new_status in ("Completed", "APPROVED"):
        from datetime import date
        task.completed_date = str(date.today())

    task.status = new_status
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
    if current_user.role not in ("Manager", "Admin", "CFO"):
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
