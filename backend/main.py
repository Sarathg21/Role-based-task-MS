from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from routers import auth, users, tasks, dashboard, notifications, reports
import models
from database import engine, get_db
from fastapi import Depends

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Role-Based Task Management API",
    description="FastAPI backend for the UAE Role-Based Task & Performance Evaluation app",
    version="1.0.0",
)

# ── CORS: allow Vite dev server ───────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(reports.router)


@app.get("/departments", response_model=List[str])
def get_departments(db: Session = Depends(get_db)):
    # Return unique departments
    depts = db.query(models.User.department).distinct().all()
    return [d[0] for d in depts]


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Task Management API is running"}
