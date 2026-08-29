import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import StatCard from '../components/StatCard';

export default function Dashboard({ currentRole, currentUser }) {
    const [managerData, setManagerData] = useState(null);
    const [employeeData, setEmployeeData] = useState(null);
    const [aiInsights, setAiInsights] = useState([]);
    const [deptStats, setDeptStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                if (currentRole === 'manager') {
                    // Fetch manager summary stats
                    const stats = await apiService.getStats();
                    setManagerData(stats);

                    // Fetch all employees to calculate department statistics dynamically
                    const employees = await apiService.getEmployees();
                    const departments = {};
                    
                    employees.forEach(emp => {
                        const d = emp.department;
                        if (!departments[d]) {
                            departments[d] = { count: 0, sumWorkload: 0, completed: 0, total: 0 };
                        }
                        departments[d].count += 1;
                        departments[d].sumWorkload += emp.utilization_percent;
                        departments[d].completed += emp.completed_tasks;
                        departments[d].total += emp.total_tasks;
                    });

                    const computedDeptStats = Object.keys(departments).map(dept => {
                        const data = departments[dept];
                        return {
                            name: dept,
                            headcount: data.count,
                            avgWorkload: Math.round(data.sumWorkload / data.count),
                            completionRate: Math.round(data.total > 0 ? (data.completed / data.total * 100) : 0)
                        };
                    });
                    setDeptStats(computedDeptStats);

                    // Fetch AI insights
                    const insights = await apiService.getAIInsights();
                    setAiInsights(insights);
                } else if (currentUser) {
                    // Fetch individual employee dashboard data
                    const dashboard = await apiService.getEmployeeDashboard(currentUser.employee_id);
                    setEmployeeData(dashboard);
                }
            } catch (err) {
                console.error(err);
                setError('Unable to load dashboard workspace. Connection error.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [currentRole, currentUser]);

    const handleToggleTask = async (taskId) => {
        try {
            const result = await apiService.toggleTask(taskId);
            if (result.status === 'success') {
                setEmployeeData(prev => {
                    const updatedTasks = prev.tasks.map(t => {
                        if (t.task_id === taskId) {
                            const newStatus = t.status === 'Completed' || t.status === 'Done' ? 'In Progress' : 'Completed';
                            return { ...t, status: newStatus };
                        }
                        return t;
                    });
                    
                    const completed = updatedTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
                    const inProgress = updatedTasks.filter(t => t.status === 'In Progress').length;
                    
                    return {
                        ...prev,
                        tasks: updatedTasks,
                        completed_tasks: completed,
                        in_progress_tasks: inProgress,
                        completion_rate_percent: result.employee_updated_completion_rate
                    };
                });
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update task state. Service unavailable.');
        }
    };

    if (loading) {
        return <div style={{ color: 'var(--text-secondary)', padding: '24px', fontSize: '0.875rem' }}>Loading workspace dashboard...</div>;
    }

    if (error) {
        return <div style={{ color: 'var(--danger)', padding: '24px', fontSize: '0.875rem' }}>{error}</div>;
    }

    // ==================== RENDER MANAGER PORTAL ====================
    if (currentRole === 'manager' && managerData) {
        const {
            employees_count,
            projects_count,
            completed_tasks,
            pending_tasks,
            overdue_tasks,
            avg_workload_percent,
            avg_satisfaction,
            avg_meeting_hours_weekly,
            avg_completion_rate_percent,
            risk_distribution
        } = managerData;

        const lowCount = risk_distribution.Low || 0;
        const medCount = risk_distribution.Medium || 0;
        const highCount = risk_distribution.High || 0;

        const pLow = Math.round((lowCount / employees_count) * 100);
        const pMed = Math.round((medCount / employees_count) * 100);
        const pHigh = Math.round((highCount / employees_count) * 100);

        // Dynamic Fulcrum Tilt Angle: High (rust/danger) vs Low+Med (balanced/sage)
        const totalWeight = lowCount + medCount + highCount;
        const balancedWeight = lowCount + medCount;
        const weightDifference = highCount - balancedWeight;
        const rawTilt = (weightDifference / totalWeight) * 60;
        // Cap angle between -15deg (tilted heavily to balanced/left) and +15deg (tilted to risk/right)
        const tiltAngle = Math.max(-15, Math.min(15, rawTilt));

        return (
            <div className="animate-fade-in">
                {/* Metrics Cards Grid */}
                <div className="dashboard-grid">
                    <StatCard 
                        title="Total Employees" 
                        value={employees_count} 
                        icon="fa-users" 
                        desc="Active headcount" 
                    />
                    <StatCard 
                        title="Active Projects" 
                        value={projects_count} 
                        icon="fa-folder-open" 
                        desc="Ongoing tracking streams" 
                    />
                    <StatCard 
                        title="Tasks Completed" 
                        value={completed_tasks.toLocaleString()} 
                        icon="fa-circle-check" 
                        desc="Completed workflow tasks" 
                        style={{ borderLeft: '4px solid var(--success)' }}
                    />
                    <StatCard 
                        title="Tasks Requiring Attention" 
                        value={overdue_tasks.toLocaleString()} 
                        icon="fa-triangle-exclamation" 
                        desc="Passed target deadlines" 
                        style={{ borderLeft: '4px solid var(--danger)' }}
                    />
                </div>

                <div className="dashboard-row">
                    {/* Left Column: Balance Beam and Department Table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Workload Balance Beam (Signature visual element) */}
                        <div className="balance-beam-wrapper">
                            <h3 className="panel-title" style={{ alignSelf: 'flex-start' }}>
                                <i className="fa-solid fa-scale-balanced"></i> Workload Balance Beam
                            </h3>
                            
                            <div className="fulcrum-beam-system">
                                {/* Triangular fulcrum stand in center */}
                                <div className="beam-fulcrum"></div>
                                
                                {/* Rotating beam lever */}
                                <div className="beam-lever-container" style={{ transform: `rotate(${tiltAngle}deg)` }}>
                                    <div className="beam-line-bar"></div>
                                    <div className="beam-pivot-pin"></div>
                                    
                                    {/* Left Tray: Balanced (sage green accent) */}
                                    <div className="beam-tray-left" style={{ transform: `rotate(${-tiltAngle}deg)` }}>
                                        <div className="tray-suspension-wire"></div>
                                        <div className="weight-plate" style={{ borderTop: '4px solid var(--success)' }}>
                                            <div className="weight-plate-label">Balanced</div>
                                            <div className="weight-plate-value font-serif">{balancedWeight}</div>
                                            <div className="weight-plate-sub">Low + Medium</div>
                                        </div>
                                    </div>
                                    
                                    {/* Right Tray: Overloaded (rust red accent) */}
                                    <div className="beam-tray-right" style={{ transform: `rotate(${-tiltAngle}deg)` }}>
                                        <div className="tray-suspension-wire"></div>
                                        <div className="weight-plate" style={{ borderTop: '4px solid var(--danger)' }}>
                                            <div className="weight-plate-label">Overloaded</div>
                                            <div className="weight-plate-value font-serif">{highCount}</div>
                                            <div className="weight-plate-sub">High Risk</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Unified Legend with counts & percent */}
                            <div className="beam-legend-breakdown">
                                <div className="legend-stat-block">
                                    <div className="legend-stat-label">
                                        <span className="chart-indicator" style={{ backgroundColor: 'var(--success)' }}></span>
                                        Low Workload
                                    </div>
                                    <div className="legend-stat-value font-mono">{lowCount} ({pLow}%)</div>
                                </div>
                                <div className="legend-stat-block">
                                    <div className="legend-stat-label">
                                        <span className="chart-indicator" style={{ backgroundColor: 'var(--warning)' }}></span>
                                        Medium Workload
                                    </div>
                                    <div className="legend-stat-value font-mono">{medCount} ({pMed}%)</div>
                                </div>
                                <div className="legend-stat-block">
                                    <div className="legend-stat-label">
                                        <span className="chart-indicator" style={{ backgroundColor: 'var(--danger)' }}></span>
                                        High Workload
                                    </div>
                                    <div className="legend-stat-value font-mono">{highCount} ({pHigh}%)</div>
                                </div>
                            </div>
                        </div>

                        {/* Departmental Table overview */}
                        <div className="panel-card">
                            <h3 className="panel-title"><i className="fa-solid fa-building"></i> Departmental Overview</h3>
                            <div className="table-responsive">
                                <table className="custom-table" style={{ fontSize: '0.8125rem' }}>
                                    <thead>
                                        <tr>
                                            <th>Department</th>
                                            <th>Headcount</th>
                                            <th>Average Workload</th>
                                            <th>Milestone Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deptStats.map((dept, i) => (
                                            <tr key={i}>
                                                <td><strong>{dept.name}</strong></td>
                                                <td className="font-mono">{dept.headcount}</td>
                                                <td>
                                                    <span style={{ fontWeight: 600 }} className="font-mono">{dept.avgWorkload}%</span>
                                                    <div className="progress-track" style={{ width: '80px', height: '4px', marginTop: '4px' }}>
                                                        <div 
                                                            className="progress-bar" 
                                                            style={{ 
                                                                backgroundColor: dept.avgWorkload > 110 ? 'var(--danger)' : 
                                                                                   dept.avgWorkload >= 80 ? 'var(--warning)' : 'var(--success)', 
                                                                width: `${Math.min(dept.avgWorkload, 100)}%` 
                                                            }}
                                                        ></div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: 600 }} className="font-mono">{dept.completionRate}%</span>
                                                    <div className="progress-track" style={{ width: '80px', height: '4px', marginTop: '4px' }}>
                                                        <div className="progress-bar" style={{ backgroundColor: 'var(--accent)', width: `${dept.completionRate}%` }}></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Progress KPIs & AI Insights */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* KPIs list */}
                        <div className="panel-card">
                            <h3 className="panel-title"><i className="fa-solid fa-star"></i> Team Progress KPIs</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Average Workload</span>
                                    <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {avg_workload_percent}%
                                    </span>
                                </div>
                                <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Team Satisfaction</span>
                                    <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
                                        {avg_satisfaction.toFixed(1)}/10
                                    </span>
                                </div>
                                <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Avg Meeting Burden</span>
                                    <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>
                                        {avg_meeting_hours_weekly.toFixed(1)}h/wk
                                    </span>
                                </div>
                                <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Overall Completion</span>
                                    <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>
                                        {avg_completion_rate_percent.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI Insight Bullet Points */}
                        <div className="panel-card">
                            <h3 className="panel-title"><i className="fa-solid fa-wand-magic-sparkles"></i> AI Insights</h3>
                            {aiInsights.map((insight, i) => (
                                <div key={i} className="ai-insight-box">
                                    <div className="ai-insight-header">
                                        <i className={`fa-solid ${
                                            insight.type === 'warning' ? 'fa-triangle-exclamation' :
                                            insight.type === 'alert' ? 'fa-bell' : 'fa-info-circle'
                                        }`}></i>
                                        {insight.type}
                                    </div>
                                    <div className="ai-insight-text">
                                        {insight.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== RENDER EMPLOYEE PORTAL ====================
    if (currentRole === 'employee' && employeeData) {
        const {
            employee_name,
            utilization_percent,
            workload_risk,
            completed_tasks,
            total_tasks,
            in_progress_tasks,
            overdue_tasks,
            completion_rate_percent,
            tasks,
            meetings
        } = employeeData;

        const getWorkloadTheme = () => {
            if (workload_risk === 'Low') {
                return {
                    badgeClass: 'badge-low',
                    color: 'var(--success)',
                    desc: 'Workload indicates high available capacity. You have surplus margins to engage in training or plan new project steps.'
                };
            } else if (workload_risk === 'Medium') {
                return {
                    badgeClass: 'badge-medium',
                    color: 'var(--warning)',
                    desc: 'Workload is well-balanced. You have standard task counts, focus blocks, and meeting commitments within comfort metrics.'
                };
            } else {
                return {
                    badgeClass: 'badge-high',
                    color: 'var(--danger)',
                    desc: 'Risk alert: Workload utilization is excessive. Consider deferring pending tasks, negotiating meeting invites, or talking to your team lead.'
                };
            }
        };

        const workloadTheme = getWorkloadTheme();
        const activeTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done');

        const getPriorityClass = (priority) => {
            if (priority === 'High') return 'priority-high';
            if (priority === 'Medium') return 'priority-medium';
            return 'priority-low';
        };

        return (
            <div className="animate-fade-in">
                <div className="dashboard-row">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Tasks Checklist */}
                        <div className="panel-card">
                            <h3 className="panel-title"><i className="fa-solid fa-list-check"></i> Focus Tasks</h3>
                            <div className="checklist-container">
                                {tasks.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontSize: '0.85rem' }}>
                                        No tasks assigned.
                                    </div>
                                ) : (
                                    tasks.slice(0, 5).map(task => {
                                        const isCompleted = task.status === 'Completed' || task.status === 'Done';
                                        return (
                                            <div key={task.task_id} className={`checklist-item ${isCompleted ? 'checked' : ''}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isCompleted} 
                                                    onChange={() => handleToggleTask(task.task_id)}
                                                />
                                                <div className="checklist-item-body">
                                                    <div className="checklist-item-title">{task.task_title}</div>
                                                    <div className="checklist-meta">
                                                        <span className={`priority-pill ${getPriorityClass(task.priority)}`}>
                                                            {task.priority}
                                                        </span>
                                                        <span>Complexity: <strong>{task.task_complexity}</strong></span>
                                                        <span style={{ color: task.deadline_days_remaining <= 2 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                                            {task.deadline_days_remaining}d left
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Meetings Timeline */}
                        <div className="panel-card">
                            <h3 className="panel-title"><i className="fa-solid fa-video"></i> Today's Meetings</h3>
                            <div className="timeline">
                                {meetings.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', paddingLeft: '10px', fontSize: '0.85rem' }}>
                                        No meetings scheduled today. Enjoy your Focus Block!
                                    </div>
                                ) : (
                                    meetings.map((m, idx) => {
                                        const times = ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"];
                                        const timeStr = times[idx % times.length];
                                        return (
                                            <div key={m.meeting_id} className="timeline-item">
                                                <div className="timeline-time">{timeStr}</div>
                                                <div className="timeline-title">{m.meeting_title}</div>
                                                <div className="timeline-desc">
                                                    {m.duration_minutes}m • {m.attendance_type} ({m.meeting_status})
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Workload Status */}
                        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', minHeight: '230px' }}>
                            <h3 className="panel-title" style={{ alignSelf: 'flex-start' }}><i className="fa-solid fa-gauge-high"></i> Workload Index</h3>
                            <div className="workload-gauge-wrapper">
                                <div className="gauge-numeric font-serif" style={{ color: workloadTheme.color, fontSize: '3.5rem' }}>
                                    {Math.round(utilization_percent)}%
                                </div>
                                <span className={`badge ${workloadTheme.badgeClass}`}>
                                    {workload_risk} Workload
                                </span>
                            </div>
                            <div className="gauge-description" style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '10px', color: 'var(--text-secondary)' }}>
                                {workloadTheme.desc}
                            </div>
                        </div>

                        {/* Progress metrics */}
                        <div className="panel-card">
                            <h3 className="panel-title"><i className="fa-solid fa-spinner"></i> Weekly Milestones</h3>
                            <div className="progress-grid">
                                <div className="progress-card">
                                    <div className="progress-card-num font-mono" style={{ color: 'var(--success)' }}>{completed_tasks}</div>
                                    <div className="progress-card-label">Completed</div>
                                </div>
                                <div className="progress-card">
                                    <div className="progress-card-num font-mono" style={{ color: 'var(--info)' }}>{in_progress_tasks}</div>
                                    <div className="progress-card-label">Active</div>
                                </div>
                                <div className="progress-card">
                                    <div className="progress-card-num font-mono" style={{ color: 'var(--danger)' }}>{overdue_tasks}</div>
                                    <div className="progress-card-label">Overdue</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    <span>Sprint Completion Rate</span>
                                    <span style={{ fontWeight: 600 }} className="font-mono">{Math.round(completion_rate_percent)}%</span>
                                </div>
                                <div className="progress-track">
                                    <div 
                                        className="progress-bar" 
                                        style={{ backgroundColor: 'var(--accent)', width: `${completion_rate_percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* AI Box */}
                        <div className="ai-insight-box">
                            <div className="ai-insight-header">
                                <i className="fa-solid fa-wand-magic-sparkles"></i> AI Copilot recommendations
                            </div>
                            <div className="ai-insight-text">
                                Focus block scheduled between 1:00 PM and 3:00 PM. High-priority tasks (e.g. Optimize Database Indices) should be tackled during this window.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
