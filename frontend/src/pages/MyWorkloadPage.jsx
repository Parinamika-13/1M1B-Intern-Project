import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function MyWorkloadPage({ currentUser }) {
    const [dashboard, setDashboard] = useState(null);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchWorkloadData = async () => {
            if (!currentUser?.employee_id) {
                setError('No associated employee ID was found for this user account.');
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const [dashData, detailData] = await Promise.all([
                    apiService.getEmployeeDashboard(currentUser.employee_id),
                    apiService.getEmployeeDetails(currentUser.employee_id)
                ]);
                setDashboard(dashData);
                setDetail(detailData);
            } catch (err) {
                console.error('Failed to load workload statistics:', err);
                setError('Failed to fetch workload diagnostics.');
            } finally {
                setLoading(false);
            }
        };
        fetchWorkloadData();
    }, [currentUser]);

    if (loading) {
        return <div style={{ color: 'var(--text-secondary)', padding: '24px', fontSize: '0.875rem' }}>Loading workload diagnostics...</div>;
    }

    if (error) {
        return <div style={{ color: 'var(--danger)', padding: '24px', fontSize: '0.875rem' }}>{error}</div>;
    }

    if (!dashboard || !detail) {
        return <div style={{ color: 'var(--text-secondary)', padding: '24px' }}>Workload statistics are unavailable.</div>;
    }

    const {
        utilization_percent,
        workload_risk,
        tasks,
        meetings
    } = dashboard;

    const activeTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done');
    const taskHours = activeTasks.reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0.0), 0.0);
    const meetingHours = meetings.reduce((sum, m) => sum + (parseFloat(m.duration_minutes) || 0.0) / 60.0, 0.0);
    const availableHours = detail.available_hours_per_week || 40.0;
    const totalCommitted = taskHours + meetingHours;

    // Dynamic Fulcrum Tilt Angle
    const tiltAngle = Math.max(-15, Math.min(15, ((utilization_percent - 100) / 100) * 30));

    return (
        <div className="tab-view animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="panel-card" style={{ marginBottom: '24px' }}>
                <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-gauge-high" style={{ color: 'var(--accent)' }}></i>
                    My Workload Diagnostics
                </h2>

                {/* Balance Scale illustration */}
                <div className="balance-scale-container" style={{ margin: '40px auto' }}>
                    <div className="balance-scale-beam" style={{ transform: `rotate(${tiltAngle}deg)` }}>
                        <div className="scale-basket left-basket">
                            <div className="basket-label">Tasks ({Math.round(taskHours)}h)</div>
                        </div>
                        <div className="scale-basket right-basket">
                            <div className="basket-label">Capacity ({Math.round(availableHours - meetingHours)}h)</div>
                        </div>
                    </div>
                    <div className="balance-scale-fulcrum"></div>
                </div>

                {/* Utilization stats cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="metric-card">
                        <div className="metric-title">Workload Utilization</div>
                        <div className="metric-value" style={{ 
                            color: workload_risk === 'High' ? 'var(--danger)' : 
                                   workload_risk === 'Medium' ? 'var(--warning)' : 'var(--success)'
                        }}>
                            {utilization_percent}%
                        </div>
                        <span className="metric-desc">Target low &lt; 80%, high &gt; 110%</span>
                    </div>

                    <div className="metric-card">
                        <div className="metric-title">Workload Stress Risk</div>
                        <div className="metric-value" style={{ 
                            color: workload_risk === 'High' ? 'var(--danger)' : 
                                   workload_risk === 'Medium' ? 'var(--warning)' : 'var(--success)'
                        }}>
                            {workload_risk}
                        </div>
                        <span className="metric-desc">Based on active commitments</span>
                    </div>

                    <div className="metric-card">
                        <div className="metric-title">Remaining Capacity</div>
                        <div className="metric-value" style={{ color: 'var(--accent)' }}>
                            {Math.round(Math.max(0.0, availableHours - totalCommitted))} hrs
                        </div>
                        <span className="metric-desc">Weekly focus buffer</span>
                    </div>
                </div>

                {/* Heuristic AI Recommendation */}
                <div className="ai-insight-box">
                    <div className="ai-insight-header">
                        <span><i className="fa-solid fa-wand-magic-sparkles"></i> AI Workload Evaluation</span>
                    </div>
                    <div className="ai-insight-text">
                        {detail.ai_recommendation}
                    </div>

                    <div style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: '10px',
                        marginTop: '12px',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        lineHeight: '1.4'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--accent)' }}>
                            Calculation Trace Logs
                        </div>
                        <div>• Active Task Hours: {taskHours} hrs (across {activeTasks.length} pending tasks)</div>
                        <div>• Scheduled Meetings Duration: {meetingHours.toFixed(1)} hrs (across {meetings.length} meetings)</div>
                        <div>• Total Committed workload: {totalCommitted.toFixed(1)} hrs / {availableHours} hrs available per week</div>
                        <div>• Verification: ({taskHours.toFixed(1)}h + {meetingHours.toFixed(1)}h) / {availableHours}h = {utilization_percent}%</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
