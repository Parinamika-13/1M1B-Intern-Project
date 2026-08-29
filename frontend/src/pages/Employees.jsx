import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function Employees({ onViewDetails }) {
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('');
    const [risk, setRisk] = useState('');
    const [sortBy, setSortBy] = useState('employee_name');
    const [sortOrder, setSortOrder] = useState('asc');
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            try {
                const data = await apiService.getEmployees({
                    search,
                    department,
                    risk,
                    sortBy,
                    sortOrder
                });
                setEmployees(data);
            } catch (err) {
                console.error(err);
                setError('Failed to fetch workforce database directory.');
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(() => {
            fetchEmployees();
        }, 200);

        return () => clearTimeout(timeout);
    }, [search, department, risk, sortBy, sortOrder]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const getRiskClass = (level) => {
        if (level === 'High') return 'badge-high';
        if (level === 'Medium') return 'badge-medium';
        return 'badge-low';
    };

    const getSortIcon = (field) => {
        if (sortBy !== field) return <i className="fa-solid fa-sort" style={{ marginLeft: '6px', fontSize: '0.75rem', opacity: 0.4 }}></i>;
        return sortOrder === 'asc' ? 
            <i className="fa-solid fa-sort-up" style={{ marginLeft: '6px', color: 'var(--accent)' }}></i> : 
            <i className="fa-solid fa-sort-down" style={{ marginLeft: '6px', color: 'var(--accent)' }}></i>;
    };

    return (
        <div className="tab-view animate-fade-in">
            {/* Filters Bar */}
            <div className="filter-bar">
                <div className="search-input-wrapper">
                    <input 
                        type="text" 
                        placeholder="Search by name, role, ID..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Search employees"
                    />
                </div>
                <select 
                    className="select-filter"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    aria-label="Filter by department"
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
                    aria-label="Filter by risk level"
                >
                    <option value="">All Risk Levels</option>
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                </select>
            </div>

            {error && <div style={{ color: 'var(--danger)', padding: '20px', fontSize: '0.85rem' }}>{error}</div>}

            {/* Employees Grid Table */}
            <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('employee_name')} style={{ cursor: 'pointer' }}>
                                    Employee {getSortIcon('employee_name')}
                                </th>
                                <th onClick={() => handleSort('department')} style={{ cursor: 'pointer' }}>
                                    Department {getSortIcon('department')}
                                </th>
                                <th>Role</th>
                                <th>Tasks</th>
                                <th>Progress</th>
                                <th onClick={() => handleSort('utilization_percent')} style={{ cursor: 'pointer' }}>
                                    Workload % {getSortIcon('utilization_percent')}
                                </th>
                                <th onClick={() => handleSort('workload_risk')} style={{ cursor: 'pointer' }}>
                                    Risk {getSortIcon('workload_risk')}
                                </th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0', fontSize: '0.85rem' }}>
                                        Querying workforce indexes...
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0', fontSize: '0.85rem' }}>
                                        No matching employees found.
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.employee_id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{emp.employee_name}</div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="font-mono">
                                                {emp.employee_id}
                                            </span>
                                        </td>
                                        <td><span style={{ fontSize: '0.85rem' }}>{emp.department}</span></td>
                                        <td><span style={{ fontSize: '0.85rem' }}>{emp.role}</span></td>
                                        <td className="font-mono">
                                            <span style={{ fontWeight: 600 }}>{emp.completed_tasks}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ {emp.total_tasks}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.8rem', minWidth: '32px', fontWeight: 600 }} className="font-mono">
                                                    {Math.round(emp.completion_rate_percent)}%
                                                </span>
                                                <div className="progress-track" style={{ width: '80px', height: '6px' }}>
                                                    <div 
                                                        className="progress-bar" 
                                                        style={{ backgroundColor: 'var(--accent)', width: `${emp.completion_rate_percent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-mono" style={{ fontWeight: 700 }}>
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
