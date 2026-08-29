import React, { useState, useEffect } from 'react';

export default function EmployeeList({ onViewDetails }) {
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('');
    const [risk, setRisk] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            try {
                const queryParams = new URLSearchParams();
                if (search) queryParams.append('search', search);
                if (department) queryParams.append('department', department);
                if (risk) queryParams.append('risk', risk);

                const response = await fetch(`http://localhost:5000/api/employees?${queryParams.toString()}`);
                if (!response.ok) throw new Error('Failed to load employees list');
                const data = await response.json();
                setEmployees(data);
            } catch (err) {
                console.error(err);
                setError('Error querying workforce registry.');
            } finally {
                setLoading(false);
            }
        };

        // Debounce search input
        const timeout = setTimeout(() => {
            fetchEmployees();
        }, 300);

        return () => clearTimeout(timeout);
    }, [search, department, risk]);

    const getRiskClass = (level) => {
        if (level === 'High') return 'badge-high';
        if (level === 'Medium') return 'badge-medium';
        return 'badge-low';
    };

    return (
        <div className="tab-view">
            {/* Filters Bar */}
            <div className="filter-bar">
                <div className="search-input-wrapper">
                    <input 
                        type="text" 
                        placeholder="Search by name, role, department..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select 
                    className="select-filter"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                >
                    <option value="">All Departments</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Data Science">Data Science</option>
                </select>
                <select 
                    className="select-filter"
                    value={risk}
                    onChange={(e) => setRisk(e.target.value)}
                >
                    <option value="">All Risk Levels</option>
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                </select>
            </div>

            {error && <div style={{ color: 'var(--color-high)', padding: '20px' }}>{error}</div>}

            {/* Employees Table Card */}
            <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Tasks</th>
                                <th>Progress</th>
                                <th>Workload %</th>
                                <th>Risk</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0' }}>
                                        Loading registry index...
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0' }}>
                                        No matching employees found.
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.employee_id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{emp.employee_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {emp.employee_id} • {emp.role}
                                            </div>
                                        </td>
                                        <td><span style={{ fontSize: '0.85rem' }}>{emp.department}</span></td>
                                        <td>
                                            <span style={{ fontWeight: 600 }}>{emp.completed_tasks}</span>
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>/ {emp.total_tasks}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.8rem', minWidth: '32px', fontWeight: 600 }}>
                                                    {Math.round(emp.completion_rate_percent)}%
                                                </span>
                                                <div className="progress-track" style={{ width: '80px', height: '6px' }}>
                                                    <div 
                                                        className="progress-bar" 
                                                        style={{ backgroundColor: 'var(--accent-blue)', width: `${emp.completion_rate_percent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700 }}>
                                                {Math.round(emp.utilization_percent)}%
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getRiskClass(emp.workload_risk)}`}>
                                                {emp.workload_risk}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                className="btn-action" 
                                                onClick={() => onViewDetails(emp.employee_id)}
                                            >
                                                <i className="fa-solid fa-chart-simple"></i> Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
