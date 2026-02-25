from sqlalchemy import Column, String, Boolean, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)           # Admin, CFO, Manager, Employee
    department = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    manager_id = Column(String, ForeignKey("users.id"), nullable=True)
    active = Column(Boolean, default=True)

    manager = relationship("User", remote_side="User.id", foreign_keys=[manager_id])
    tasks_assigned = relationship("Task", foreign_keys="Task.employee_id", back_populates="assignee")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    employee_id = Column(String, ForeignKey("users.id"), nullable=False)
    manager_id = Column(String, nullable=True)
    assigned_by = Column(String, nullable=True)
    department = Column(String, nullable=False)
    severity = Column(String, nullable=False)       # High, Medium, Low
    status = Column(String, nullable=False)         # NEW, IN_PROGRESS, SUBMITTED, APPROVED, REWORK, CANCELLED
    rework_count = Column(Integer, default=0)
    assigned_date = Column(String, nullable=True)
    due_date = Column(String, nullable=True)
    completed_date = Column(String, nullable=True)

    assignee = relationship("User", foreign_keys=[employee_id], back_populates="tasks_assigned")
