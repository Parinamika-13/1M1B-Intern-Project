import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function ProgressPage({ role, currentUser }) {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hoveredSlice, setHoveredSlice] = useState(null);

    useEffect(() => {
        const fetchProgressData = async () => {
            setLoading(true);
            try {
                const [tasksList, projectsList, employeesList] = await Promise.all([
                    apiService.getTasks(),
                    apiService.getProjects(),
                    apiService.getEmployees()
                ]);
                setTasks(tasksList);
                setProjects(projectsList);
                setEmployees(employeesList);
            } catch (err) {
                console.error('Failed to load progress data:', err);
                setError('Failed to fetch progress metrics.');
            } finally {
                setLoading(false);
            }
        };
        fetchProgressData();
    }, [role, currentUser]);

    if (loading) {
        return <div style={{ color: 'var(--text-secondary)', padding: '24px', fontSize: '0.875rem' }}>Loading progress diagnostics...</div>;
    }

    if (error) {
        return <div style={{ color: 'var(--danger)', padding: '24px', fontSize: '0.875rem' }}>{error}</div>;
    }

    // ==================== MANAGER PORTAL CALCULATIONS ====================
    // 1. Project progress mapping
    const projectsProgress = projects.map(proj => {
        const pTasks = tasks.filter(t => t.project_id === proj.project_id);
        const total = pTasks.length;
        const completed = pTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
            ...proj,
            total,
            completed,
            rate
        };
    });

    // 2. Department progress mapping
    const deptsGroup = {};
    let totalTasks = 0;
    let totalCompletedTasks = 0;
    let totalPendingTasks = 0;
    let totalOverdueTasks = 0;

    tasks.forEach(task => {
        const emp = employees.find(e => e.employee_id === task.employee_id);
        const d = emp ? emp.department : 'General';
        if (!deptsGroup[d]) {
            deptsGroup[d] = { completed: 0, total: 0, pending: 0, overdue: 0 };
        }
        deptsGroup[d].total += 1;
        totalTasks += 1;

        const isComp = task.status === 'Completed' || task.status === 'Done';
        if (isComp) {
            deptsGroup[d].completed += 1;
            totalCompletedTasks += 1;
        } else {
            deptsGroup[d].pending += 1;
            totalPendingTasks += 1;
            const days = parseInt(task.deadline_days_remaining) || 0;
            if (days <= 0) {
                deptsGroup[d].overdue += 1;
                totalOverdueTasks += 1;
            }
        }
    });

    const deptsProgress = Object.keys(deptsGroup).map(dept => {
        const data = deptsGroup[dept];
        return {
            name: dept,
            total: data.total,
            completed: data.completed,
            pending: data.pending,
            overdue: data.overdue,
            rate: Math.round(data.total > 0 ? (data.completed / data.total * 100) : 0)
        };
    }).sort((a, b) => b.total - a.total);

    // Donut slice layout mapping
    let accumulatedPercent = 0;
    const slices = deptsProgress.map((dept, idx) => {
        const slicePercent = totalTasks > 0 ? dept.total / totalTasks : 0;
        const strokeDasharray = `${slicePercent * 314.159} 314.159`;
        const strokeDashoffset = `${-accumulatedPercent * 314.159}`;
        accumulatedPercent += slicePercent;

        // Beautiful palette themed from forest green to soft mint/gold
        const colors = [
            '#1b4332', // Deep Spruce
            '#2d6a4f', // Forest Green
            '#40916c', // Sage Green
            '#52b788', // Mint
            '#74c69d', // Pastel Mint
            '#95d5b2', // Pale Green
            '#b7e4c7'  // Soft Emerald Cream
        ];
        const color = colors[idx % colors.length];

        return {
            ...dept,
            strokeDasharray,
            strokeDashoffset,
            color
        };
    });

    // Hover state details
    const activeDetails = hoveredSlice !== null ? slices[hoveredSlice] : {
        name: 'Organization Overall',
        total: totalTasks,
        completed: totalCompletedTasks,
        pending: totalPendingTasks,
        overdue: totalOverdueTasks,
        rate: Math.round(totalTasks > 0 ? (totalCompletedTasks / totalTasks * 100) : 0)
    };

    // ==================== EMPLOYEE PORTAL CALCULATIONS ====================
    const myTasks = currentUser?.employee_id ? tasks.filter(t => t.employee_id === currentUser.employee_id) : [];
    const myTotal = myTasks.length;
    const myCompleted = myTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
    const myPending = myTasks.filter(t => t.status === 'In Progress').length;
    const myOverdue = myTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done' && (parseInt(t.deadline_days_remaining) || 0) <= 0).length;
    const myRate = myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0;

    return (
        <div className="tab-view animate-fade-in">
            {role === 'manager' ? (
                // ==================== MANAGER PORTAL PROGRESS VIEW ====================
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Page Header */}
                    <div className="panel-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h2 className="panel-title" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                            <i className="fa-solid fa-spinner" style={{ color: 'var(--accent)' }}></i>
                            Departmental Progress Diagnostic Console
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                            Monitor completion milestones, task volumes, and project delays across all departments. Hover over any chart segment below for immediate breakdown metrics.
                        </p>
                    </div>

                    {/* LARGE MODERN CHART AREA */}
                    <div className="panel-card" style={{ padding: '32px' }}>
                        <h3 className="panel-title" style={{ fontSize: '1.15rem', marginBottom: '24px', textAlign: 'center' }}>
                            Interactive Department Task Volume & Completion
                        </h3>
                        
                        <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            gap: '40px',
                            minHeight: '260px'
                        }}>
                            {/* SVG Donut Chart */}
                            <div style={{ position: 'relative', width: '240px', height: '240px' }}>
                                <svg width="240" height="240" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                                    <circle cx="100" cy="100" r="50" fill="transparent" stroke="var(--border)" strokeWidth="16" />
                                    {slices.map((slice, idx) => (
                                        <circle
                                            key={slice.name}
                                            cx="100"
                                            cy="100"
                                            r="50"
                                            fill="transparent"
                                            stroke={slice.color}
                                            strokeWidth={hoveredSlice === idx ? '22' : '16'}
                                            strokeDasharray={slice.strokeDasharray}
                                            strokeDashoffset={slice.strokeDashoffset}
                                            style={{
                                                transition: 'stroke-width 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s ease',
                                                cursor: 'pointer',
                                                filter: hoveredSlice === idx ? 'brightness(1.2)' : 'none'
                                            }}
                                            onMouseEnter={() => setHoveredSlice(idx)}
                                            onMouseLeave={() => setHoveredSlice(null)}
                                        />
                                    ))}
                                </svg>
                                {/* Center information text inside Donut */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    textAlign: 'center',
                                    pointerEvents: 'none',
                                    width: '100px'
                                }}>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        {hoveredSlice !== null ? 'Dept' : 'Total'}
                                    </div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
                                        {activeDetails.total}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        Tasks
                                    </div>
                                </div>
                            </div>

                            {/* HOVER TOOLTIP CARD PANEL */}
                            <div className="panel-card" style={{ 
                                minWidth: '280px', 
                                maxWidth: '360px', 
                                flex: 1, 
                                border: '1px solid var(--border)', 
                                padding: '20px', 
                                backgroundColor: 'var(--bg-primary)',
                                boxShadow: 'var(--shadow)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                    <span style={{ 
                                        width: '12px', 
                                        height: '12px', 
                                        borderRadius: '50%', 
                                        backgroundColor: hoveredSlice !== null ? slices[hoveredSlice].color : 'var(--accent)'
                                    }}></span>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                        {activeDetails.name}
                                    </h4>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Total Task Volume:</span>
                                        <span style={{ fontWeight: 600 }} className="font-mono">{activeDetails.total}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                                        <span style={{ color: 'var(--success)' }}>Completed Tasks:</span>
                                        <span style={{ fontWeight: 600, color: 'var(--success)' }} className="font-mono">{activeDetails.completed}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                                        <span style={{ color: 'var(--text-primary)' }}>Pending Queue:</span>
                                        <span style={{ fontWeight: 600 }} className="font-mono">{activeDetails.pending}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                                        <span style={{ color: 'var(--danger)' }}>Overdue Delays:</span>
                                        <span style={{ fontWeight: 600, color: 'var(--danger)' }} className="font-mono">{activeDetails.overdue}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Completion rate:</span>
                                        <span style={{ fontWeight: 700, color: 'var(--accent)' }} className="font-mono">{activeDetails.rate}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DEPARTMENTS SUMMARY / LEGEND CARDS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        {slices.map((slice, idx) => (
                            <div 
                                key={slice.name} 
                                className="panel-card" 
                                style={{ 
                                    padding: '16px', 
                                    border: hoveredSlice === idx ? '1px solid var(--accent)' : '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-primary)',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s ease'
                                }}
                                onMouseEnter={() => setHoveredSlice(idx)}
                                onMouseLeave={() => setHoveredSlice(null)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{slice.name}</span>
                                    <span style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        backgroundColor: slice.color 
                                    }}></span>
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '6px' }}>
                                    {slice.rate}%
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {slice.completed} / {slice.total} tasks completed
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* PROJECT PROGRESS SECTION */}
                    <div className="panel-card">
                        <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
                            <i className="fa-solid fa-chart-gantt" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>
                            Project Milestones & Stream Completion
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {projectsProgress.map(proj => (
                                <div key={proj.project_id} style={{
                                    border: '1px solid var(--border)',
                                    padding: '16px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--bg-primary)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                        <div>
                                            <strong style={{ color: 'var(--text-primary)' }}>{proj.project_name}</strong>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>({proj.category})</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span className="badge" style={{
                                                fontSize: '0.65rem',
                                                backgroundColor: proj.priority === 'High' ? 'rgba(217, 83, 79, 0.1)' : 'rgba(185, 130, 47, 0.1)',
                                                color: proj.priority === 'High' ? 'var(--danger)' : 'var(--warning)',
                                                border: `1px solid ${proj.priority === 'High' ? 'var(--danger)' : 'var(--warning)'}`
                                            }}>{proj.priority} Priority</span>
                                            <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{proj.rate}%</span>
                                        </div>
                                    </div>
                                    <div className="progress-track" style={{ height: '8px', marginBottom: '8px' }}>
                                        <div className="progress-bar" style={{ backgroundColor: 'var(--accent)', width: `${proj.rate}%` }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        <span>Tasks Completed: <strong>{proj.completed} / {proj.total}</strong></span>
                                        <span>Status: <strong style={{ color: 'var(--success)' }}>{proj.status}</strong></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DEPARTMENT DETAIL INDEX TABLE */}
                    <div className="panel-card">
                        <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
                            <i className="fa-solid fa-spinner" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>
                            Workforce Index Diagnostics
                        </h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="custom-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Department</th>
                                        <th>Total Tasks</th>
                                        <th>Completed</th>
                                        <th>Pending</th>
                                        <th>Overdue</th>
                                        <th>Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deptsProgress.map(dept => (
                                        <tr key={dept.name}>
                                            <td style={{ fontWeight: 600 }}>{dept.name}</td>
                                            <td className="font-mono">{dept.total}</td>
                                            <td className="font-mono" style={{ color: 'var(--success)' }}>{dept.completed}</td>
                                            <td className="font-mono">{dept.pending}</td>
                                            <td className="font-mono" style={{ color: dept.overdue > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{dept.overdue}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }} className="font-mono">{dept.rate}%</span>
                                                    <div className="progress-track" style={{ width: '100px', height: '6px' }}>
                                                        <div className="progress-bar" style={{ backgroundColor: 'var(--accent)', width: `${dept.rate}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            ) : (
                // ==================== EMPLOYEE PORTAL PROGRESS VIEW ====================
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="panel-card">
                        <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
                            <i className="fa-solid fa-spinner" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>
                            My Completion Statistics
                        </h2>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '16px',
                            marginBottom: '24px'
                        }}>
                            <div className="metric-card" style={{ textAlign: 'center' }}>
                                <div className="metric-title" style={{ justifyContent: 'center' }}>Task Completion Rate</div>
                                <div className="metric-value" style={{ color: 'var(--accent)', fontSize: '2rem', margin: '8px 0' }}>{myRate}%</div>
                                <div className="progress-track" style={{ height: '6px' }}>
                                    <div className="progress-bar" style={{ backgroundColor: 'var(--accent)', width: `${myRate}%` }}></div>
                                </div>
                            </div>

                            <div className="metric-card" style={{ textAlign: 'center' }}>
                                <div className="metric-title" style={{ justifyContent: 'center' }}>Pending Tasks</div>
                                <div className="metric-value" style={{ color: 'var(--text-primary)', fontSize: '2rem', margin: '8px 0' }}>{myPending}</div>
                                <span className="metric-desc">Tasks currently in-progress</span>
                            </div>

                            <div className="metric-card" style={{ textAlign: 'center' }}>
                                <div className="metric-title" style={{ justifyContent: 'center' }}>Overdue Tasks</div>
                                <div className="metric-value" style={{ color: 'var(--danger)', fontSize: '2rem', margin: '8px 0' }}>{myOverdue}</div>
                                <span className="metric-desc" style={{ color: myOverdue > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                    {myOverdue > 0 ? 'Immediate action required' : 'All deadlines clear'}
                                </span>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            My Task Status Breakdown ({myCompleted} / {myTotal} completed)
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {myTasks.length === 0 ? (
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '16px', textAlign: 'center' }}>
                                    No tasks assigned yet.
                                </div>
                            ) : (
                                myTasks.map(t => {
                                    const isComp = t.status === 'Completed' || t.status === 'Done';
                                    return (
                                        <div key={t.task_id} style={{
                                            border: '1px solid var(--border)',
                                            padding: '12px 16px',
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            opacity: isComp ? 0.7 : 1,
                                            backgroundColor: 'var(--bg-primary)'
                                        }}>
                                            <div>
                                                <strong style={{ fontSize: '0.85rem', color: isComp ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{t.task_title}</strong>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Complexity: {t.task_complexity} | Est: {t.estimated_hours}h</div>
                                            </div>
                                            <span className="badge" style={{
                                                fontSize: '0.65rem',
                                                backgroundColor: isComp ? 'rgba(79, 122, 92, 0.1)' : 'rgba(0, 123, 255, 0.1)',
                                                color: isComp ? 'var(--success)' : 'var(--info)',
                                                border: `1px solid ${isComp ? 'var(--success)' : 'var(--info)'}`
                                            }}>{t.status}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
