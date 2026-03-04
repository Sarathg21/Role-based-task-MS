from sqlalchemy import Column, String, Boolean, Integer, Date, ForeignKey, DateTime
from datetime import datetime
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)           # ADMIN, CFO, MANAGER, EMPLOYEE
    department = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    manager_id = Column(String, ForeignKey("users.id"), nullable=True)
    active = Column(Boolean, default=True)

    manager = relationship("User", remote_side="User.id", foreign_keys=[manager_id])
    tasks_assigned = relationship("Task", foreign_keys="Task.employee_id", back_populates="assignee")
    attachments = relationship("Attachment", back_populates="uploader")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    employee_id = Column(String, ForeignKey("users.id"), nullable=False)
    manager_id = Column(String, nullable=True)
    assigned_by = Column(String, nullable=True)
    department = Column(String, nullable=False)
    severity = Column(String, nullable=False)       # HIGH, MEDIUM, LOW
    status = Column(String, nullable=False)         # NEW, IN_PROGRESS, SUBMITTED, APPROVED, REWORK, CANCELLED
    rework_count = Column(Integer, default=0)
    assigned_date = Column(String, nullable=True)
    due_date = Column(String, nullable=True)
    completed_date = Column(String, nullable=True)
    parent_task_id = Column(String, ForeignKey("tasks.id"), nullable=True)

    assignee = relationship("User", foreign_keys=[employee_id], back_populates="tasks_assigned")
    attachments = relationship("Attachment", back_populates="task", cascade="all, delete-orphan")
    subtasks = relationship("Task", backref="parent", remote_side=[id])


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)

    task = relationship("Task", back_populates="attachments")
    uploader = relationship("User", back_populates="attachments")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
