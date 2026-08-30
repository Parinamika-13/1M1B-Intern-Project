import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function EmployeeDetailModal({ employeeId, onClose }) {
    const [detail, setDetail] = useState(null);
    const [activeTab, setActiveTab] = useState('tasks');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showTrace, setShowTrace] = useState(false);

    useEffect(() => {
        if (!employeeId) return;

        const fetchDetails = async () => {
            setLoading(true);
            try {
                const data = await apiService.getEmployeeDetails(employeeId);
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

    const getRiskClass = (risk) => {
        if (risk === 'High') return 'badge-high';
        if (risk === 'Medium') return 'badge-medium';
        return 'badge-low';
    };

    return (
        <>
            <div className={`modal-backdrop ${employeeId ? 'show' : ''}`} onClick={onClose}></div>
            <div className={`detail-modal ${employeeId ? 'open' : ''}`}>
                <button className="btn-close-modal" onClick={onClose} aria-label="Close panel">&times;</button>
                
                {loading ? (
                    <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center', fontSize: '0.875rem' }}>
                        Loading profile details...
                    </div>
                ) : error ? (
                    <div style={{ color: 'var(--danger)', padding: '40px', textAlign: 'center', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                ) : (
                    <>
                        <div className="detail-header">
                            <div className="detail-title-block">
                                <div className="avatar" style={{ width: '46px', height: '46px', fontSize: '1.1rem' }}>
                                    {getInitials(detail.employee_name)}
                                </div>
                                <div>
                                    <h2 className="text-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {detail.employee_name}
                                    </h2>
                                    <div className="profile-role">{detail.role} • {detail.department}</div>
                                </div>
                            </div>
                        </div>

                        <div className="detail-content">
                            {/* AI recommendation box */}
                            <div className="ai-insight-box">
                                <div className="ai-insight-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span><i className="fa-solid fa-wand-magic-sparkles"></i> AI Workload Recommendation</span>
                                    <button 
                                        onClick={() => setShowTrace(!showTrace)}
                                        className="btn-action" 
                                        style={{ fontSize: '0.65rem', padding: '2px 6px', textTransform: 'none' }}
                                    >
                                        {showTrace ? 'Hide Trace' : 'Trace Calculation'}
                                    </button>
                                </div>
                                <div className="ai-insight-text" style={{ marginBottom: showTrace ? '12px' : '0' }}>
                                    {detail.ai_recommendation || 'All stress risk metrics indicate normal parameters.'}
                                </div>
                                
                                {showTrace && detail.traceability && (
                                    <div style={{
                                        borderTop: '1px solid var(--border)',
                                        paddingTop: '10px',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-secondary)',
                                        fontFamily: 'var(--font-mono)',
                                        lineHeight: '1.4'
                                    }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--accent)' }}>
                                            Calculation Trace Logs
                                        </div>
                                        <div>• Active Task Count: {detail.traceability.active_task_count}</div>
                                        <div>• Committed Task Hours: {detail.traceability.active_task_hours} hrs</div>
                                        <div>• Weekly Meeting Hours: {detail.traceability.meeting_hours} hrs</div>
                                        <div>• Available Work Hours: {detail.traceability.available_hours} hrs</div>
                                        <div>• Workload Utilization: ({detail.traceability.active_task_hours}h + {detail.traceability.meeting_hours}h) / {detail.traceability.available_hours}h = {detail.traceability.utilization_percent}%</div>
                                        <div>• Workload Classification: {detail.traceability.workload_risk} (Low &lt; {detail.traceability.thresholds?.low}%, High &gt; {detail.traceability.thresholds?.high}%)</div>
                                    </div>
                                )}
                            </div>

                            {/* Stat Grid */}
                            <div className="detail-stat-grid">
                                <div className="detail-stat-card">
                                    <div className="detail-stat-label">Workload</div>
                                    <div className="detail-stat-value" style={{ 
                                        color: detail.workload_risk === 'High' ? 'var(--danger)' : 
                                               detail.workload_risk === 'Medium' ? 'var(--warning)' : 'var(--success)'
                                    }}>
                                        {typeof detail.utilization_percent === 'number' && !isNaN(detail.utilization_percent)
                                            ? `${Math.round(detail.utilization_percent)}%`
                                            : '—'}
                                    </div>
                                </div>
                                <div className="detail-stat-card">
                                    <div className="detail-stat-label">Task Status</div>
                                    <div className="detail-stat-value" style={{ color: 'var(--text-primary)' }}>
                                        {detail.completed_tasks ?? 0} / {detail.total_tasks ?? 0}
                                    </div>
                                </div>
                                <div className="detail-stat-card">
                                    <div className="detail-stat-label">Satisfaction</div>
                                    <div className="detail-stat-value" style={{ color: 'var(--accent)' }}>
                                        {typeof detail.employee_satisfaction_score === 'number' && !isNaN(detail.employee_satisfaction_score)
                                            ? `${detail.employee_satisfaction_score.toFixed(1)}/10`
                                            : '—'}
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
                                    Metrics
                                </button>
                            </div>

                            {/* Tab Content Panes */}
                            {activeTab === 'tasks' && (
                                <div className="tab-pane">
                                    <div className="checklist-container">
                                        {(!detail.tasks || detail.tasks.length === 0) ? (
                                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '0.85rem' }}>
                                                No tasks currently assigned.
                                            </div>
                                        ) : (
                                            (detail.tasks || []).map((task) => {
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
                                                                <span>Complexity: <strong>{task.task_complexity}</strong></span>
                                                                <span>Est: <strong>{task.estimated_hours || 8}h</strong></span>
                                                                <span style={{ color: task.deadline_days_remaining <= 2 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                                                    {task.deadline_days_remaining}d remaining
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
                                        {(!detail.meetings || detail.meetings.length === 0) ? (
                                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '0.85rem' }}>
                                                No scheduled meetings.
                                            </div>
                                        ) : (
                                            (detail.meetings || []).map((meeting, index) => {
                                                const times = ["09:30 AM", "11:00 AM", "01:30 PM", "03:00 PM", "04:30 PM"];
                                                const timeStr = times[index % times.length];
                                                return (
                                                    <div key={meeting.meeting_id} className="timeline-item">
                                                        <div className="timeline-time">{timeStr}</div>
                                                        <div className="timeline-title">{meeting.meeting_title}</div>
                                                        <div className="timeline-desc">
                                                            {meeting.duration_minutes}m • {meeting.attendance_type} ({meeting.meeting_status})
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
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
                                            Primary Skill Focus
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fa-solid fa-certificate"></i> {detail.primary_skill}
                                            <span className="badge" style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                                                {detail.skill_level}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
                                            Supplementary Skill Matrix
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '10px', fontStyle: 'italic' }}>
                                            Note: Supplementary skills are inferred based on department context.
                                        </div>
                                        <div className="skills-container">
                                            {(detail.supplementary_skills || []).map((skill, index) => (
                                                <span key={index} className="skill-tag" style={{ borderStyle: 'dashed', backgroundColor: 'var(--bg-primary)' }}>{skill} (Inferred)</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'progress' && (
                                <div className="tab-pane">
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                            <span>Task Completion Rate</span>
                                            <span style={{ fontWeight: 600 }}>{Math.round(detail.completion_rate_percent || 0)}%</span>
                                        </div>
                                        <div className="progress-track">
                                            <div 
                                                className="progress-bar" 
                                                style={{ backgroundColor: 'var(--accent)', width: `${detail.completion_rate_percent || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                            <span>Overdue Tasks:</span>
                                            <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{detail.overdue_tasks ?? 0}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                            <span>Pending Tasks:</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {(detail.pending_tasks || 0) + (detail.in_progress_tasks || 0)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                            <span>Weekly Meeting Hours:</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(detail.meeting_hours || 0).toFixed(1)} hrs</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                                            <span>Leaves Taken (Month):</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{detail.leave_days_this_month ?? 0} days</span>
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
