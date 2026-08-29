import React, { useState, useEffect } from 'react';

export default function EmployeeDetailModal({ employeeId, onClose }) {
    const [detail, setDetail] = useState(null);
    const [activeTab, setActiveTab] = useState('tasks');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!employeeId) return;

        const fetchDetails = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:5000/api/employees/${employeeId}`);
                if (!response.ok) throw new Error('Employee details not found');
                const data = await response.json();
                setDetail(data);
            } catch (err) {
                console.error(err);
                setError('Failed to fetch detailed profile.');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
        setActiveTab('tasks'); // Reset tab on employee change
    }, [employeeId]);

    if (!employeeId) return null;

    const getInitials = (name) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getPriorityClass = (priority) => {
        if (priority === 'High') return 'priority-high';
        if (priority === 'Medium') return 'priority-medium';
        return 'priority-low';
    };

    return (
        <>
            <div className={`modal-backdrop ${employeeId ? 'show' : ''}`} onClick={onClose}></div>
            <div className={`detail-modal ${employeeId ? 'open' : ''}`}>
                <button className="btn-close-modal" onClick={onClose}>&times;</button>
                
                {loading ? (
                    <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>
                        Loading profile details...
                    </div>
                ) : error ? (
                    <div style={{ color: 'var(--color-high)', padding: '40px', textAlign: 'center' }}>
                        {error}
                    </div>
                ) : (
                    <>
                        <div className="detail-header">
                            <div className="detail-title-block">
                                <div className="avatar" style={{ width: '50px', height: '50px', fontSize: '1.2rem' }}>
                                    {getInitials(detail.employee_name)}
                                </div>
                                <div>
                                    <h2 className="text-outfit" style={{ lineHeight: 1.1 }}>{detail.employee_name}</h2>
                                    <div className="detail-meta">{detail.role} • {detail.department}</div>
                                </div>
                            </div>
                        </div>

                        <div className="detail-content">
                            {/* AI recommendation box */}
                            <div className="ai-insight-box">
                                <div className="ai-insight-header">
                                    <i className="fa-solid fa-wand-magic-sparkles"></i> AI Workload Insight
                                </div>
                                <div className="ai-insight-text">
                                    {detail.ai_recommendation || 'Balanced workload thresholds.'}
                                </div>
                            </div>

                            {/* Stat Grid */}
                            <div className="detail-stat-grid">
                                <div className="detail-stat-card">
                                    <div className="detail-stat-label">Workload</div>
                                    <div className="detail-stat-value">{Math.round(detail.utilization_percent)}%</div>
                                </div>
                                <div className="detail-stat-card">
                                    <div className="detail-stat-label">Tasks Completed</div>
                                    <div className="detail-stat-value">{detail.completed_tasks} / {detail.total_tasks}</div>
                                </div>
                                <div className="detail-stat-card">
                                    <div className="detail-stat-label">Satisfaction</div>
                                    <div className="detail-stat-value" style={{ color: 'var(--color-low)' }}>
                                        {detail.employee_satisfaction_score.toFixed(1)}/10
                                    </div>
                                </div>
                            </div>

                            {/* Tab Navigation */}
                            <div className="tabs-header">
                                <button 
                                    className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('tasks')}
                                >
                                    Tasks
                                </button>
                                <button 
                                    className={`tab-btn ${activeTab === 'meetings' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('meetings')}
                                >
                                    Meetings
                                </button>
                                <button 
                                    className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('skills')}
                                >
                                    Skills
                                </button>
                                <button 
                                    className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('progress')}
                                >
                                    Progress
                                </button>
                            </div>

                            {/* Tab Content Panes */}
                            {activeTab === 'tasks' && (
                                <div className="tab-pane">
                                    <div className="checklist-container">
                                        {detail.tasks.length === 0 ? (
                                            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px 0' }}>
                                                No tasks currently assigned.
                                            </div>
                                        ) : (
                                            detail.tasks.map((task) => {
                                                const isCompleted = task.status === 'Completed' || task.status === 'Done';
                                                return (
                                                    <div key={task.task_id} className={`checklist-item ${isCompleted ? 'checked' : ''}`}>
                                                        <input type="checkbox" checked={isCompleted} readOnly disabled />
                                                        <div className="checklist-item-body">
                                                            <div className="checklist-item-title">{task.task_title}</div>
                                                            <div className="checklist-meta">
                                                                <span className={`priority-pill ${getPriorityClass(task.priority)}`}>
                                                                    {task.priority}
                                                                </span>
                                                                <span>Complexity: <strong style={{ color: 'var(--text-main)' }}>{task.task_complexity}</strong></span>
                                                                <span>Est: <strong>{task.estimated_hours || 8} hrs</strong></span>
                                                                <span style={{ color: task.deadline_days_remaining <= 2 ? 'var(--color-high)' : 'var(--text-muted)' }}>
                                                                    {task.deadline_days_remaining} days left
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'meetings' && (
                                <div className="tab-pane">
                                    <div className="timeline">
                                        {detail.meetings.length === 0 ? (
                                            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px 0' }}>
                                                No scheduled meetings.
                                            </div>
                                        ) : (
                                            detail.meetings.map((meeting, index) => {
                                                const times = ["09:30 AM", "11:00 AM", "01:30 PM", "03:00 PM", "04:30 PM"];
                                                const timeStr = times[index % times.length];
                                                return (
                                                    <div key={meeting.meeting_id} className="timeline-item">
                                                        <div className="timeline-time">{timeStr}</div>
                                                        <div className="timeline-title">{meeting.meeting_title}</div>
                                                        <div className="timeline-desc">
                                                            {meeting.duration_minutes} minutes • {meeting.attendance_type} ({meeting.meeting_status})
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'skills' && (
                                <div className="tab-pane">
                                    <div style={{ width: '100%', marginBottom: '15px' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                                            Primary Skill Focus
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fa-solid fa-certificate"></i> {detail.primary_skill}
                                            <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                                {detail.skill_level}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '10px' }}>
                                            Supplementary Skill Matrix
                                        </div>
                                        <div className="skills-container">
                                            {detail.supplementary_skills.map((skill, index) => (
                                                <span key={index} className="skill-tag">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'progress' && (
                                <div className="tab-pane">
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                            <span>Tasks Completion Rate</span>
                                            <span>{Math.round(detail.completion_rate_percent)}%</span>
                                        </div>
                                        <div className="progress-track">
                                            <div 
                                                className="progress-bar" 
                                                style={{ backgroundColor: 'var(--accent-blue)', width: `${detail.completion_rate_percent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Overdue Tasks:</span>
                                            <span style={{ fontWeight: 600, color: 'var(--color-high)' }}>{detail.overdue_tasks}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Pending Tasks:</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                {detail.pending_tasks + detail.in_progress_tasks}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Weekly Meeting Hours:</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{detail.meeting_hours.toFixed(1)} hrs</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Leave Days This Month:</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{detail.leave_days_this_month} days</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
