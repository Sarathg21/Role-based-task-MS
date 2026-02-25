from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
import models
from routers import auth, users, tasks

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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Task Management API is running"}
