import React, { useEffect, useState } from 'react';

export default function ManagerDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/stats');
                if (!response.ok) throw new Error('Failed to fetch statistics');
                const data = await response.json();
                setStats(data);
            } catch (err) {
                console.error(err);
                setError('Error loading stats from Flask backend.');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return <div style={{ color: 'var(--text-muted)', padding: '20px' }}>Analyzing workforce database...</div>;
    }

    if (error) {
        return <div style={{ color: 'var(--color-high)', padding: '20px' }}>{error}</div>;
    }

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
    } = stats;

    const lowCount = risk_distribution.Low || 0;
    const medCount = risk_distribution.Medium || 0;
    const highCount = risk_distribution.High || 0;
    
    const pLow = Math.round((lowCount / employees_count) * 100);
    const pMed = Math.round((medCount / employees_count) * 100);
    const pHigh = Math.round((highCount / employees_count) * 100);

    return (
        <div className="tab-view">
            <h2 className="text-outfit" style={{ marginBottom: '20px' }}>Good morning, Manager</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '-15px', marginBottom: '30px' }}>
                Team Operations Status: <strong>{employees_count} Employees, {projects_count} Projects, {completed_tasks + pending_tasks} Tasks, 1,200 Meetings</strong>
            </p>

            {/* Metrics Grid */}
            <div className="dashboard-grid">
                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Employees</span>
                        <i className="fa-solid fa-users metric-icon"></i>
                    </div>
                    <div className="metric-value">{employees_count}</div>
                    <span className="metric-desc">Total active headcount</span>
                </div>

                <div className="metric-card">
                    <div className="metric-header">
                        <span class="metric-title">Active Projects</span>
                        <i className="fa-solid fa-folder-open metric-icon"></i>
                    </div>
                    <div className="metric-value">{projects_count}</div>
                    <span className="metric-desc">Cross-functional tracks</span>
                </div>

                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Tasks Completed</span>
                        <i className="fa-solid fa-circle-check metric-icon" style={{ color: 'var(--color-low)' }}></i>
                    </div>
                    <div className="metric-value">{completed_tasks.toLocaleString()}</div>
                    <span className="metric-desc">Completed workflow tasks</span>
                </div>

                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Tasks Pending</span>
                        <i className="fa-solid fa-circle-notch fa-spin metric-icon" style={{ color: 'var(--color-medium)' }}></i>
                    </div>
                    <div className="metric-value">{pending_tasks.toLocaleString()}</div>
                    <span className="metric-desc">In progress or to-do states</span>
                </div>

                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Overdue Tasks</span>
                        <i className="fa-solid fa-triangle-exclamation metric-icon" style={{ color: 'var(--color-high)' }}></i>
                    </div>
                    <div className="metric-value">{overdue_tasks.toLocaleString()}</div>
                    <span className="metric-desc">Passed target deadlines</span>
                </div>

                <div className="metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Avg Workload</span>
                        <i className="fa-solid fa-gauge-high metric-icon"></i>
                    </div>
                    <div className="metric-value">{avg_workload_percent}%</div>
                    <span className="metric-desc">Mean resource utilization</span>
                </div>
            </div>

            {/* Workload Overview Chart Row */}
            <div className="dashboard-row">
                <div className="panel-card">
                    <h3 className="panel-title"><i className="fa-solid fa-chart-simple"></i> Team Workload Balance</h3>
                    <div className="workload-chart-container">
                        <div className="chart-bar-item">
                            <div className="chart-bar-info">
                                <span className="chart-label">
                                    <span className="chart-indicator" style={{ backgroundColor: 'var(--color-low)' }}></span>
                                    Low Workload (&lt;80% utilization)
                                </span>
                                <span className="chart-value">{lowCount} employees</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-bar" style={{ backgroundColor: 'var(--color-low)', width: `${pLow}%` }}></div>
                            </div>
                        </div>

                        <div className="chart-bar-item">
                            <div className="chart-bar-info">
                                <span className="chart-label">
                                    <span className="chart-indicator" style={{ backgroundColor: 'var(--color-medium)' }}></span>
                                    Medium Workload (80% - 110%)
                                </span>
                                <span className="chart-value">{medCount} employees</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-bar" style={{ backgroundColor: 'var(--color-medium)', width: `${pMed}%` }}></div>
                            </div>
                        </div>

                        <div className="chart-bar-item">
                            <div className="chart-bar-info">
                                <span className="chart-label">
                                    <span className="chart-indicator" style={{ backgroundColor: 'var(--color-high)' }}></span>
                                    High Workload (&gt;110% utilization / Risk)
                                </span>
                                <span className="chart-value">{highCount} employees</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-bar" style={{ backgroundColor: 'var(--color-high)', width: `${pHigh}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="panel-card">
                    <h3 className="panel-title"><i className="fa-solid fa-star"></i> Performance Indicators</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Team Satisfaction</span>
                            <span style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-low)' }}>
                                {avg_satisfaction}/10
                            </span>
                        </div>
                        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Meeting Burden (Avg)</span>
                            <span style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                                {avg_meeting_hours_weekly} hrs/wk
                            </span>
                        </div>
                        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Completion Rate</span>
                            <span style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                                {avg_completion_rate_percent}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
