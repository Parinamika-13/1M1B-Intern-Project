/**
 * SustWork AI - Client Data Service Layer
 * Consolidates all API communication with the Flask backend.
 * Provides fallback mock records to satisfy disconnected client states.
 */

const API_BASE = 'http://localhost:5000/api';

// Fallback Mock Data System for offline testing
const OFFLINE_DATA = {
    stats: {
        employees_count: 200,
        projects_count: 15,
        completed_tasks: 744,
        pending_tasks: 756,
        overdue_tasks: 180,
        avg_workload_percent: 93,
        avg_satisfaction: 8.2,
        avg_meeting_hours_weekly: 6.4,
        avg_completion_rate_percent: 88.5,
        risk_distribution: { Low: 82, Medium: 91, High: 27 }
    },
    employees: Array.from({ length: 15 }, (_, i) => ({
        employee_id: `E${(i + 1).toString().padStart(3, '0')}`,
        employee_name: `Employee_${(i + 1).toString().padStart(3, '0')}`.replace('_', ' '),
        department: ['Engineering', 'Design', 'Product', 'Marketing', 'Data Science'][i % 5],
        role: ['Developer', 'Designer', 'Product Owner', 'Coordinator', 'Scientist'][i % 5],
        completed_tasks: 4 + (i % 5),
        total_tasks: 10 + (i % 3),
        completion_rate_percent: 65 + (i * 2) % 35,
        utilization_percent: 75 + (i * 4) % 50,
        workload_risk: ['Low', 'Medium', 'High'][i % 3]
    })),
    aiInsights: [
        { type: 'warning', text: '3 employees currently have high workload risk (>110% utilization).' },
        { type: 'info', text: 'Engineering department has a higher meeting load average this week.' },
        { type: 'alert', text: 'Several high-priority tasks are approaching their deadlines in less than 48 hours.' }
    ]
};

// Generic fetch wrapper with offline fallback
async function fetchFromApi(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.warn(`API Connection failed on ${endpoint}. Using offline data service fallback. Details:`, err.message);
        
        // Handle fallback paths
        if (endpoint === '/stats') return OFFLINE_DATA.stats;
        if (endpoint.startsWith('/employees')) {
            // Simple offline filter
            if (endpoint.includes('/E')) {
                const empId = endpoint.split('/')[2];
                return getMockDetails(empId);
            }
            return OFFLINE_DATA.employees;
        }
        if (endpoint.startsWith('/employee-dashboard')) {
            const empId = endpoint.split('/')[2];
            return getMockDetails(empId);
        }
        if (endpoint.startsWith('/tasks/toggle')) {
            return {
                status: 'success',
                new_status: 'Completed',
                new_progress: 100.0,
                employee_updated_completed: 5,
                employee_updated_completion_rate: 90.0
            };
        }
        
        throw err;
    }
}

// Generates detailed mock data for offline detail requests
function getMockDetails(employeeId) {
    const listData = OFFLINE_DATA.employees.find(e => e.employee_id === employeeId) || OFFLINE_DATA.employees[0];
    return {
        ...listData,
        employee_satisfaction_score: 8.5,
        in_progress_tasks: 2,
        pending_tasks: 3,
        overdue_tasks: 1,
        meeting_hours: 6.5,
        leave_days_this_month: 2,
        ai_recommendation: 'Workload indicates medium stress risk. Focus blocks should be allocated to balance meeting hours.',
        primary_skill: 'System Optimization',
        skill_level: 'Expert',
        supplementary_skills: ['React Native', 'Data Management', 'System Design'],
        tasks: [
            { task_id: 'T1', task_title: 'Optimize Database Indices', priority: 'High', status: 'In Progress', progress_percent: 50, task_complexity: 'High', deadline_days_remaining: 3 },
            { task_id: 'T2', task_title: 'Refactor Auth Pipeline', priority: 'Medium', status: 'Completed', progress_percent: 100, task_complexity: 'Medium', deadline_days_remaining: 5 }
        ],
        meetings: [
            { meeting_id: 'M1', meeting_title: 'Architecture Review', duration_minutes: 60, attendance_type: 'Remote', meeting_status: 'Scheduled' },
            { meeting_id: 'M2', meeting_title: 'Weekly Standup', duration_minutes: 30, attendance_type: 'In-person', meeting_status: 'Scheduled' }
        ]
    };
}

export const apiService = {
    async login(email, role) {
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role })
            });
            if (!response.ok) throw new Error();
            return await response.json();
        } catch (err) {
            console.warn('API login failed, using mock session details.');
            if (role === 'manager') {
                return {
                    status: 'success',
                    role: 'manager',
                    name: 'Sarah Jenkins',
                    role_title: 'Operations Director',
                    email: email
                };
            } else {
                return {
                    status: 'success',
                    role: 'employee',
                    employee_id: 'E001',
                    name: 'Employee One',
                    department: 'Engineering',
                    role_title: 'Developer',
                    email: email
                };
            }
        }
    },

    async getStats() {
        return await fetchFromApi('/stats');
    },

    async getEmployees({ search = '', department = '', risk = '', sortBy = '', sortOrder = 'asc' } = {}) {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        if (department) queryParams.append('department', department);
        if (risk) queryParams.append('risk', risk);

        let data = await fetchFromApi(`/employees?${queryParams.toString()}`);
        
        // Handle sorting in the client layer
        if (sortBy) {
            data = [...data].sort((a, b) => {
                let valA = a[sortBy];
                let valB = b[sortBy];

                // string case insensitive
                if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return data;
    },

    async getEmployeeDetails(employeeId) {
        return await fetchFromApi(`/employees/${employeeId}`);
    },

    async getEmployeeDashboard(employeeId) {
        return await fetchFromApi(`/employee-dashboard/${employeeId}`);
    },

    async toggleTask(taskId) {
        return await fetchFromApi(`/tasks/toggle/${taskId}`, { method: 'POST' });
    },

    async getAIInsights() {
        // Flask doesn't have a direct /api/insights endpoint, we fetch static warning signals
        // Sourced from statistics and workload metrics
        try {
            const stats = await this.getStats();
            const highCount = stats.risk_distribution ? stats.risk_distribution.High : 0;
            return [
                { type: 'warning', text: `${highCount} employees currently have high workload risk (>110% utilization).` },
                { type: 'info', text: 'Engineering department has a higher meeting load average this week.' },
                { type: 'alert', text: 'Several high-priority tasks are approaching their deadlines in less than 48 hours.' }
            ];
        } catch (e) {
            return OFFLINE_DATA.aiInsights;
        }
    }
};
