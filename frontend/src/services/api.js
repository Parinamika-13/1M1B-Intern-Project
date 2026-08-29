/**
 * SustWork AI - Client Data Service Layer
 * Consolidates all API communication with the Flask backend.
 * Contains zero static datasets or local calculation mirrors.
 */

const API_BASE = 'http://localhost:5000/api';

async function fetchFromApi(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
    return await response.json();
}

export const apiService = {
    async login(email, role) {
        return await fetchFromApi('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role })
        });
    },

    async getDemoAccounts() {
        return await fetchFromApi('/demo-accounts');
    },

    async getStats() {
        return await fetchFromApi('/stats');
    },

    async getEmployees({ search = '', department = '', risk = '' } = {}) {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        if (department) queryParams.append('department', department);
        if (risk) queryParams.append('risk', risk);

        return await fetchFromApi(`/employees?${queryParams.toString()}`);
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

    async getTaskAssignmentRecommendations(taskDetails) {
        return await fetchFromApi('/ai/recommend-task-assignment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskDetails)
        });
    },

    async getWeeklySummary(department = '') {
        const query = department ? `?department=${encodeURIComponent(department)}` : '';
        return await fetchFromApi(`/ai/weekly-summary${query}`);
    },

    async getEarlyWarnings() {
        return await fetchFromApi('/ai/early-warnings');
    },

    async askEmployeeAssistant(employeeId, question) {
        return await fetchFromApi('/ai/employee-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id: employeeId, question })
        });
    },

    async getAiConfig() {
        return await fetchFromApi('/ai/config');
    }
};
