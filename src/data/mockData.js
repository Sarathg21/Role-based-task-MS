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
        id: 'MGR001',
        name: 'John Smith',
        role: 'Manager',
        department: 'Engineering',
        password: 'password123',
        managerId: 'ADMIN001',
        active: true
    },
    {
        id: 'MGR002',
        name: 'Emily Blunt',
        role: 'Manager',
        department: 'Sales',
        password: 'password123',
        managerId: 'ADMIN001',
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
    }
];

export const TASKS = [
    {
        id: 'TSK-101',
        title: 'Fix Login Bug',
        description: 'Login page crashes on IE11',
        employeeId: 'EMP001',
        managerId: 'MGR001',
        department: 'Engineering',
        severity: 'High',
        status: 'Completed',
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
        department: 'Engineering',
        severity: 'Medium',
        status: 'In Progress',
        reworkCount: 1,
        assignedDate: '2023-10-10',
        dueDate: '2023-10-15',
        completedDate: null
    },
    {
        id: 'TSK-103',
        title: 'Database Schema',
        description: 'Design schema for orders',
        employeeId: 'EMP002',
        managerId: 'MGR001',
        department: 'Engineering',
        severity: 'Critical',
        status: 'Completed',
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
        department: 'Sales',
        severity: 'High',
        status: 'Completed',
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
        department: 'Sales',
        severity: 'Medium',
        status: 'Pending',
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
        department: 'Engineering',
        severity: 'Low',
        status: 'Completed',
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
        department: 'Engineering',
        severity: 'Medium',
        status: 'Completed',
        reworkCount: 0,
        assignedDate: '2023-10-12',
        dueDate: '2023-10-13',
        completedDate: '2023-10-13'
    }
];

export const DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Administration'];
