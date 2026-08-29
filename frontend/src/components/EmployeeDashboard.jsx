import React, { useEffect, useState } from 'react';

export default function EmployeeDashboard({ employeeId }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/employee-dashboard/${employeeId}`);
                if (!response.ok) throw new Error('Failed to load employee dashboard data');
                const data = await response.json();
                setDetail(data);
            } catch (err) {
                console.error(err);
                setError('Error fetching personal workload profile.');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [employeeId]);

    const handleToggleTask = async (taskId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/tasks/toggle/${taskId}`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Failed to update task state');
            
            const result = await response.json();
            
            // Update local state dynamically
            setDetail(prev => {
                const updatedTasks = prev.tasks.map(t => {
                    if (t.task_id === taskId) {
                        return { ...t, status: result.new_status, progress_percent: result.new_progress };
                    }
                    return t;
                });
                
                // Recalculate completed count
                const completed = updatedTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
                const inProgress = updatedTasks.filter(t => t.status === 'In Progress').length;
                const pending = updatedTasks.filter(t => t.status === 'To Do' || t.status === 'Pending').length;
                
                return {
                    ...prev,
                    tasks: updatedTasks,
                    completed_tasks: completed,
                    in_progress_tasks: inProgress,
                    pending_tasks: pending,
                    completion_rate_percent: result.employee_updated_completion_rate
                };
            });
        } catch (err) {
            console.error('Toggle task error:', err);
            alert('Failed to update task state. Backend error.');
        }
    };

    if (loading) {
        return <div style={{ color: 'var(--text-muted)', padding: '20px' }}>Loading personal workspace...</div>;
    }

    if (error) {
        return <div style={{ color: 'var(--color-high)', padding: '20px' }}>{error}</div>;
    }

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
    } = detail;

    const activeTasksCount = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length;

    const getWorkloadTheme = () => {
        if (workload_risk === 'Low') {
            return {
                badgeClass: 'badge-low',
                color: 'var(--color-low)',
                desc: 'Workload represents high available capacity. You have surplus hours to plan new milestones or engage in training tasks.'
            };
        } else if (workload_risk === 'Medium') {
            return {
                badgeClass: 'badge-medium',
                color: 'var(--color-medium)',
                desc: 'Workload is well-balanced. You have standard task counts, focus blocks, and meeting commitments within comfort metrics.'
            };
        } else {
            return {
                badgeClass: 'badge-high',
                color: 'var(--color-high)',
                desc: 'Risk alert: Workload utilization is excessive. Consider deferring pending tasks, negotiating meeting invites, or talking to your team lead.'
            };
        }
    };

    const workloadTheme = getWorkloadTheme();

    const getPriorityClass = (priority) => {
        if (priority === 'High') return 'priority-high';
        if (priority === 'Medium') return 'priority-medium';
        return 'priority-low';
    };

    return (
        <div className="tab-view">
            <h2 className="text-outfit" style={{ marginBottom: '20px' }}>Good morning, {employee_name}</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '-15px', marginBottom: '30px' }}>
                Today's overview: You have <strong>{activeTasksCount} active tasks</strong> in backlog and <strong>{meetings.length} meetings</strong> scheduled.
            </p>

            <div className="dashboard-row">
                {/* Left Column: Tasks and Meetings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* My Tasks */}
                    <div className="panel-card">
                        <h3 className="panel-title"><i className="fa-solid fa-list-check"></i> My Tasks for Today</h3>
                        <div className="checklist-container">
                            {tasks.length === 0 ? (
                                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>
                                    No tasks assigned today.
                                </div>
                            ) : (
                                tasks.slice(0, 5).map((task) => {
                                    const isCompleted = task.status === 'Completed' || task.status === 'Done';
                                    return (
                                        <div 
                                            key={task.task_id} 
                                            className={`checklist-item ${isCompleted ? 'checked' : ''}`}
                                        >
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

                    {/* My Meetings */}
                    <div className="panel-card">
                        <h3 className="panel-title"><i className="fa-solid fa-video"></i> Today's Schedule</h3>
                        <div className="timeline">
                            {meetings.length === 0 ? (
                                <div style={{ color: 'var(--text-dim)', paddingLeft: '10px' }}>
                                    No meetings scheduled today. Enjoy your Focus Time!
                                </div>
                            ) : (
                                meetings.map((m, index) => {
                                    const times = ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"];
                                    const timeStr = times[index % times.length];
                                    return (
                                        <div key={m.meeting_id} className="timeline-item">
                                            <div className="timeline-time">{timeStr}</div>
                                            <div className="timeline-title">{m.meeting_title}</div>
                                            <div className="timeline-desc">
                                                {m.duration_minutes} minutes • {m.attendance_type} ({m.meeting_status})
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Workload Status and Progress */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Workload Gauge */}
                    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '250px' }}>
                        <h3 className="panel-title" style={{ alignSelf: 'flex-start' }}><i className="fa-solid fa-gauge-high"></i> My Workload Status</h3>
                        <div className="workload-gauge-wrapper">
                            <div className="gauge-numeric" style={{ color: workloadTheme.color }}>
                                {Math.round(utilization_percent)}%
                            </div>
                            <span className={`badge ${workloadTheme.badgeClass}`}>
                                {workload_risk} Workload
                            </span>
                        </div>
                        <div className="gauge-description">
                            {workloadTheme.desc}
                        </div>
                    </div>

                    {/* Progress Trackers */}
                    <div className="panel-card">
                        <h3 className="panel-title"><i className="fa-solid fa-spinner"></i> My Weekly Progress</h3>
                        <div className="progress-grid">
                            <div className="progress-card">
                                <div className="progress-card-num" style={{ color: 'var(--color-low)' }}>{completed_tasks}</div>
                                <div className="progress-card-label">Completed</div>
                            </div>
                            <div className="progress-card">
                                <div className="progress-card-num" style={{ color: 'var(--accent-blue)' }}>{in_progress_tasks}</div>
                                <div className="progress-card-label">In Progress</div>
                            </div>
                            <div className="progress-card">
                                <div className="progress-card-num" style={{ color: 'var(--color-high)' }}>{overdue_tasks}</div>
                                <div className="progress-card-label">Overdue</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                <span>Overall Completion Rate</span>
                                <span>{Math.round(completion_rate_percent)}%</span>
                            </div>
                            <div className="progress-track">
                                <div 
                                    className="progress-bar" 
                                    style={{ backgroundColor: 'var(--accent-blue)', width: `${completion_rate_percent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* AI Placeholder (Phase 2 Preview) */}
                    <div className="ai-insight-box">
                        <div className="ai-insight-header">
                            <i className="fa-solid fa-wand-magic-sparkles"></i> AI Recommendation Preview
                        </div>
                        <div className="ai-insight-text">
                            AI Workload Assistant is ready. In Phase 2, this panel will give you direct daily task prioritization and early overload warning indicators.
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
