from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Dict, Any

from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

def get_task_stats(query):
    total = query.count()
    completed = query.filter(models.Task.status.in_(["COMPLETED", "APPROVED"])).count()
    pending = query.filter(models.Task.status.in_(["NEW", "IN_PROGRESS", "REWORK"])).count()
    overdue = query.filter(models.Task.due_date < str(date.today()), models.Task.status.notin_(["COMPLETED", "APPROVED", "CANCELLED"])).count()
    
    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "overdue": overdue,
        "completion_rate": round((completed / total * 100), 1) if total > 0 else 0
    }

@router.get("/employee")
def get_employee_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Task).filter(models.Task.employee_id == current_user.id)
    stats = get_task_stats(query)
    # Add extra fields expected by EmployeeDashboard.jsx
    return {
        "total_tasks": stats["total"],
        "approved_tasks": stats["completed"],
        "pending_tasks": stats["pending"],
        "overdue_tasks": stats["overdue"],
        "performance_index": stats["completion_rate"]
    }

@router.get("/employee/today")
def get_employee_today(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today_str = str(date.today())
    tasks = db.query(models.Task).filter(
        models.Task.employee_id == current_user.id,
        models.Task.due_date == today_str,
        models.Task.status.notin_(["COMPLETED", "APPROVED", "CANCELLED"])
    ).all()
    return tasks

@router.get("/manager")
def get_manager_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["MANAGER", "ADMIN", "CFO"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(models.Task).filter(models.Task.department == current_user.department)
    stats = get_task_stats(query)
    rework_count = query.filter(models.Task.status == "REWORK").count()
    
    return {
        "team_performance_index": stats["completion_rate"],
        "total_tasks": stats["total"],
        "approved_tasks": stats["completed"],
        "pending_tasks": stats["pending"],
        "rework_tasks": rework_count
    }

@router.get("/manager/today")
def get_manager_today(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today_str = str(date.today())
    tasks = db.query(models.Task).filter(
        models.Task.department == current_user.department,
        models.Task.due_date == today_str,
        models.Task.status.notin_(["COMPLETED", "APPROVED", "CANCELLED"])
    ).all()
    return tasks

@router.get("/cfo")
def get_cfo_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["CFO", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(models.Task)
    stats = get_task_stats(query)
    
    # Department stats for the bars
    depts = db.query(models.User.department).distinct().all()
    dept_stats = []
    for (d_id,) in depts:
        d_query = db.query(models.Task).filter(models.Task.department == d_id)
        d_stats = get_task_stats(d_query)
        dept_stats.append({
            "department_id": d_id,
            "total_tasks": d_stats["total"],
            "approved_tasks": d_stats["completed"],
            "pending_tasks": d_stats["pending"]
        })

    return {
        "total_tasks": stats["total"],
        "approved_tasks": stats["completed"],
        "pending_tasks": stats["pending"],
        "org_performance_index": stats["completion_rate"],
        "department_stats": dept_stats
    }

@router.get("/cfo/today")
def get_cfo_today(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today_str = str(date.today())
    tasks = db.query(models.Task).filter(
        models.Task.due_date == today_str,
        models.Task.status.notin_(["COMPLETED", "APPROVED", "CANCELLED"])
    ).all()
    return tasks


@router.get("/reports/manager")
def get_manager_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # This matches the FRONTEND expectations for the Manager Ranking table
    # Used in ManagerDashboard.jsx Line 66
    if current_user.role not in ["MANAGER", "ADMIN", "CFO"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    users = db.query(models.User).filter(models.User.department == current_user.department).all()
    results = []
    for u in users:
        tasks_assigned = db.query(models.Task).filter(models.Task.employee_id == u.id).count()
        tasks_completed = db.query(models.Task).filter(
            models.Task.employee_id == u.id, 
            models.Task.status.in_(["COMPLETED", "APPROVED"])
        ).count()
        results.append({
            "emp_id": u.id,
            "name": u.name,
            "role": u.role,
            "tasks_assigned": tasks_assigned,
            "tasks_completed": tasks_completed
        })
    
    # Sort by completion rate DESC
    results.sort(key=lambda x: (x["tasks_completed"] / x["tasks_assigned"]) if x["tasks_assigned"] > 0 else 0, reverse=True)
    return results
