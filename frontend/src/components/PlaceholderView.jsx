import React, { useEffect, useState } from 'react';

export default function PlaceholderView({ tabName, role, currentUser }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (role === 'employee' && currentUser && (tabName === 'list-check' || tabName === 'calendar')) {
            const fetchEmployeeDetails = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`http://localhost:5000/api/employees/${currentUser.employee_id}`);
                    if (response.ok) {
                        const data = await response.json();
                        setDetail(data);
                    }
                } catch (err) {
                    console.error('Placeholder fetch error:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchEmployeeDetails();
        } else {
            setDetail(null);
        }
    }, [tabName, role, currentUser]);

    // Icon select helper
    const getPlaceholderDetails = () => {
        switch (tabName) {
            case 'list-check':
                return {
                    icon: 'fa-list-check',
                    title: 'Unified Tasks Console',
                    desc: 'Managers can oversee the entire project workload, create new tasks, and check status flows across engineering, product, and design. In Phase 2, this will be integrated with the AI Task Assignment engine.'
                };
            case 'calendar':
                return {
                    icon: 'fa-calendar-days',
                    title: 'Team Meetings Calendar Overview',
                    desc: 'Manage corporate schedules, track weekly meeting hours, and check indicators of meeting load per team. In Phase 3, it displays meeting efficiency scores and workload sustainability indicators.'
                };
            case 'chart-gantt':
                return {
                    icon: 'fa-chart-gantt',
                    title: 'Departmental Milestone Progress',
                    desc: 'Visualizes project timelines, task completion percentages, milestones, and target deadlines across all active streams. Phase 3 will introduce interactive visual charts.'
                };
            case 'brain':
                return {
                    icon: 'fa-brain',
                    title: 'Sustainable Work AI Insights',
                    desc: 'System recommendations, early overload warnings, and weekly team performance summaries. In Phase 2, this panel will run dynamic AI evaluations for workload risk and task assignment recommendations.'
                };
            default:
                return {
                    icon: 'fa-code',
                    title: 'Feature Coming Soon',
                    desc: 'This module is planned and will be fully wired during the next phase of implementation.'
                };
        }
    };

    const details = getPlaceholderDetails();

    // Custom view for Employee Tasks Backlog
    if (role === 'employee' && tabName === 'list-check' && detail) {
        return (
            <div className="tab-view">
                <div className="placeholder-page" style={{ minHeight: 'auto', marginBottom: '20px' }}>
                    <div className="placeholder-icon"><i className="fa-solid fa-list-check"></i></div>
                    <h2 className="text-outfit">My Work Backlog</h2>
                    <p className="placeholder-text">Manage and check progress status for all tasks assigned under your queue.</p>
                </div>
                
                <div className="panel-card" style={{ width: '100%', textAlign: 'left', marginTop: '30px' }}>
                    <h3 className="panel-title"><i className="fa-solid fa-list-check"></i> Backlog Registry ({detail.tasks.length} total)</h3>
                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Task Title</th>
                                    <th>Priority</th>
                                    <th>Complexity</th>
                                    <th>Est. Hours</th>
                                    <th>Days Remaining</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.tasks.map(t => {
                                    const isDone = t.status === 'Completed' || t.status === 'Done';
                                    return (
                                        <tr key={t.task_id}>
                                            <td><strong>{t.task_title}</strong></td>
                                            <td>
                                                <span className={`priority-pill ${
                                                    t.priority === 'High' ? 'priority-high' : 
                                                    t.priority === 'Medium' ? 'priority-medium' : 'priority-low'
                                                }`}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td><span style={{ fontWeight: 600 }}>{t.task_complexity}</span></td>
                                            <td>{t.estimated_hours || 8} hrs</td>
                                            <td style={{ color: t.deadline_days_remaining <= 2 ? 'var(--color-high)' : 'var(--text-main)' }}>
                                                {t.deadline_days_remaining} days
                                            </td>
                                            <td>
                                                <span className={`badge ${isDone ? 'badge-low' : 'badge-medium'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // Custom view for Employee Calendar Meetings Registry
    if (role === 'employee' && tabName === 'calendar' && detail) {
        return (
            <div className="tab-view">
                <div className="placeholder-page" style={{ minHeight: 'auto', marginBottom: '20px' }}>
                    <div className="placeholder-icon"><i className="fa-solid fa-calendar-days"></i></div>
                    <h2 className="text-outfit">My Meetings Calendar</h2>
                    <p className="placeholder-text">Sync schedules and review active meetings duration. Protect focus time to maintain workload balance.</p>
                </div>
                
                <div className="panel-card" style={{ width: '100%', textAlign: 'left', marginTop: '30px' }}>
                    <h3 className="panel-title"><i className="fa-solid fa-video"></i> Schedule Registry ({detail.meetings.length} meetings)</h3>
                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Meeting Title</th>
                                    <th>Duration</th>
                                    <th>Attendance Type</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.meetings.map(m => (
                                    <tr key={m.meeting_id}>
                                        <td><strong>{m.meeting_title}</strong></td>
                                        <td>{m.duration_minutes} mins</td>
                                        <td>
                                            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                                {m.attendance_type}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${m.meeting_status === 'Scheduled' ? 'badge-medium' : 'badge-low'}`}>
                                                {m.meeting_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-view">
            <div className="placeholder-page">
                <div className="placeholder-icon">
                    <i className={`fa-solid ${details.icon}`}></i>
                </div>
                <h2 className="text-outfit" style={{ marginBottom: '12px' }}>{details.title}</h2>
                <p className="placeholder-text">
                    {details.desc}
                </p>
            </div>
        </div>
    );
}
