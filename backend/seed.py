"""
Run once to populate PostgreSQL with all users and tasks from the mock data.
Usage:
    cd backend
    python seed.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import bcrypt
from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


# ── All users from mockData.js ────────────────────────────────────────────────
USERS = [
    {"id": "ADMIN001", "name": "Sarah Connor",    "role": "Admin",    "department": "Administration",               "password": "password123", "manager_id": None},
    {"id": "CFO001",   "name": "David Hughes",    "role": "CFO",      "department": "Finance",                      "password": "password123", "manager_id": None},
    {"id": "MGR001",   "name": "John Smith",      "role": "Manager",  "department": "Engineering",                  "password": "password123", "manager_id": "CFO001"},
    {"id": "MGR002",   "name": "Emily Blunt",     "role": "Manager",  "department": "Sales",                        "password": "password123", "manager_id": "CFO001"},
    {"id": "MGR003",   "name": "Alan Reed",       "role": "Manager",  "department": "Accounts Receivables",         "password": "password123", "manager_id": "CFO001"},
    {"id": "MGR004",   "name": "Sandra Cole",     "role": "Manager",  "department": "Accounts Payables",            "password": "password123", "manager_id": "CFO001"},
    {"id": "MGR005",   "name": "Victor Hunt",     "role": "Manager",  "department": "Fixed Assets",                 "password": "password123", "manager_id": "CFO001"},
    {"id": "MGR006",   "name": "Priya Nair",      "role": "Manager",  "department": "Treasury and Trade Finance",   "password": "password123", "manager_id": "CFO001"},
    {"id": "MGR007",   "name": "Leon Watts",      "role": "Manager",  "department": "MIS Report and Internal Audit","password": "password123", "manager_id": "CFO001"},
    {"id": "MGR008",   "name": "Nina Sharma",     "role": "Manager",  "department": "Cash Management Team",         "password": "password123", "manager_id": "CFO001"},
    {"id": "EMP001",   "name": "Neo Anderson",    "role": "Employee", "department": "Engineering",                  "password": "password123", "manager_id": "MGR001"},
    {"id": "EMP002",   "name": "Trinity Matrix",  "role": "Employee", "department": "Engineering",                  "password": "password123", "manager_id": "MGR001"},
    {"id": "EMP003",   "name": "Morpheus Zion",   "role": "Employee", "department": "Engineering",                  "password": "password123", "manager_id": "MGR001"},
    {"id": "EMP004",   "name": "Jordan Belfort",  "role": "Employee", "department": "Sales",                        "password": "password123", "manager_id": "MGR002"},
    {"id": "EMP005",   "name": "Dwight Schrute",  "role": "Employee", "department": "Sales",                        "password": "password123", "manager_id": "MGR002"},
    {"id": "EMP010",   "name": "David Park",      "role": "Employee", "department": "Accounts Receivables",         "password": "password123", "manager_id": "MGR003"},
    {"id": "EMP011",   "name": "Layla Hassan",    "role": "Employee", "department": "Accounts Receivables",         "password": "password123", "manager_id": "MGR003"},
    {"id": "EMP012",   "name": "Omar Farooq",     "role": "Employee", "department": "Accounts Payables",            "password": "password123", "manager_id": "MGR004"},
    {"id": "EMP013",   "name": "Chloe Martin",    "role": "Employee", "department": "Accounts Payables",            "password": "password123", "manager_id": "MGR004"},
    {"id": "EMP014",   "name": "Raj Iyer",        "role": "Employee", "department": "Fixed Assets",                 "password": "password123", "manager_id": "MGR005"},
    {"id": "EMP015",   "name": "Fatima Al Zaabi", "role": "Employee", "department": "Fixed Assets",                 "password": "password123", "manager_id": "MGR005"},
    {"id": "EMP016",   "name": "James Khoury",    "role": "Employee", "department": "Treasury and Trade Finance",   "password": "password123", "manager_id": "MGR006"},
    {"id": "EMP017",   "name": "Amira Said",      "role": "Employee", "department": "Treasury and Trade Finance",   "password": "password123", "manager_id": "MGR006"},
    {"id": "EMP018",   "name": "Tom Bradley",     "role": "Employee", "department": "MIS Report and Internal Audit","password": "password123", "manager_id": "MGR007"},
    {"id": "EMP019",   "name": "Sara Mehta",      "role": "Employee", "department": "MIS Report and Internal Audit","password": "password123", "manager_id": "MGR007"},
    {"id": "EMP020",   "name": "Kevin Long",      "role": "Employee", "department": "Cash Management Team",         "password": "password123", "manager_id": "MGR008"},
    {"id": "EMP021",   "name": "Hana Yamamoto",   "role": "Employee", "department": "Cash Management Team",         "password": "password123", "manager_id": "MGR008"},
]

# ── All tasks from mockData.js ────────────────────────────────────────────────
TASKS = [
    {"id": "TSK-101", "title": "Fix Login Bug",                    "description": "Login page crashes on IE11",                              "employee_id": "EMP001", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "High",   "status": "APPROVED",     "rework_count": 0, "assigned_date": "2023-10-01", "due_date": "2023-10-05", "completed_date": "2023-10-04"},
    {"id": "TSK-102", "title": "API Integration",                  "description": "Integrate User API",                                      "employee_id": "EMP001", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "Medium", "status": "IN_PROGRESS",  "rework_count": 1, "assigned_date": "2026-02-15", "due_date": "2026-02-19", "completed_date": None},
    {"id": "TSK-103", "title": "Database Schema",                  "description": "Design schema for orders",                                "employee_id": "EMP002", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "High",   "status": "APPROVED",     "rework_count": 2, "assigned_date": "2023-10-01", "due_date": "2023-10-10", "completed_date": "2023-10-12"},
    {"id": "TSK-104", "title": "Q3 Sales Report",                  "description": "Compile data for Q3",                                     "employee_id": "EMP004", "manager_id": "MGR002", "assigned_by": "MGR002", "department": "Sales",                        "severity": "High",   "status": "APPROVED",     "rework_count": 0, "assigned_date": "2023-10-05", "due_date": "2023-10-08", "completed_date": "2023-10-07"},
    {"id": "TSK-105", "title": "Client Pitch Deck",                "description": "Prepare slides for ABC Corp",                             "employee_id": "EMP005", "manager_id": "MGR002", "assigned_by": "MGR002", "department": "Sales",                        "severity": "Medium", "status": "NEW",          "rework_count": 0, "assigned_date": "2023-10-15", "due_date": "2023-10-20", "completed_date": None},
    {"id": "TSK-106", "title": "Unit Testing",                     "description": "Write jest tests for auth module",                        "employee_id": "EMP001", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "Low",    "status": "APPROVED",     "rework_count": 0, "assigned_date": "2023-10-02", "due_date": "2023-10-06", "completed_date": "2023-10-05"},
    {"id": "TSK-107", "title": "Code Review",                      "description": "Review PR #42",                                           "employee_id": "EMP003", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "Medium", "status": "APPROVED",     "rework_count": 0, "assigned_date": "2023-10-12", "due_date": "2023-10-13", "completed_date": "2023-10-13"},
    {"id": "TSK-108", "title": "Frontend API Hook",                "description": "Create custom hook for data fetching",                    "employee_id": "EMP001", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "High",   "status": "Completed",    "rework_count": 1, "assigned_date": "2023-11-01", "due_date": "2023-11-05", "completed_date": "2023-11-04"},
    {"id": "TSK-109", "title": "Dashboard Layout",                 "description": "Implement new layout for dashboard",                      "employee_id": "EMP001", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "Medium", "status": "Completed",    "rework_count": 0, "assigned_date": "2023-11-05", "due_date": "2023-11-10", "completed_date": "2023-11-12"},
    {"id": "TSK-110", "title": "User Profile Page",                "description": "Design and build user profile settings",                  "employee_id": "EMP002", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "Low",    "status": "IN_PROGRESS",  "rework_count": 0, "assigned_date": "2023-11-10", "due_date": "2023-11-20", "completed_date": None},
    {"id": "TSK-111", "title": "Q4 Sales Projection",              "description": "Estimate sales for next quarter",                         "employee_id": "EMP004", "manager_id": "MGR002", "assigned_by": "MGR002", "department": "Sales",                        "severity": "High",   "status": "Completed",    "rework_count": 0, "assigned_date": "2023-11-01", "due_date": "2023-11-15", "completed_date": "2023-11-14"},
    {"id": "TSK-112", "title": "Client Meeting Prep",              "description": "Gather materials for XYZ Corp",                           "employee_id": "EMP004", "manager_id": "MGR002", "assigned_by": "MGR002", "department": "Sales",                        "severity": "Medium", "status": "SUBMITTED",    "rework_count": 0, "assigned_date": "2023-11-10", "due_date": "2023-11-12", "completed_date": None},
    {"id": "TSK-113", "title": "Monthly Newsletter",               "description": "Draft content for newsletter",                            "employee_id": "EMP005", "manager_id": "MGR002", "assigned_by": "MGR002", "department": "Sales",                        "severity": "Low",    "status": "REWORK",       "rework_count": 2, "assigned_date": "2023-11-05", "due_date": "2023-11-08", "completed_date": None},
    {"id": "TSK-114", "title": "Database Migration",               "description": "Migrate users table to new DB",                           "employee_id": "EMP003", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "High",   "status": "Completed",    "rework_count": 0, "assigned_date": "2023-10-25", "due_date": "2023-10-30", "completed_date": "2023-10-29"},
    {"id": "TSK-115", "title": "Security Audit",                   "description": "Review access logs",                                      "employee_id": "EMP003", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "High",   "status": "Completed",    "rework_count": 1, "assigned_date": "2023-11-01", "due_date": "2023-11-05", "completed_date": "2023-11-06"},
    {"id": "TSK-116", "title": "Lead Follow-up",                   "description": "Call 20 new leads",                                       "employee_id": "EMP005", "manager_id": "MGR002", "assigned_by": "MGR002", "department": "Sales",                        "severity": "Medium", "status": "Completed",    "rework_count": 0, "assigned_date": "2023-11-12", "due_date": "2023-11-13", "completed_date": "2023-11-13"},
    {"id": "TSK-117", "title": "Q1 Strategy",                      "description": "Define Q1 goals for Engineering team",                    "employee_id": "MGR001", "manager_id": "CFO001", "assigned_by": "CFO001", "department": "Engineering",                  "severity": "High",   "status": "IN_PROGRESS",  "rework_count": 0, "assigned_date": "2026-02-15", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-118", "title": "Fix Auth Token Expiry",            "description": "Resolve JWT token expiring too early on mobile clients",  "employee_id": "EMP001", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "High",   "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-18", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-119", "title": "Refactor Notification Service",    "description": "Improve performance of the email notification queue",     "employee_id": "EMP001", "manager_id": "MGR001", "assigned_by": "MGR001", "department": "Engineering",                  "severity": "Medium", "status": "IN_PROGRESS",  "rework_count": 0, "assigned_date": "2026-02-19", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-120", "title": "Update Sales Forecast",            "description": "Revise Q1 forecast model based on Jan-Feb actuals",      "employee_id": "EMP004", "manager_id": "MGR002", "assigned_by": "MGR002", "department": "Sales",                        "severity": "High",   "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-19", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-121", "title": "Review Team Performance Report",   "description": "Analyze and annotate weekly performance metrics",        "employee_id": "MGR001", "manager_id": "CFO001", "assigned_by": "CFO001", "department": "Engineering",                  "severity": "Medium", "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-20", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-122", "title": "Approve Pending Task Submissions", "description": "Review and approve submitted tasks from the Sales team", "employee_id": "MGR002", "manager_id": "CFO001", "assigned_by": "CFO001", "department": "Sales",                        "severity": "Medium", "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-20", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-301", "title": "Q1 Budget Review",                 "description": "Review and approve Q1 consolidated budget",              "employee_id": "CFO001", "manager_id": None,     "assigned_by": "CFO001", "department": "Finance",                      "severity": "High",   "status": "IN_PROGRESS",  "rework_count": 0, "assigned_date": "2026-02-18", "due_date": "2026-02-22", "completed_date": None},
    {"id": "TSK-302", "title": "Board Presentation Prep",          "description": "Prepare financial highlights deck for board meeting",    "employee_id": "CFO001", "manager_id": None,     "assigned_by": "CFO001", "department": "Finance",                      "severity": "High",   "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-20", "due_date": "2026-02-25", "completed_date": None},
    {"id": "TSK-303", "title": "Cash Flow Forecast Sign-off",      "description": "Validate and sign off on 6-month cash flow projections", "employee_id": "CFO001", "manager_id": None,     "assigned_by": "CFO001", "department": "Finance",                      "severity": "Medium", "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-20", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-201", "title": "Invoice Reconciliation",           "description": "Reconcile Q4 invoices with ERP",                         "employee_id": "EMP010", "manager_id": "MGR003", "assigned_by": "MGR003", "department": "Accounts Receivables",         "severity": "High",   "status": "IN_PROGRESS",  "rework_count": 0, "assigned_date": "2026-02-18", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-202", "title": "Customer Ageing Report",           "description": "Prepare 30/60/90 day ageing analysis",                   "employee_id": "EMP011", "manager_id": "MGR003", "assigned_by": "MGR003", "department": "Accounts Receivables",         "severity": "Medium", "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-20", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-203", "title": "Vendor Payment Run",               "description": "Process vendor payments for Feb batch",                  "employee_id": "EMP012", "manager_id": "MGR004", "assigned_by": "MGR004", "department": "Accounts Payables",            "severity": "High",   "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-20", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-204", "title": "Purchase Order Matching",          "description": "Match POs with invoices in system",                      "employee_id": "EMP013", "manager_id": "MGR004", "assigned_by": "MGR004", "department": "Accounts Payables",            "severity": "Medium", "status": "IN_PROGRESS",  "rework_count": 0, "assigned_date": "2026-02-19", "due_date": "2026-02-22", "completed_date": None},
    {"id": "TSK-205", "title": "Asset Register Update",            "description": "Update fixed asset register with Q4 additions",          "employee_id": "EMP014", "manager_id": "MGR005", "assigned_by": "MGR005", "department": "Fixed Assets",                 "severity": "High",   "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-20", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-206", "title": "Depreciation Schedule",            "description": "Run monthly depreciation for all asset classes",          "employee_id": "EMP015", "manager_id": "MGR005", "assigned_by": "MGR005", "department": "Fixed Assets",                 "severity": "Medium", "status": "SUBMITTED",    "rework_count": 1, "assigned_date": "2026-02-15", "due_date": "2026-02-18", "completed_date": None},
    {"id": "TSK-207", "title": "LC Document Review",               "description": "Review Letter of Credit docs for XYZ trade",             "employee_id": "EMP016", "manager_id": "MGR006", "assigned_by": "MGR006", "department": "Treasury and Trade Finance",   "severity": "High",   "status": "IN_PROGRESS",  "rework_count": 0, "assigned_date": "2026-02-19", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-208", "title": "Treasury Position Report",         "description": "Compile daily treasury position for CFO",                "employee_id": "EMP017", "manager_id": "MGR006", "assigned_by": "MGR006", "department": "Treasury and Trade Finance",   "severity": "Medium", "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-20", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-209", "title": "Monthly MIS Pack",                 "description": "Prepare and distribute monthly MIS report pack",          "employee_id": "EMP018", "manager_id": "MGR007", "assigned_by": "MGR007", "department": "MIS Report and Internal Audit", "severity": "High",   "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-20", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-210", "title": "Internal Audit Checklist",         "description": "Complete Q1 internal audit compliance checklist",         "employee_id": "EMP019", "manager_id": "MGR007", "assigned_by": "MGR007", "department": "MIS Report and Internal Audit", "severity": "Medium", "status": "IN_PROGRESS",  "rework_count": 0, "assigned_date": "2026-02-18", "due_date": "2026-02-21", "completed_date": None},
    {"id": "TSK-211", "title": "Daily Cash Forecast",              "description": "Prepare intraday cash position forecast",                 "employee_id": "EMP020", "manager_id": "MGR008", "assigned_by": "MGR008", "department": "Cash Management Team",         "severity": "High",   "status": "NEW",          "rework_count": 0, "assigned_date": "2026-02-20", "due_date": "2026-02-20", "completed_date": None},
    {"id": "TSK-212", "title": "Bank Reconciliation",              "description": "Reconcile all bank accounts for Feb statement",           "employee_id": "EMP021", "manager_id": "MGR008", "assigned_by": "MGR008", "department": "Cash Management Team",         "severity": "Medium", "status": "IN_PROGRESS",  "rework_count": 0, "assigned_date": "2026-02-19", "due_date": "2026-02-22", "completed_date": None},
]


def seed():
    db = SessionLocal()
    try:
        # Clear existing data (order matters due to FK)
        db.query(models.Task).delete()
        db.query(models.User).delete()
        db.commit()

        # Insert users
        for u in USERS:
            db.add(models.User(
                id=u["id"],
                name=u["name"],
                role=u["role"],
                department=u["department"],
                password_hash=hash_password(u["password"]),
                manager_id=u["manager_id"],
                active=True,
            ))
        db.commit()
        print(f"  ✓ Inserted {len(USERS)} users")

        # Insert tasks
        for t in TASKS:
            db.add(models.Task(
                id=t["id"],
                title=t["title"],
                description=t.get("description"),
                employee_id=t["employee_id"],
                manager_id=t.get("manager_id"),
                assigned_by=t.get("assigned_by"),
                department=t["department"],
                severity=t["severity"],
                status=t["status"],
                rework_count=t.get("rework_count", 0),
                assigned_date=t.get("assigned_date"),
                due_date=t.get("due_date"),
                completed_date=t.get("completed_date"),
            ))
        db.commit()
        print(f"  ✓ Inserted {len(TASKS)} tasks")
        print("\nSeeding complete.")

    except Exception as e:
        db.rollback()
        print(f"\n✗ Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding database...")
    seed()
