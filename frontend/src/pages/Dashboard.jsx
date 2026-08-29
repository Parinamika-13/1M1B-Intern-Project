import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import StatCard from '../components/StatCard';

export default function Dashboard({ currentRole, currentUser }) {
    const [managerData, setManagerData] = useState(null);
    const [employeeData, setEmployeeData] = useState(null);
    const [deptStats, setDeptStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ==================== STATE FOR DYNAMIC CONFIGS ====================
    const [departments, setDepartments] = useState([]);
    const [skills, setSkills] = useState([]);
    const [aiConfig, setAiConfig] = useState({
        WORKLOAD_THRESHOLD_LOW: 80,
        WORKLOAD_THRESHOLD_HIGH: 110,
        MEETING_OVERLOAD_PCT: 30,
        DEADLINE_URGENCY_DAYS: 3,
        PROGRESS_RISK_THRESHOLD: 50
    });

    // ==================== STATE FOR AI AGENTS ====================
    // Agent 2: Task Assignment Recommendations
    const [taskSkill, setTaskSkill] = useState('');
    const [taskHours, setTaskHours] = useState(8);
    const [taskPriority, setTaskPriority] = useState('High');
    const [taskDeadline, setTaskDeadline] = useState(5);
    const [allocatorResults, setAllocatorResults] = useState([]);
    const [allocatorLoading, setAllocatorLoading] = useState(false);
    const [showAllocatorTrace, setShowAllocatorTrace] = useState(false);

    // Agent 3: Weekly Progress Summary
    const [summaryDept, setSummaryDept] = useState('');
    const [weeklySummary, setWeeklySummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [showSummaryTrace, setShowSummaryTrace] = useState(false);

    // Agent 4: Early Warnings / Overload Alerts
    const [earlyWarnings, setEarlyWarnings] = useState(null);
    const [showWarningTrace, setShowWarningTrace] = useState(false);

    // Agent 5: Employee AI recommendation
    const [employeeAiRecommend, setEmployeeAiRecommend] = useState('');
    const [employeeAiTrace, setEmployeeAiTrace] = useState(null);
    const [showEmployeeAiTrace, setShowEmployeeAiTrace] = useState(false);

    // Fetch initial data
    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                if (currentRole === 'manager') {
                    // Fetch dynamic config, departments, and skills first (Requirement 3 & 4)
                    try {
                        const conf = await apiService.getAiConfig();
                        setAiConfig(conf);
                    } catch (e) {
                        console.warn('Could not load AI config:', e);
                    }

                    try {
                        const depts = await apiService.getDepartments();
                        setDepartments(depts);
                    } catch (e) {
                        console.warn('Could not load departments:', e);
                    }

                    let initialSkill = 'System Design';
                    try {
                        const sks = await apiService.getSkills();
                        setSkills(sks);
                        if (sks.length > 0) {
                            setTaskSkill(sks[0]);
                            initialSkill = sks[0];
                        }
                    } catch (e) {
                        console.warn('Could not load skills:', e);
                    }

                    // Fetch manager summary stats
                    const stats = await apiService.getStats();
                    setManagerData(stats);

                    // Fetch all employees to calculate department statistics dynamically
                    const employees = await apiService.getEmployees();
                    const deptsGroup = {};
                    
                    employees.forEach(emp => {
                        const d = emp.department;
                        if (!deptsGroup[d]) {
                            deptsGroup[d] = { count: 0, sumWorkload: 0, completed: 0, total: 0 };
                        }
                        deptsGroup[d].count += 1;
                        deptsGroup[d].sumWorkload += emp.utilization_percent;
                        deptsGroup[d].completed += emp.completed_tasks;
                        deptsGroup[d].total += emp.total_tasks;
                    });

                    const computedDeptStats = Object.keys(deptsGroup).map(dept => {
                        const data = deptsGroup[dept];
                        return {
                            name: dept,
                            headcount: data.count,
                            avgWorkload: Math.round(data.sumWorkload / data.count),
                            completionRate: Math.round(data.total > 0 ? (data.completed / data.total * 100) : 0)
                        };
                    });
                    setDeptStats(computedDeptStats);

                    // Fetch Agent 3 Weekly Progress Summary (initially organization-wide)
                    const summary = await apiService.getWeeklySummary('');
                    setWeeklySummary(summary);

                    // Fetch Agent 4 Early Warning alerts
                    const warnings = await apiService.getEarlyWarnings();
                    setEarlyWarnings(warnings);

                    // Run initial dynamic assignment query
                    triggerAssignmentQuery(initialSkill, 8, 'High', 5);
                } else if (currentUser) {
                    // Fetch individual employee dashboard data
                    const dashboard = await apiService.getEmployeeDashboard(currentUser.employee_id);
                    setEmployeeData(dashboard);

                    // Fetch Agent 5 prioritization recommendation
                    const aiResult = await apiService.askEmployeeAssistant(currentUser.employee_id, 'What should I prioritize today?');
                    setEmployeeAiRecommend(aiResult.response);
                    setEmployeeAiTrace(aiResult.traceability);
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

    // Handle department change for Agent 3 Weekly Summary
    const handleDeptSummaryChange = async (dept) => {
        setSummaryDept(dept);
        setSummaryLoading(true);
        try {
            const summary = await apiService.getWeeklySummary(dept);
            setWeeklySummary(summary);
        } catch (e) {
            console.error('Failed to update weekly summary:', e);
        } finally {
            setSummaryLoading(false);
        }
    };

    // Trigger Agent 2 task allocator query
    const triggerAssignmentQuery = async (skill, hours, priority, deadline) => {
        setAllocatorLoading(true);
        try {
            const results = await apiService.getTaskAssignmentRecommendations({
                required_skill: skill,
                estimated_hours: hours,
                priority: priority,
                deadline_days: deadline
            });
            setAllocatorResults(results);
        } catch (e) {
            console.error('Task assignment allocation failed:', e);
        } finally {
            setAllocatorLoading(false);
        }
    };

    const handleAllocatorSubmit = (e) => {
        e.preventDefault();
        triggerAssignmentQuery(taskSkill, taskHours, taskPriority, taskDeadline);
    };

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

                // Refresh AI recommendations (priorities change when task status updates!)
                if (currentUser) {
                    const aiResult = await apiService.askEmployeeAssistant(currentUser.employee_id, 'What should I prioritize today?');
                    setEmployeeAiRecommend(aiResult.response);
                    setEmployeeAiTrace(aiResult.traceability);
                }
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

        // Dynamic Fulcrum Tilt Angle
        const totalWeight = lowCount + medCount + highCount;
        const balancedWeight = lowCount + medCount;
        const weightDifference = highCount - balancedWeight;
        const rawTilt = (weightDifference / totalWeight) * 60;
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
                    {/* Left Column: Balance Beam, Task Allocator Form, and Department Table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Workload Balance Beam */}
                        <div className="balance-beam-wrapper">
                            <h3 className="panel-title" style={{ alignSelf: 'flex-start' }}>
                                <i className="fa-solid fa-scale-balanced"></i> Workload Balance Beam
                            </h3>
                            
                            <div className="fulcrum-beam-system">
                                <div className="beam-fulcrum"></div>
                                <div className="beam-lever-container" style={{ transform: `rotate(${tiltAngle}deg)` }}>
                                    <div className="beam-line-bar"></div>
                                    <div className="beam-pivot-pin"></div>
                                    
                                    <div className="beam-tray-left" style={{ transform: `rotate(${-tiltAngle}deg)` }}>
                                        <div className="tray-suspension-wire"></div>
                                        <div className="weight-plate" style={{ borderTop: '4px solid var(--success)' }}>
                                            <div className="weight-plate-label">Balanced</div>
                                            <div className="weight-plate-value font-serif">{balancedWeight}</div>
                                            <div className="weight-plate-sub">Low + Medium</div>
                                        </div>
                                    </div>
                                    
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

                        {/* Agent 2: AI Task Allocator Engine */}
                        <div className="panel-card">
                            <h3 className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span><i className="fa-solid fa-wand-magic-sparkles"></i> AI Task Assignment Allocator</span>
                                <button 
                                    onClick={() => setShowAllocatorTrace(!showAllocatorTrace)}
                                    className="btn-action" 
                                    style={{ fontSize: '0.65rem', padding: '2px 6px', textTransform: 'none' }}
                                >
                                    {showAllocatorTrace ? 'Hide Formula' : 'Show Match Formula'}
                                </button>
                            </h3>
                            
                            {showAllocatorTrace && (
                                <div style={{
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-mono)',
                                    lineHeight: '1.4',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' }}>RANKING FUNCTION MATRICES:</div>
                                    <div>• Required Skill Match = +1000 base points (primary/departmental match verification).</div>
                                    <div>• Capacity Availability Score = (100 - utilization %) * 2.</div>
                                    <div>• High-Workload Burnout Penalty = -500 points (assigned if current utilization &gt; {aiConfig.WORKLOAD_THRESHOLD_HIGH}%).</div>
                                </div>
                            )}

                            <form onSubmit={handleAllocatorSubmit} style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                gap: '12px',
                                marginBottom: '20px',
                                backgroundColor: 'var(--bg-primary)',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)'
                            }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Skill Requirement</label>
                                    <select 
                                        className="select-filter" 
                                        style={{ width: '100%', minWidth: 0 }}
                                        value={taskSkill} 
                                        onChange={(e) => setTaskSkill(e.target.value)}
                                    >
                                        {skills.map(sk => (
                                            <option key={sk} value={sk}>{sk}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Est. Hours</label>
                                    <input 
                                        type="number" 
                                        className="input-control" 
                                        value={taskHours} 
                                        min="1" 
                                        max="40"
                                        onChange={(e) => setTaskHours(parseInt(e.target.value) || 8)}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Priority</label>
                                    <select 
                                        className="select-filter" 
                                        style={{ width: '100%', minWidth: 0 }}
                                        value={taskPriority} 
                                        onChange={(e) => setTaskPriority(e.target.value)}
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Deadline Days</label>
                                    <input 
                                        type="number" 
                                        className="input-control" 
                                        value={taskDeadline} 
                                        min="1" 
                                        max="30"
                                        onChange={(e) => setTaskDeadline(parseInt(e.target.value) || 5)}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                    <button type="submit" className="btn-primary" style={{ height: '40px', padding: '0' }} disabled={allocatorLoading}>
                                        {allocatorLoading ? 'Sorting...' : 'Assign'}
                                    </button>
                                </div>
                            </form>

                            {/* Ranked results list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {allocatorResults.map((candidate, idx) => (
                                    <div key={candidate.employee_id} style={{
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '12px 16px',
                                        backgroundColor: candidate.has_skill ? 'var(--bg-primary)' : 'rgba(0,0,0,0.02)',
                                        opacity: candidate.has_skill ? 1 : 0.7
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                {idx + 1}. {candidate.employee_name} ({candidate.role} • {candidate.department})
                                            </span>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span 
                                                    className="badge" 
                                                    style={{ 
                                                        fontSize: '0.65rem', 
                                                        padding: '2px 6px',
                                                        backgroundColor: candidate.match_type === 'Primary Skill Match' ? 'rgba(79, 122, 92, 0.1)' : 'rgba(185, 130, 47, 0.1)',
                                                        color: candidate.match_type === 'Primary Skill Match' ? 'var(--success)' : 'var(--warning)',
                                                        border: `1px solid ${candidate.match_type === 'Primary Skill Match' ? 'var(--success)' : 'var(--warning)'}`
                                                    }}
                                                >
                                                    {candidate.match_type === 'Primary Skill Match' ? 'Primary Skill' : 'Inferred from Dept'}
                                                </span>
                                                <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                    Score: {candidate.suitability_score} pts
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {candidate.reasoning}
                                        </div>
                                    </div>
                                ))}
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
                                                                backgroundColor: dept.avgWorkload > aiConfig.WORKLOAD_THRESHOLD_HIGH ? 'var(--danger)' : 
                                                                                   dept.avgWorkload >= aiConfig.WORKLOAD_THRESHOLD_LOW ? 'var(--warning)' : 'var(--success)', 
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

                    {/* Right Column: Weekly Summary, Early Warnings, KPIs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Agent 3: Weekly Progress Summary */}
                        <div className="panel-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
                                <h3 className="panel-title" style={{ margin: 0 }}><i className="fa-solid fa-chart-line"></i> Progress Summary</h3>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button 
                                        onClick={() => setShowSummaryTrace(!showSummaryTrace)}
                                        className="btn-action" 
                                        style={{ fontSize: '0.65rem', padding: '4px 8px', textTransform: 'none' }}
                                    >
                                        {showSummaryTrace ? 'Hide Trace' : 'Trace Logs'}
                                    </button>
                                    <select 
                                        className="select-filter" 
                                        style={{ padding: '4px 8px', fontSize: '0.75rem', minWidth: '110px' }}
                                        value={summaryDept}
                                        onChange={(e) => handleDeptSummaryChange(e.target.value)}
                                    >
                                        <option value="">All Teams</option>
                                        {departments.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {summaryLoading ? (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Regenerating summary aggregates...</div>
                            ) : weeklySummary ? (
                                <>
                                    <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: '1.6', backgroundColor: 'var(--bg-primary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        {weeklySummary.summary}
                                    </div>
                                    
                                    {showSummaryTrace && weeklySummary.traceability && (
                                        <div style={{
                                            borderTop: '1px solid var(--border)',
                                            paddingTop: '10px',
                                            marginTop: '10px',
                                            fontSize: '0.7rem',
                                            color: 'var(--text-secondary)',
                                            fontFamily: 'var(--font-mono)',
                                            lineHeight: '1.4'
                                        }}>
                                            <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '4px' }}>DATABASE SNAPSHOT INPUT TRACE:</div>
                                            <div>• Target Department: {weeklySummary.traceability.department || 'Organization-wide'}</div>
                                            <div>• Tasks Completion: {weeklySummary.traceability.completed_tasks} completed / {weeklySummary.traceability.total_tasks} total ({weeklySummary.traceability.completion_rate_percent}%)</div>
                                            <div>• Active / Overdue Tasks: {weeklySummary.traceability.in_progress_tasks} in-progress / {weeklySummary.traceability.overdue_tasks} overdue</div>
                                            <div>• Workload Risks: {weeklySummary.traceability.high_risk_count} High / {weeklySummary.traceability.medium_risk_count} Medium / {weeklySummary.traceability.low_risk_count} Low</div>
                                            <div>• Total Meeting Commitment: {weeklySummary.traceability.total_meeting_hours} hours</div>
                                            <div>• Trend Status: {weeklySummary.traceability.trend_analysis_status}</div>
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>

                        {/* Agent 4: Early Warnings Alerts Panel */}
                        <div className="panel-card">
                            <h3 className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span><i className="fa-solid fa-triangle-exclamation"></i> Early-Warning Alerts</span>
                                <button 
                                    onClick={() => setShowWarningTrace(!showWarningTrace)}
                                    className="btn-action" 
                                    style={{ fontSize: '0.65rem', padding: '2px 6px', textTransform: 'none' }}
                                >
                                    {showWarningTrace ? 'Hide Thresholds' : 'Show Rules'}
                                </button>
                            </h3>

                            {showWarningTrace && earlyWarnings && (
                                <div style={{
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px',
                                    marginBottom: '12px',
                                    fontSize: '0.7rem',
                                    fontFamily: 'var(--font-mono)',
                                    lineHeight: '1.4',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' }}>ALERT THRESHOLDS RUNNING:</div>
                                    <div>1. High Workload: utilization &gt; {aiConfig.WORKLOAD_THRESHOLD_HIGH}%</div>
                                    <div>2. Deadline Risk: task progress &lt; {aiConfig.PROGRESS_RISK_THRESHOLD}% and remaining days &lt;= {aiConfig.DEADLINE_URGENCY_DAYS}d</div>
                                    <div>3. Meeting Overload: meeting hours &gt; {aiConfig.MEETING_OVERLOAD_PCT}% available work hours</div>
                                    <div>4. Available Buffer: utilization &lt; {aiConfig.WORKLOAD_THRESHOLD_LOW}%</div>
                                </div>
                            )}

                            {earlyWarnings ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* High Workload Alerts */}
                                    {earlyWarnings.high_workload.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                                                High Workload Risk ({earlyWarnings.high_workload.length})
                                            </div>
                                            {earlyWarnings.high_workload.slice(0, 3).map(alert => (
                                                <div key={alert.employee_id} style={{ fontSize: '0.8rem', padding: '6px 10px', borderLeft: '3px solid var(--danger)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', marginBottom: '4px' }}>
                                                    <strong>{alert.employee_name}</strong>: {alert.description}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Deadline Risks */}
                                    {earlyWarnings.deadline_risk.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                                                Task Deadline Risk ({earlyWarnings.deadline_risk.length})
                                            </div>
                                            {earlyWarnings.deadline_risk.slice(0, 3).map(alert => (
                                                <div key={alert.employee_id} style={{ fontSize: '0.8rem', padding: '6px 10px', borderLeft: '3px solid var(--warning)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', marginBottom: '4px' }}>
                                                    <strong>{alert.employee_name}</strong>: {alert.description}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Meeting Overloads */}
                                    {earlyWarnings.meeting_overload.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                                                Meeting Fatigue Overload ({earlyWarnings.meeting_overload.length})
                                            </div>
                                            {earlyWarnings.meeting_overload.slice(0, 3).map(alert => (
                                                <div key={alert.employee_id} style={{ fontSize: '0.8rem', padding: '6px 10px', borderLeft: '3px solid var(--info)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', marginBottom: '4px' }}>
                                                    <strong>{alert.employee_name}</strong>: {alert.description}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scanning database records...</div>
                            )}
                        </div>

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
                    </div>
                </div>
            </div>
        );
    }

    // ==================== RENDER EMPLOYEE PORTAL ====================
    if (currentRole === 'employee' && employeeData) {
        const {
            utilization_percent,
            workload_risk,
            completed_tasks,
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

                        {/* Agent 5 prioritizer results */}
                        <div className="ai-insight-box">
                            <div className="ai-insight-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><i className="fa-solid fa-wand-magic-sparkles"></i> AI Prioritization Assistant</span>
                                {employeeAiTrace && (
                                    <button 
                                        onClick={() => setShowEmployeeAiTrace(!showEmployeeAiTrace)}
                                        className="btn-action" 
                                        style={{ fontSize: '0.65rem', padding: '2px 6px', textTransform: 'none' }}
                                    >
                                        {showEmployeeAiTrace ? 'Hide Trace' : 'Trace Calculation'}
                                    </button>
                                )}
                            </div>
                            <div className="ai-insight-text" style={{ marginBottom: showEmployeeAiTrace ? '10px' : '0' }}>
                                {employeeAiRecommend || 'Calculating priorities...'}
                            </div>

                            {showEmployeeAiTrace && employeeAiTrace && (
                                <div style={{
                                    borderTop: '1px solid var(--border)',
                                    paddingTop: '8px',
                                    fontSize: '0.7rem',
                                    fontFamily: 'var(--font-mono)',
                                    color: 'var(--text-secondary)',
                                    lineHeight: '1.4'
                                }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '2px' }}>SCORING TRACE LOGS:</div>
                                    <div>• Formula: {employeeAiTrace.formula}</div>
                                    <div>• Total Priority Score: {employeeAiTrace.score.toFixed(1)} pts</div>
                                    <div>• Priority Factor Weight: {employeeAiTrace.breakdown.priority_component.toFixed(1)} pts</div>
                                    <div>• Deadline Urgency Factor: {employeeAiTrace.breakdown.deadline_component.toFixed(1)} pts</div>
                                    <div>• Complexity Factor Weight: {employeeAiTrace.breakdown.complexity_component.toFixed(1)} pts</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
