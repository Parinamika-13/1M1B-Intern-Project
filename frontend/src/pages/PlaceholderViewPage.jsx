import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';

export default function PlaceholderViewPage({ tabName, role, currentUser }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Q&A assistant states
    const [question, setQuestion] = useState('');
    const [chatLog, setChatLog] = useState([
        { sender: 'ai', text: 'Hello! I am your Sustainable Work Assistant. Ask me anything about your workload, priorities, or meetings load.' }
    ]);

    useEffect(() => {
        if (currentUser && (tabName === 'list-check' || tabName === 'calendar' || tabName === 'my-workload' || tabName === 'chart-gantt')) {
            const fetchEmployeeDetails = async () => {
                setLoading(true);
                try {
                    const data = await apiService.getEmployeeDetails(currentUser.employee_id);
                    setDetail(data);
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
    }, [tabName, currentUser]);

    // Handle Assistant Questions
    const handleAskQuestion = async (e) => {
        e.preventDefault();
        const userQ = question.trim();
        if (!userQ) return;
 
        const newLog = [...chatLog, { sender: 'user', text: userQ }];
        setChatLog(newLog);
        setQuestion('');
 
        try {
            const employeeId = currentUser?.employee_id;
            if (!employeeId) return;
            const result = await apiService.askEmployeeAssistant(employeeId, userQ);
            
            let aiText = result.response;
            if (result.traceability && result.traceability.score) {
                aiText += `\n\n[Trace Log - Priority Score: ${result.traceability.score.toFixed(1)} pts | Evaluated: ${result.traceability.evaluated_tasks_count} tasks]`;
            } else if (result.traceability && result.traceability.utilization_percent) {
                aiText += `\n\n[Trace Log - Utilization: ${result.traceability.utilization_percent}% | Tasks: ${result.traceability.active_task_hours}h | Meetings: ${result.traceability.meeting_hours}h]`;
            }
            
            setChatLog(prev => [...prev, { sender: 'ai', text: aiText }]);
        } catch (err) {
            console.error(err);
            setChatLog(prev => [...prev, { sender: 'ai', text: 'Connection to the Sustainable Work AI service is offline.' }]);
        }
    };

    // Manager tab preview details
    const getManagerPlaceholder = () => {
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

    const details = getManagerPlaceholder();

    // ==================== RENDERS FOR STAFF PORTAL PLACES ====================
    if (role === 'employee') {
        // 1. My Tasks Backlog
        if (tabName === 'list-check' && detail) {
            return (
                <div className="tab-view animate-fade-in">
                    <div className="panel-card" style={{ width: '100%', textAlign: 'left' }}>
                        <h3 className="panel-title font-serif"><i className="fa-solid fa-list-check"></i> My Work Backlog ({detail.tasks.length} total)</h3>
                        <div className="table-responsive">
                            <table className="custom-table" style={{ fontSize: '0.8125rem' }}>
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
                                                <td className="font-mono"><span style={{ fontWeight: 600 }}>{t.task_complexity}</span></td>
                                                <td className="font-mono">{t.estimated_hours || 8} hrs</td>
                                                <td className="font-mono" style={{ color: t.deadline_days_remaining <= 2 ? 'var(--danger)' : 'var(--text-primary)' }}>
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

        // 2. My Meetings Calendar
        if (tabName === 'calendar' && detail) {
            return (
                <div className="tab-view animate-fade-in">
                    <div className="panel-card" style={{ width: '100%', textAlign: 'left' }}>
                        <h3 className="panel-title font-serif"><i className="fa-solid fa-video"></i> Schedule Registry ({detail.meetings.length} meetings)</h3>
                        <div className="table-responsive">
                            <table className="custom-table" style={{ fontSize: '0.8125rem' }}>
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
                                            <td className="font-mono">{m.duration_minutes} mins</td>
                                            <td>
                                                <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
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

        // 3. My Progress Metrics Detail
        if (tabName === 'chart-gantt' && detail) {
            return (
                <div className="tab-view animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="panel-card">
                        <h3 className="panel-title font-serif"><i className="fa-solid fa-spinner"></i> Sprint Progress Analytics</h3>
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                <span>Task Completion Rate</span>
                                <span className="font-mono" style={{ fontWeight: 600 }}>{Math.round(detail.completion_rate_percent)}%</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-bar" style={{ backgroundColor: 'var(--accent)', width: `${detail.completion_rate_percent}%` }}></div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div className="detail-stat-card">
                                <div className="detail-stat-label">Tasks Completed</div>
                                <div className="detail-stat-value font-mono">{detail.completed_tasks}</div>
                            </div>
                            <div className="detail-stat-card">
                                <div className="detail-stat-label">Tasks Pending</div>
                                <div className="detail-stat-value font-mono">{detail.pending_tasks + detail.in_progress_tasks}</div>
                            </div>
                            <div className="detail-stat-card">
                                <div className="detail-stat-label">Tasks Overdue</div>
                                <div className="detail-stat-value font-mono" style={{ color: 'var(--danger)' }}>{detail.overdue_tasks}</div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // 4. My Workload Dial Section
        if (tabName === 'my-workload' && detail) {
            return (
                <div className="tab-view animate-fade-in">
                    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                        <h3 className="panel-title font-serif" style={{ alignSelf: 'flex-start' }}><i className="fa-solid fa-gauge-high"></i> Workload Utilization Dial</h3>
                        <div className="workload-gauge-wrapper">
                            <div className="gauge-numeric font-serif" style={{ 
                                color: detail.workload_risk === 'High' ? 'var(--danger)' : 
                                       detail.workload_risk === 'Medium' ? 'var(--warning)' : 'var(--success)',
                                fontSize: '4rem'
                            }}>
                                {Math.round(detail.utilization_percent)}%
                            </div>
                            <span className={`badge ${
                                detail.workload_risk === 'High' ? 'badge-high' : 
                                detail.workload_risk === 'Medium' ? 'badge-medium' : 'badge-low'
                            }`} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>
                                {detail.workload_risk} Workload Risk
                            </span>
                        </div>
                        <div className="placeholder-text" style={{ marginTop: '20px' }}>
                            {detail.ai_recommendation || 'Stress factors are within normal thresholds.'}
                        </div>
                    </div>
                </div>
            );
        }

        // 5. Employee AI Assistant Q&A Chat
        if (tabName === 'brain') {
            return (
                <div className="tab-view animate-fade-in">
                    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', height: '450px' }}>
                        <h3 className="panel-title font-serif"><i className="fa-solid fa-robot"></i> Employee AI Assistant</h3>
                        
                        {/* Chat Messages */}
                        <div style={{
                            flexGrow: 1,
                            overflowY: 'auto',
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            marginBottom: '16px'
                        }}>
                            {chatLog.map((chat, idx) => (
                                <div 
                                    key={idx}
                                    style={{
                                        alignSelf: chat.sender === 'user' ? 'flex-end' : 'flex-start',
                                        backgroundColor: chat.sender === 'user' ? 'var(--accent)' : 'var(--surface)',
                                        color: chat.sender === 'user' ? 'var(--surface)' : 'var(--text-primary)',
                                        border: chat.sender === 'user' ? 'none' : '1px solid var(--border)',
                                        padding: '10px 14px',
                                        borderRadius: 'var(--radius-md)',
                                        maxWidth: '80%',
                                        fontSize: '0.8125rem',
                                        lineHeight: '1.4'
                                    }}
                                >
                                    {chat.text}
                                </div>
                            ))}
                        </div>

                        {/* Input form */}
                        <form onSubmit={handleAskQuestion} style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text"
                                className="input-control"
                                placeholder='Try asking: "Am I overloaded?" or "What should I prioritize?"'
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                style={{ borderRadius: 'var(--radius-md)' }}
                            />
                            <button type="submit" className="btn-primary" style={{ width: '80px', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            );
        }
    }

    // ==================== RENDERS FOR MANAGER PLACEHOLDERS ====================
    return (
        <div className="tab-view animate-fade-in">
            <div className="placeholder-page">
                <div className="placeholder-icon">
                    <i className={`fa-solid ${details.icon}`}></i>
                </div>
                <h2 className="text-heading font-serif" style={{ marginBottom: '12px', fontSize: '1.25rem' }}>{details.title}</h2>
                <p className="placeholder-text">
                    {details.desc}
                </p>
            </div>
        </div>
    );
}
