from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from datetime import date
import io
import csv

from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/performance.csv")
def export_performance_csv(
    from_date: str = Query(...),
    to_date: str = Query(...),
    department_id: str = Query(None),
    employee_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ("CFO", "MANAGER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")

    query = db.query(models.Task).filter(models.Task.due_date.between(from_date, to_date))
    
    if department_id:
        query = query.filter(models.Task.department == department_id)
    if employee_id:
        query = query.filter(models.Task.employee_id == employee_id)
    
    tasks = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Task ID", "Title", "Employee", "Department", "Status", "Priority", "Completed Date"])
    
    for task in tasks:
        writer.writerow([task.id, task.title, task.employee_id, task.department, task.status, task.severity, task.completed_date or "N/A"])
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=performance_{from_date}_to_{to_date}.csv"}
    )

@router.get("/performance.xlsx")
def export_performance_xlsx(
    from_date: str = Query(...),
    to_date: str = Query(...),
    department_id: str = Query(None),
    employee_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Mocking XLSX with CSV for now unless library is verified
    return export_performance_csv(from_date, to_date, department_id, employee_id, db, current_user)

@router.get("/performance.pdf")
def export_performance_pdf(
    from_date: str = Query(...),
    to_date: str = Query(...),
    department_id: str = Query(None),
    employee_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Mocking PDF with CSV for now
    return export_performance_csv(from_date, to_date, department_id, employee_id, db, current_user)
