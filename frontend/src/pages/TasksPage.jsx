import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function TasksPage({ role, currentUser }) {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedPriority, setSelectedPriority] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    // Sorting
    const [sortBy, setSortBy] = useState('task_title');
    const [sortOrder, setSortOrder] = useState('asc');

    const fetchTasksAndProjects = async () => {
        setLoading(true);
        try {
            const [tasksList, projectsList] = await Promise.all([
                apiService.getTasks(),
                apiService.getProjects()
            ]);
            
            // If employee portal, show only tasks assigned to current employee
            if (role === 'employee' && currentUser?.employee_id) {
                setTasks(tasksList.filter(t => t.employee_id === currentUser.employee_id));
            } else {
                setTasks(tasksList);
            }
            setProjects(projectsList);
        } catch (err) {
            console.error('Failed to load tasks/projects:', err);
            setError('Failed to load tasks workspace.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasksAndProjects();
    }, [role, currentUser]);

    const handleToggleTask = async (taskId) => {
        try {
            const result = await apiService.toggleTask(taskId);
            if (result.status === 'success') {
                // Update local task state immediately
                setTasks(prevTasks => prevTasks.map(t => {
                    if (t.task_id === taskId) {
                        const newStatus = (t.status === 'Completed' || t.status === 'Done') ? 'In Progress' : 'Completed';
                        return { ...t, status: newStatus, progress_percent: newStatus === 'Completed' ? 100 : 50 };
                    }
                    return t;
                }));
            }
        } catch (err) {
            console.error('Failed to toggle task:', err);
            alert('Failed to update task state. Service unavailable.');
        }
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    // Filter tasks on client
    let filteredTasks = tasks;

    if (search) {
        const s = search.toLowerCase();
        filteredTasks = filteredTasks.filter(t => 
            t.task_title.toLowerCase().includes(s) || 
            t.employee_name.toLowerCase().includes(s) ||
            t.task_id.toLowerCase().includes(s)
        );
    }

    if (selectedProject) {
        filteredTasks = filteredTasks.filter(t => t.project_id === selectedProject);
    }

    if (selectedPriority) {
        filteredTasks = filteredTasks.filter(t => t.priority === selectedPriority);
    }

    if (selectedStatus) {
        filteredTasks = filteredTasks.filter(t => {
            const isComp = t.status === 'Completed' || t.status === 'Done';
            return selectedStatus === 'Completed' ? isComp : !isComp;
        });
    }

    // Sort tasks
    filteredTasks.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const getPriorityClass = (priority) => {
        if (priority === 'Critical') return 'priority-critical';
        if (priority === 'High') return 'priority-high';
        if (priority === 'Medium') return 'priority-medium';
        return 'priority-low';
    };

    if (loading) {
        return <div style={{ color: 'var(--text-secondary)', padding: '24px', fontSize: '0.875rem' }}>Loading tasks database...</div>;
    }

    if (error) {
        return <div style={{ color: 'var(--danger)', padding: '24px', fontSize: '0.875rem' }}>{error}</div>;
    }

    return (
        <div className="tab-view animate-fade-in">
            <div className="panel-card" style={{ marginBottom: '24px' }}>
                <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-list-check" style={{ color: 'var(--accent)' }}></i>
                    {role === 'manager' ? 'Unified Tasks Console' : 'My Personal Checklist'}
                </h2>

                {/* Filter Toolbar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Search Tasks or Assignees</label>
                        <input 
                            type="text" 
                            className="input-control" 
                            placeholder="Search title, employee..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Project Stream</label>
                        <select 
                            className="select-filter" 
                            value={selectedProject} 
                            onChange={(e) => setSelectedProject(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p.project_id} value={p.project_id}>{p.project_name} ({p.category})</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Priority</label>
                        <select 
                            className="select-filter" 
                            value={selectedPriority} 
                            onChange={(e) => setSelectedPriority(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">All Priorities</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Status</label>
                        <select 
                            className="select-filter" 
                            value={selectedStatus} 
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">All Statuses</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                </div>

                {/* Tasks Table */}
                <div className="table-responsive">
                    <table className="custom-table" style={{ minWidth: role === 'manager' ? '1200px' : '1020px', tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                            <col style={{ width: '70px' }} />
                            <col style={{ width: '280px' }} />
                            {role === 'manager' && <col style={{ width: '180px' }} />}
                            <col style={{ width: '180px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '110px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '140px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th style={{ width: '70px', textAlign: 'center', verticalAlign: 'middle' }}>Status</th>
                                <th onClick={() => handleSort('task_title')} style={{ cursor: 'pointer', verticalAlign: 'middle' }}>
                                    Task Details {sortBy === 'task_title' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                {role === 'manager' && (
                                    <th onClick={() => handleSort('employee_name')} style={{ cursor: 'pointer', verticalAlign: 'middle' }}>
                                        Assigned To {sortBy === 'employee_name' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                    </th>
                                )}
                                <th onClick={() => handleSort('project_name')} style={{ cursor: 'pointer', verticalAlign: 'middle' }}>
                                    Project {sortBy === 'project_name' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer', verticalAlign: 'middle' }}>
                                    Priority {sortBy === 'priority' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                <th onClick={() => handleSort('estimated_hours')} style={{ cursor: 'pointer', verticalAlign: 'middle' }}>
                                    Est. Hours {sortBy === 'estimated_hours' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                <th onClick={() => handleSort('task_complexity')} style={{ cursor: 'pointer', verticalAlign: 'middle' }}>
                                    Complexity {sortBy === 'task_complexity' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                <th onClick={() => handleSort('deadline_days_remaining')} style={{ cursor: 'pointer', verticalAlign: 'middle' }}>
                                    Deadline {sortBy === 'deadline_days_remaining' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={role === 'manager' ? 8 : 7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0' }}>
                                        No tasks found matching current filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map(task => {
                                    const isCompleted = task.status === 'Completed' || task.status === 'Done';
                                    return (
                                        <tr key={task.task_id} style={{ opacity: isCompleted ? 0.7 : 1 }}>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isCompleted}
                                                    onChange={() => handleToggleTask(task.task_id)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ verticalAlign: 'middle', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4' }}>{task.task_title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{task.task_id}</div>
                                            </td>
                                            {role === 'manager' && (
                                                <td style={{ verticalAlign: 'middle', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                                    <div style={{ fontWeight: 500, lineHeight: '1.4' }}>{task.employee_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{task.employee_id}</div>
                                                </td>
                                            )}
                                            <td style={{ verticalAlign: 'middle', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                                <div style={{ fontWeight: 500, lineHeight: '1.4' }}>{task.project_name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{task.project_id}</div>
                                            </td>
                                            <td style={{ verticalAlign: 'middle' }}>
                                                <span className={`priority-pill ${getPriorityClass(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="font-mono" style={{ verticalAlign: 'middle' }}>{task.estimated_hours} hrs</td>
                                            <td style={{ verticalAlign: 'middle' }}>{task.task_complexity}</td>
                                            <td style={{ verticalAlign: 'middle', color: task.deadline_days_remaining <= 3 && !isCompleted ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                                {task.deadline_days_remaining <= 0 ? 'Overdue' : `${task.deadline_days_remaining} days remaining`}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
