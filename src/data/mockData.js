export const USERS = [
    {
        id: 'ADMIN001',
        name: 'Sarah Connor',
        role: 'Admin',
        department: 'Administration',
        password: 'password123',
        managerId: null,
        active: true
    },
    {
        id: 'CFO001',
        name: 'David Hughes',
        role: 'CFO',
        department: 'Finance',
        password: 'password123',
        managerId: null,
        active: true
    },
    {
        id: 'MGR001',
        name: 'John Smith',
        role: 'Manager',
        department: 'Engineering',
        password: 'password123',
        managerId: 'CFO001',
        active: true
    },
    {
        id: 'MGR002',
        name: 'Emily Blunt',
        role: 'Manager',
        department: 'Sales',
        password: 'password123',
        managerId: 'CFO001',
        active: true
    },
    {
        id: 'EMP001',
        name: 'Neo Anderson',
        role: 'Employee',
        department: 'Engineering',
        password: 'password123',
        managerId: 'MGR001',
        active: true
    },
    {
        id: 'EMP002',
        name: 'Trinity matrix',
        role: 'Employee',
        department: 'Engineering',
        password: 'password123',
        managerId: 'MGR001',
        active: true
    },
    {
        id: 'EMP003',
        name: 'Morpheus Zion',
        role: 'Employee',
        department: 'Engineering',
        password: 'password123',
        managerId: 'MGR001',
        active: true
    },
    {
        id: 'EMP004',
        name: 'Jordan Belfort',
        role: 'Employee',
        department: 'Sales',
        password: 'password123',
        managerId: 'MGR002',
        active: true
    },
    {
        id: 'EMP005',
        name: 'Dwight Schrute',
        role: 'Employee',
        department: 'Sales',
        password: 'password123',
        managerId: 'MGR002',
        active: true
    },

    // ── Accounts Department Managers ────────────────────────────
    { id: 'MGR003', name: 'Alan Reed', role: 'Manager', department: 'Accounts Receivables', password: 'password123', managerId: 'CFO001', active: true },
    { id: 'MGR004', name: 'Sandra Cole', role: 'Manager', department: 'Accounts Payables', password: 'password123', managerId: 'CFO001', active: true },
    { id: 'MGR005', name: 'Victor Hunt', role: 'Manager', department: 'Fixed Assets', password: 'password123', managerId: 'CFO001', active: true },
    { id: 'MGR006', name: 'Priya Nair', role: 'Manager', department: 'Treasury and Trade Finance', password: 'password123', managerId: 'CFO001', active: true },
    { id: 'MGR007', name: 'Leon Watts', role: 'Manager', department: 'MIS Report and Internal Audit', password: 'password123', managerId: 'CFO001', active: true },
    { id: 'MGR008', name: 'Nina Sharma', role: 'Manager', department: 'Cash Management Team', password: 'password123', managerId: 'CFO001', active: true },

    // ── Accounts Receivables Employees ──────────────────────────
    { id: 'EMP010', name: 'David Park', role: 'Employee', department: 'Accounts Receivables', password: 'password123', managerId: 'MGR003', active: true },
    { id: 'EMP011', name: 'Layla Hassan', role: 'Employee', department: 'Accounts Receivables', password: 'password123', managerId: 'MGR003', active: true },

    // ── Accounts Payables Employees ─────────────────────────────
    { id: 'EMP012', name: 'Omar Farooq', role: 'Employee', department: 'Accounts Payables', password: 'password123', managerId: 'MGR004', active: true },
    { id: 'EMP013', name: 'Chloe Martin', role: 'Employee', department: 'Accounts Payables', password: 'password123', managerId: 'MGR004', active: true },

    // ── Fixed Assets Employees ──────────────────────────────────
    { id: 'EMP014', name: 'Raj Iyer', role: 'Employee', department: 'Fixed Assets', password: 'password123', managerId: 'MGR005', active: true },
    { id: 'EMP015', name: 'Fatima Al Zaabi', role: 'Employee', department: 'Fixed Assets', password: 'password123', managerId: 'MGR005', active: true },

    // ── Treasury and Trade Finance Employees ─────────────────────
    { id: 'EMP016', name: 'James Khoury', role: 'Employee', department: 'Treasury and Trade Finance', password: 'password123', managerId: 'MGR006', active: true },
    { id: 'EMP017', name: 'Amira Said', role: 'Employee', department: 'Treasury and Trade Finance', password: 'password123', managerId: 'MGR006', active: true },

    // ── MIS Report and Internal Audit Employees ──────────────────
    { id: 'EMP018', name: 'Tom Bradley', role: 'Employee', department: 'MIS Report and Internal Audit', password: 'password123', managerId: 'MGR007', active: true },
    { id: 'EMP019', name: 'Sara Mehta', role: 'Employee', department: 'MIS Report and Internal Audit', password: 'password123', managerId: 'MGR007', active: true },

    // ── Cash Management Team Employees ──────────────────────────
    { id: 'EMP020', name: 'Kevin Long', role: 'Employee', department: 'Cash Management Team', password: 'password123', managerId: 'MGR008', active: true },
    { id: 'EMP021', name: 'Hana Yamamoto', role: 'Employee', department: 'Cash Management Team', password: 'password123', managerId: 'MGR008', active: true }
];

export const TASKS = [
    {
        id: 'TSK-101',
        title: 'Fix Login Bug',
        description: 'Login page crashes on IE11',
        employeeId: 'EMP001',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'High',
        status: 'APPROVED',
        reworkCount: 0,
        assignedDate: '2023-10-01',
        dueDate: '2023-10-05',
        completedDate: '2023-10-04'
    },
    {
        id: 'TSK-102',
        title: 'API Integration',
        description: 'Integrate User API',
        employeeId: 'EMP001',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'Medium',
        status: 'IN_PROGRESS',
        reworkCount: 1,
        assignedDate: '2026-02-15',
        dueDate: '2026-02-19',
        completedDate: null
    },
    {
        id: 'TSK-103',
        title: 'Database Schema',
        description: 'Design schema for orders',
        employeeId: 'EMP002',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'High',
        status: 'APPROVED',
        reworkCount: 2, // High rework, lowers quality score
        assignedDate: '2023-10-01',
        dueDate: '2023-10-10',
        completedDate: '2023-10-12' // Late, lowers timeliness
    },
    {
        id: 'TSK-104',
        title: 'Q3 Sales Report',
        description: 'Compile data for Q3',
        employeeId: 'EMP004',
        managerId: 'MGR002',
        assignedBy: 'MGR002',
        department: 'Sales',
        severity: 'High',
        status: 'APPROVED',
        reworkCount: 0,
        assignedDate: '2023-10-05',
        dueDate: '2023-10-08',
        completedDate: '2023-10-07'
    },
    {
        id: 'TSK-105',
        title: 'Client Pitch Deck',
        description: 'Prepare slides for ABC Corp',
        employeeId: 'EMP005',
        managerId: 'MGR002',
        assignedBy: 'MGR002',
        department: 'Sales',
        severity: 'Medium',
        status: 'NEW',
        reworkCount: 0,
        assignedDate: '2023-10-15',
        dueDate: '2023-10-20',
        completedDate: null
    },
    {
        id: 'TSK-106',
        title: 'Unit Testing',
        description: 'Write jest tests for auth module',
        employeeId: 'EMP001',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'Low',
        status: 'APPROVED',
        reworkCount: 0,
        assignedDate: '2023-10-02',
        dueDate: '2023-10-06',
        completedDate: '2023-10-05'
    },
    {
        id: 'TSK-107',
        title: 'Code Review',
        description: 'Review PR #42',
        employeeId: 'EMP003',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'Medium',
        status: 'APPROVED',
        reworkCount: 0,
        assignedDate: '2023-10-12',
        dueDate: '2023-10-13',
        completedDate: '2023-10-13'
    },
    // New Sample Tasks for Reports
    {
        id: 'TSK-108',
        title: 'Frontend API Hook',
        description: 'Create custom hook for data fetching',
        employeeId: 'EMP001',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'High',
        status: 'Completed',
        reworkCount: 1,
        assignedDate: '2023-11-01',
        dueDate: '2023-11-05',
        completedDate: '2023-11-04' // On time
    },
    {
        id: 'TSK-109',
        title: 'Dashboard Layout',
        description: 'Implement new layout for dashboard',
        employeeId: 'EMP001',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'Medium',
        status: 'Completed',
        reworkCount: 0,
        assignedDate: '2023-11-05',
        dueDate: '2023-11-10',
        completedDate: '2023-11-12' // Late
    },
    {
        id: 'TSK-110',
        title: 'User Profile Page',
        description: 'Design and build user profile settings',
        employeeId: 'EMP002',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'Low',
        status: 'IN_PROGRESS',
        reworkCount: 0,
        assignedDate: '2023-11-10',
        dueDate: '2023-11-20',
        completedDate: null
    },
    {
        id: 'TSK-111',
        title: 'Q4 Sales Projection',
        description: 'Estimate sales for next quarter',
        employeeId: 'EMP004',
        managerId: 'MGR002',
        assignedBy: 'MGR002',
        department: 'Sales',
        severity: 'High',
        status: 'Completed',
        reworkCount: 0,
        assignedDate: '2023-11-01',
        dueDate: '2023-11-15',
        completedDate: '2023-11-14' // On time
    },
    {
        id: 'TSK-112',
        title: 'Client Meeting Prep',
        description: 'Gather materials for XYZ Corp',
        employeeId: 'EMP004',
        managerId: 'MGR002',
        assignedBy: 'MGR002',
        department: 'Sales',
        severity: 'Medium',
        status: 'SUBMITTED',
        reworkCount: 0,
        assignedDate: '2023-11-10',
        dueDate: '2023-11-12',
        completedDate: null
    },
    {
        id: 'TSK-113',
        title: 'Monthly Newsletter',
        description: 'Draft content for newsletter',
        employeeId: 'EMP005',
        managerId: 'MGR002',
        assignedBy: 'MGR002',
        department: 'Sales',
        severity: 'Low',
        status: 'REWORK',
        reworkCount: 2,
        assignedDate: '2023-11-05',
        dueDate: '2023-11-08',
        completedDate: null
    },
    {
        id: 'TSK-114',
        title: 'Database Migration',
        description: 'Migrate users table to new DB',
        employeeId: 'EMP003',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'Critical',
        status: 'Completed',
        reworkCount: 0,
        assignedDate: '2023-10-25',
        dueDate: '2023-10-30',
        completedDate: '2023-10-29' // On time
    },
    {
        id: 'TSK-115',
        title: 'Security Audit',
        description: 'Review access logs',
        employeeId: 'EMP003',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'High',
        status: 'Completed',
        reworkCount: 1,
        assignedDate: '2023-11-01',
        dueDate: '2023-11-05',
        completedDate: '2023-11-06' // Late
    },
    {
        id: 'TSK-116',
        title: 'Lead Follow-up',
        description: 'Call 20 new leads',
        employeeId: 'EMP005',
        managerId: 'MGR002',
        assignedBy: 'MGR002',
        department: 'Sales',
        severity: 'Medium',
        status: 'Completed',
        reworkCount: 0,
        assignedDate: '2023-11-12',
        dueDate: '2023-11-13',
        completedDate: '2023-11-13' // On time
    },
    // Task assigned TO a Manager (for "My Tasks" view)
    {
        id: 'TSK-117',
        title: 'Q1 Strategy',
        description: 'Define Q1 goals for Engineering team',
        employeeId: 'MGR001', // Assigned to Manager
        managerId: 'CFO001', // Assigned by CFO
        assignedBy: 'CFO001',
        department: 'Engineering',
        severity: 'High',
        status: 'IN_PROGRESS', // Should see "Submit"
        reworkCount: 0,
        assignedDate: '2026-02-15',
        dueDate: '2026-02-20',
        completedDate: null
    },
    // Today's tasks (due 2026-02-20)
    {
        id: 'TSK-118',
        title: 'Fix Auth Token Expiry',
        description: 'Resolve JWT token expiring too early on mobile clients',
        employeeId: 'EMP001',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'High',
        status: 'NEW',
        reworkCount: 0,
        assignedDate: '2026-02-18',
        dueDate: '2026-02-20',
        completedDate: null
    },
    {
        id: 'TSK-119',
        title: 'Refactor Notification Service',
        description: 'Improve performance of the email notification queue',
        employeeId: 'EMP001',
        managerId: 'MGR001',
        assignedBy: 'MGR001',
        department: 'Engineering',
        severity: 'Medium',
        status: 'IN_PROGRESS',
        reworkCount: 0,
        assignedDate: '2026-02-19',
        dueDate: '2026-02-20',
        completedDate: null
    },
    {
        id: 'TSK-120',
        title: 'Update Sales Forecast',
        description: 'Revise Q1 forecast model based on Jan-Feb actuals',
        employeeId: 'EMP004',
        managerId: 'MGR002',
        assignedBy: 'MGR002',
        department: 'Sales',
        severity: 'High',
        status: 'NEW',
        reworkCount: 0,
        assignedDate: '2026-02-19',
        dueDate: '2026-02-20',
        completedDate: null
    },
    {
        id: 'TSK-121',
        title: 'Review Team Performance Report',
        description: 'Analyze and annotate weekly performance metrics for Engineering',
        employeeId: 'MGR001',
        managerId: 'CFO001',
        assignedBy: 'CFO001',
        department: 'Engineering',
        severity: 'Medium',
        status: 'NEW',
        reworkCount: 0,
        assignedDate: '2026-02-20',
        dueDate: '2026-02-20',
        completedDate: null
    },
    {
        id: 'TSK-122',
        title: 'Approve Pending Task Submissions',
        description: 'Review and approve submitted tasks from the Sales team',
        employeeId: 'MGR002',
        managerId: 'CFO001',
        assignedBy: 'CFO001',
        department: 'Sales',
        severity: 'Medium',
        status: 'NEW',
        reworkCount: 0,
        assignedDate: '2026-02-20',
        dueDate: '2026-02-20',
        completedDate: null
    },
    // ── CFO Personal Tasks ─────────────────────────────────────
    {
        id: 'TSK-301',
        title: 'Q1 Budget Review',
        description: 'Review and approve Q1 consolidated budget across all departments',
        employeeId: 'CFO001',
        managerId: null,
        assignedBy: 'CFO001',
        department: 'Finance',
        severity: 'High',
        status: 'IN_PROGRESS',
        reworkCount: 0,
        assignedDate: '2026-02-18',
        dueDate: '2026-02-22',
        completedDate: null
    },
    {
        id: 'TSK-302',
        title: 'Board Presentation Prep',
        description: 'Prepare financial highlights deck for quarterly board meeting',
        employeeId: 'CFO001',
        managerId: null,
        assignedBy: 'CFO001',
        department: 'Finance',
        severity: 'High',
        status: 'NEW',
        reworkCount: 0,
        assignedDate: '2026-02-20',
        dueDate: '2026-02-25',
        completedDate: null
    },
    {
        id: 'TSK-303',
        title: 'Cash Flow Forecast Sign-off',
        description: 'Validate and sign off on 6-month cash flow projections',
        employeeId: 'CFO001',
        managerId: null,
        assignedBy: 'CFO001',
        department: 'Finance',
        severity: 'Medium',
        status: 'NEW',
        reworkCount: 0,
        assignedDate: '2026-02-20',
        dueDate: '2026-02-20',
        completedDate: null
    },

    // ── Accounts Receivables Tasks ───────────────────────────────
    { id: 'TSK-201', title: 'Invoice Reconciliation', description: 'Reconcile Q4 invoices with ERP', employeeId: 'EMP010', managerId: 'MGR003', assignedBy: 'MGR003', department: 'Accounts Receivables', severity: 'High', status: 'IN_PROGRESS', reworkCount: 0, assignedDate: '2026-02-18', dueDate: '2026-02-20', completedDate: null },
    { id: 'TSK-202', title: 'Customer Ageing Report', description: 'Prepare 30/60/90 day ageing analysis', employeeId: 'EMP011', managerId: 'MGR003', assignedBy: 'MGR003', department: 'Accounts Receivables', severity: 'Medium', status: 'NEW', reworkCount: 0, assignedDate: '2026-02-20', dueDate: '2026-02-20', completedDate: null },

    // ── Accounts Payables Tasks ──────────────────────────────────
    { id: 'TSK-203', title: 'Vendor Payment Run', description: 'Process vendor payments for Feb batch', employeeId: 'EMP012', managerId: 'MGR004', assignedBy: 'MGR004', department: 'Accounts Payables', severity: 'High', status: 'NEW', reworkCount: 0, assignedDate: '2026-02-20', dueDate: '2026-02-20', completedDate: null },
    { id: 'TSK-204', title: 'Purchase Order Matching', description: 'Match POs with invoices in system', employeeId: 'EMP013', managerId: 'MGR004', assignedBy: 'MGR004', department: 'Accounts Payables', severity: 'Medium', status: 'IN_PROGRESS', reworkCount: 0, assignedDate: '2026-02-19', dueDate: '2026-02-22', completedDate: null },

    // ── Fixed Assets Tasks ───────────────────────────────────────
    { id: 'TSK-205', title: 'Asset Register Update', description: 'Update fixed asset register with Q4 additions', employeeId: 'EMP014', managerId: 'MGR005', assignedBy: 'MGR005', department: 'Fixed Assets', severity: 'High', status: 'NEW', reworkCount: 0, assignedDate: '2026-02-20', dueDate: '2026-02-20', completedDate: null },
    { id: 'TSK-206', title: 'Depreciation Schedule', description: 'Run monthly depreciation for all asset classes', employeeId: 'EMP015', managerId: 'MGR005', assignedBy: 'MGR005', department: 'Fixed Assets', severity: 'Medium', status: 'SUBMITTED', reworkCount: 1, assignedDate: '2026-02-15', dueDate: '2026-02-18', completedDate: null },

    // ── Treasury and Trade Finance Tasks ─────────────────────────
    { id: 'TSK-207', title: 'LC Document Review', description: 'Review Letter of Credit docs for XYZ trade', employeeId: 'EMP016', managerId: 'MGR006', assignedBy: 'MGR006', department: 'Treasury and Trade Finance', severity: 'High', status: 'IN_PROGRESS', reworkCount: 0, assignedDate: '2026-02-19', dueDate: '2026-02-20', completedDate: null },
    { id: 'TSK-208', title: 'Treasury Position Report', description: 'Compile daily treasury position for CFO', employeeId: 'EMP017', managerId: 'MGR006', assignedBy: 'MGR006', department: 'Treasury and Trade Finance', severity: 'Medium', status: 'NEW', reworkCount: 0, assignedDate: '2026-02-20', dueDate: '2026-02-20', completedDate: null },

    // ── MIS Report and Internal Audit Tasks ──────────────────────
    { id: 'TSK-209', title: 'Monthly MIS Pack', description: 'Prepare and distribute monthly MIS report pack', employeeId: 'EMP018', managerId: 'MGR007', assignedBy: 'MGR007', department: 'MIS Report and Internal Audit', severity: 'High', status: 'NEW', reworkCount: 0, assignedDate: '2026-02-20', dueDate: '2026-02-20', completedDate: null },
    { id: 'TSK-210', title: 'Internal Audit Checklist', description: 'Complete Q1 internal audit compliance checklist', employeeId: 'EMP019', managerId: 'MGR007', assignedBy: 'MGR007', department: 'MIS Report and Internal Audit', severity: 'Medium', status: 'IN_PROGRESS', reworkCount: 0, assignedDate: '2026-02-18', dueDate: '2026-02-21', completedDate: null },

    // ── Cash Management Team Tasks ───────────────────────────────
    { id: 'TSK-211', title: 'Daily Cash Forecast', description: 'Prepare intraday cash position forecast', employeeId: 'EMP020', managerId: 'MGR008', assignedBy: 'MGR008', department: 'Cash Management Team', severity: 'High', status: 'NEW', reworkCount: 0, assignedDate: '2026-02-20', dueDate: '2026-02-20', completedDate: null },
    { id: 'TSK-212', title: 'Bank Reconciliation', description: 'Reconcile all bank accounts for Feb statement', employeeId: 'EMP021', managerId: 'MGR008', assignedBy: 'MGR008', department: 'Cash Management Team', severity: 'Medium', status: 'IN_PROGRESS', reworkCount: 0, assignedDate: '2026-02-19', dueDate: '2026-02-22', completedDate: null }
];

export const DEPARTMENTS = [
    // Core departments
    'Engineering',
    'Sales',
    'HR',
    'Administration',
    // Accounts sub-departments
    'Accounts Receivables',
    'Accounts Payables',
    'Fixed Assets',
    'Treasury and Trade Finance',
    'MIS Report and Internal Audit',
    'Cash Management Team',
];
