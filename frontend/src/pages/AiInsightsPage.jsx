import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function AiInsightsPage({ role, currentUser }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Manager dashboard data states
    const [employees, setEmployees] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [projects, setProjects] = useState([]);
    const [earlyWarnings, setEarlyWarnings] = useState(null);
    const [weeklySummary, setWeeklySummary] = useState(null);
    
    // Employee specific insights states
    const [employeeData, setEmployeeData] = useState(null);
    const [employeeDetail, setEmployeeDetail] = useState(null);

    // View state
    const [summaryDept, setSummaryDept] = useState('');
    const [departments, setDepartments] = useState([]);
    const [hoveredSlice, setHoveredSlice] = useState(null);

    // Employee Q&A states
    const [question, setQuestion] = useState('');
    const [chatLog, setChatLog] = useState([
        { 
            sender: 'ai', 
            text: "Hello! I'm your Sustainable Work AI Assistant. I can help you understand your workload, prioritize tasks, and plan around your meetings." 
        }
    ]);
    const [askLoading, setAskLoading] = useState(false);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!currentUser?.employee_id) {
                setError('No associated employee ID was found for this user session.');
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                if (role === 'manager') {
                    const [
                        employeesList,
                        tasksList,
                        meetingsList,
                        projectsList,
                        warnings,
                        summary,
                        depts
                    ] = await Promise.all([
                        apiService.getEmployees(),
                        apiService.getTasks(),
                        apiService.getMeetings(),
                        apiService.getProjects(),
                        apiService.getEarlyWarnings(),
                        apiService.getWeeklySummary(''),
                        apiService.getDepartments()
                    ]);
                    setEmployees(employeesList);
                    setTasks(tasksList);
                    setMeetings(meetingsList);
                    setProjects(projectsList);
                    setEarlyWarnings(warnings);
                    setWeeklySummary(summary);
                    setDepartments(depts);
                } else {
                    // Employee Portal load
                    const [dash, det] = await Promise.all([
                        apiService.getEmployeeDashboard(currentUser.employee_id),
                        apiService.getEmployeeDetails(currentUser.employee_id)
                    ]);
                    setEmployeeData(dash);
                    setEmployeeDetail(det);
                }
            } catch (err) {
                console.error('Failed to load AI Insights:', err);
                setError(`Failed to fetch AI diagnostics: ${err.message || err}`);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [role, currentUser]);

    const handleDeptChange = async (dept) => {
        setSummaryDept(dept);
        setLoading(true);
        try {
            const summary = await apiService.getWeeklySummary(dept);
            setWeeklySummary(summary);
        } catch (e) {
            console.error('Failed to load summary:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAskQuestion = async (e, customQ = '') => {
        if (e) e.preventDefault();
        const userQ = customQ ? customQ.trim() : question.trim();
        if (!userQ || !currentUser?.employee_id) return;

        setChatLog(prev => [...prev, { sender: 'user', text: userQ }]);
        if (!customQ) setQuestion('');
        setAskLoading(true);

        try {
            const result = await apiService.askEmployeeAssistant(currentUser.employee_id, userQ);
            setChatLog(prev => [...prev, { 
                sender: 'ai', 
                text: result.response,
                trace: result.traceability
            }]);
        } catch (err) {
            console.error(err);
            setChatLog(prev => [...prev, { sender: 'ai', text: 'Error connecting to the Sustainable Work AI service.' }]);
        } finally {
            setAskLoading(false);
        }
    };

    if (loading && chatLog.length <= 1) {
        return <div style={{ color: 'var(--text-secondary)', padding: '24px', fontSize: '0.875rem' }}>Loading AI Assistant & Insights...</div>;
    }

    if (error) {
        return (
            <div style={{ padding: '24px' }}>
                <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>
                <button className="btn-primary" onClick={() => window.location.reload()}>Try Again</button>
            </div>
        );
    }

    // ==================== MANAGER PORTAL DETAILS ====================
    let avgWorkload = 0;
    let highRiskCount = 0;
    let medRiskCount = 0;
    let lowRiskCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let totalMeetingHours = 0;

    if (role === 'manager' && employees.length > 0) {
        let sumWorkload = 0;
        employees.forEach(emp => {
            sumWorkload += emp.utilization_percent || 0;
            if (emp.workload_risk === 'High') highRiskCount++;
            else if (emp.workload_risk === 'Medium') medRiskCount++;
            else lowRiskCount++;
        });
        avgWorkload = Math.round(sumWorkload / employees.length);

        tasks.forEach(task => {
            const isCompleted = task.status === 'Completed' || task.status === 'Done';
            const days = parseInt(task.deadline_days_remaining) || 0;
            if (!isCompleted) {
                if (days <= 0) overdueCount++;
                else if (days <= 3) upcomingCount++;
            }
        });

        meetings.forEach(meet => {
            totalMeetingHours += (parseFloat(meet.duration_minutes) || 0) / 60.0;
        });
    }

    const totalHeadcount = employees.length;
    const avgMeetingBurden = totalHeadcount > 0 ? Math.round((totalMeetingHours / totalHeadcount) * 10) / 10 : 0;

    // SVG Donut slices for Risk distribution
    const slices = [
        { name: 'High Risk', count: highRiskCount, color: 'var(--danger)', class: 'High' },
        { name: 'Medium Risk', count: medRiskCount, color: 'var(--warning)', class: 'Medium' },
        { name: 'Low Risk', count: lowRiskCount, color: 'var(--success)', class: 'Low' }
    ].filter(s => s.count > 0);

    const totalRiskCount = lowRiskCount + medRiskCount + highRiskCount;
    let accumulatedPercent = 0;
    const riskSlices = slices.map((slice) => {
        const percent = totalRiskCount > 0 ? slice.count / totalRiskCount : 0;
        const strokeDasharray = `${percent * 314.159} 314.159`;
        const strokeDashoffset = `${-accumulatedPercent * 314.159}`;
        accumulatedPercent += percent;
        return {
            ...slice,
            percent: Math.round(percent * 100),
            strokeDasharray,
            strokeDashoffset
        };
    });

    const activeRiskDetails = hoveredSlice !== null ? riskSlices[hoveredSlice] : {
        name: 'Total Scanned',
        count: totalRiskCount,
        percent: 100,
        color: 'var(--accent)'
    };

    // Manager Recommendations
    const managerRecommendations = [];
    if (role === 'manager' && employees.length > 0) {
        if (highRiskCount > 0) {
            const topOverloaded = [...employees]
                .sort((a, b) => b.utilization_percent - a.utilization_percent)
                .slice(0, 3)
                .map(e => `${e.employee_name} (${e.utilization_percent}%)`);
            managerRecommendations.push({
                severity: 'Critical',
                title: 'High Workload Stress Alert',
                desc: `Workforce diagnostics identify ${highRiskCount} team members operating above critical limits.`,
                evidence: `Top overloaded: ${topOverloaded.join(', ')}.`,
                why: 'Prolonged utilization exceeding 110% correlates heavily with cognitive fatigue, increased task delivery errors, and potential burnout risks.',
                action: 'Trigger the Task Assignment Allocator to balance backlog assignments to available buffer segments.'
            });
        }

        const meetingOverloaded = earlyWarnings?.meeting_overload?.length || 0;
        if (meetingOverloaded > 0) {
            managerRecommendations.push({
                severity: 'High',
                title: 'Team Calendar Fatigue Detected',
                desc: `${meetingOverloaded} employees spend over 30% of their available weekly capacity in synchronous meetings.`,
                evidence: `Average organization meeting burden: ${avgMeetingBurden} hrs/week.`,
                why: 'Excessive meeting hours block deep focus periods, forcing staff to absorb core deliverables as overtime work.',
                action: 'Institute a department-wide focus window and restrict status-sync meetings to async status boards.'
            });
        }
    }

    // ==================== EMPLOYEE PORTAL INSIGHTS CALCULATIONS ====================
    let empTaskHours = 0;
    let empMeetingHours = 0;
    let empActiveTasks = [];
    let topPriorityTask = null;
    
    if (role === 'employee' && employeeData) {
        empActiveTasks = (employeeData.tasks || []).filter(t => t.status !== 'Completed' && t.status !== 'Done');
        empTaskHours = empActiveTasks.reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0), 0);
        empMeetingHours = (employeeData.meetings || []).reduce((sum, m) => sum + (parseFloat(m.duration_minutes) || 0) / 60.0, 0);

        // Resolve top focus priority task
        const sortedPriorities = [...empActiveTasks].sort((a, b) => {
            if (a.priority === 'High' && b.priority !== 'High') return -1;
            if (a.priority !== 'High' && b.priority === 'High') return 1;
            return (parseInt(a.deadline_days_remaining) || 0) - (parseInt(b.deadline_days_remaining) || 0);
        });
        if (sortedPriorities.length > 0) {
            topPriorityTask = sortedPriorities[0];
        }
    }

    const suggestedPrompts = [
        "What should I prioritize today?",
        "Am I overloaded?",
        "Which deadlines need attention?",
        "How is my workload?",
        "What should I focus this week?"
    ];

    // Status styling helpers
    const getWorkloadRiskColor = (risk) => {
        if (risk === 'High' || risk === 'Overloaded') return 'var(--danger)';
        if (risk === 'Medium') return 'var(--warning)';
        return 'var(--success)';
    };

    return (
        <div className="tab-view animate-fade-in">
            {role === 'manager' ? (
                // ==================== MANAGER VIEW ====================
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="panel-card" style={{ padding: '24px' }}>
                        <h2 className="panel-title" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                            <i className="fa-solid fa-brain" style={{ color: 'var(--accent)' }}></i>
                            AI Workforce Insights & Analytics
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '6px', marginBottom: 0 }}>
                            Analyzes workload densities, task progress indicators, deadline constraints, meeting hours, and department resourcing patterns using live Firestore registers.
                        </p>
                    </div>

                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        <div className="metric-card" style={{ padding: '16px' }}>
                            <div className="metric-title" style={{ fontSize: '0.75rem' }}>Avg. Workload</div>
                            <div className="metric-value font-mono" style={{ color: 'var(--accent)', fontSize: '1.75rem', margin: '6px 0' }}>{avgWorkload}%</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target: 80% - 110%</div>
                        </div>

                        <div className="metric-card" style={{ padding: '16px' }}>
                            <div className="metric-title" style={{ fontSize: '0.75rem' }}>High Risk Team</div>
                            <div className="metric-value font-mono" style={{ color: highRiskCount > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '1.75rem', margin: '6px 0' }}>{highRiskCount}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overloaded headcounts</div>
                        </div>

                        <div className="metric-card" style={{ padding: '16px' }}>
                            <div className="metric-title" style={{ fontSize: '0.75rem' }}>Overdue Tasks</div>
                            <div className="metric-value font-mono" style={{ color: overdueCount > 0 ? 'var(--danger)' : 'var(--text-secondary)', fontSize: '1.75rem', margin: '6px 0' }}>{overdueCount}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Missed target lines</div>
                        </div>

                        <div className="metric-card" style={{ padding: '16px' }}>
                            <div className="metric-title" style={{ fontSize: '0.75rem' }}>Congested Deadlines</div>
                            <div className="metric-value font-mono" style={{ color: upcomingCount > 0 ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '1.75rem', margin: '6px 0' }}>{upcomingCount}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Due in &lt;= 3 days</div>
                        </div>

                        <div className="metric-card" style={{ padding: '16px' }}>
                            <div className="metric-title" style={{ fontSize: '0.75rem' }}>Avg. Meetings</div>
                            <div className="metric-value font-mono" style={{ color: 'var(--accent)', fontSize: '1.75rem', margin: '6px 0' }}>{avgMeetingBurden}h</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weekly hours per person</div>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="panel-card" style={{ padding: '24px' }}>
                        <h3 className="panel-title" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                            <i className="fa-solid fa-chart-pie" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                            Workload Stress & Risk Distribution
                        </h3>

                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '40px' }}>
                            {/* Donut */}
                            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                                <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                                    <circle cx="100" cy="100" r="50" fill="transparent" stroke="var(--border)" strokeWidth="14" />
                                    {riskSlices.map((slice, idx) => (
                                        <circle
                                            key={slice.name}
                                            cx="100"
                                            cy="100"
                                            r="50"
                                            fill="transparent"
                                            stroke={slice.color}
                                            strokeWidth={hoveredSlice === idx ? '20' : '14'}
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
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    textAlign: 'center',
                                    pointerEvents: 'none',
                                    width: '100px'
                                }}>
                                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                        {activeRiskDetails.name}
                                    </div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
                                        {activeRiskDetails.count}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                        {activeRiskDetails.percent}%
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '240px' }}>
                                {riskSlices.map((slice, idx) => (
                                    <div 
                                        key={slice.name}
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            padding: '10px 14px', 
                                            borderRadius: 'var(--radius-sm)',
                                            border: hoveredSlice === idx ? `1px solid ${slice.color}` : '1px solid var(--border)',
                                            backgroundColor: hoveredSlice === idx ? 'var(--bg-primary)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={() => setHoveredSlice(idx)}
                                        onMouseLeave={() => setHoveredSlice(null)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: slice.color }}></span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{slice.name}</span>
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }} className="font-mono">{slice.count} ({slice.percent}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* manager recommendations */}
                    {managerRecommendations.length > 0 && (
                        <div className="panel-card" style={{ padding: '24px' }}>
                            <h3 className="panel-title" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                                <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                                AI-Engine Tactical Recommendations
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {managerRecommendations.map((rec, index) => (
                                    <div key={index} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '18px', backgroundColor: 'var(--bg-primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{rec.title}</h4>
                                            <span className="badge badge-high">{rec.severity}</span>
                                        </div>
                                        <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{rec.desc}</p>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong>Evidence:</strong> {rec.evidence}</div>
                                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>Recommended Action: {rec.action}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // ==================== EMPLOYEE VIEW ====================
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Embedded Responsive Stylesheet */}
                    <style>{`
                        .assistant-layout-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 24px;
                            align-items: start;
                        }
                        @media (max-width: 900px) {
                            .assistant-layout-grid {
                                grid-template-columns: 1fr;
                            }
                        }
                        .assistant-insight-card {
                            border: 1px solid var(--border);
                            border-radius: var(--radius-md);
                            padding: 20px;
                            background-color: var(--surface);
                            transition: border-color 0.2s ease, transform 0.2s ease;
                        }
                        .assistant-insight-card:hover {
                            border-color: var(--accent);
                            transform: translateY(-2px);
                        }
                    `}</style>

                    {/* PAGE HEADER */}
                    <div className="panel-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <h2 className="panel-title" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                <i className="fa-solid fa-robot" style={{ color: 'var(--accent)' }}></i>
                                Sustainable Work AI Assistant
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                                Your intelligent companion for workload, priorities, meetings, and sustainable productivity.
                            </p>
                        </div>
                        <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, borderColor: 'var(--success)', color: 'var(--success)', backgroundColor: 'rgba(79, 122, 92, 0.08)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
                            AI Ready
                        </span>
                    </div>

                    {/* TWO-COLUMN GRID */}
                    <div className="assistant-layout-grid">
                        
                        {/* LEFT COLUMN: AI INSIGHTS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                                Dynamic Personal Analytics
                            </h3>

                            {/* Card 1: Workload Health */}
                            <div className="assistant-insight-card" style={{ borderLeft: `4px solid ${getWorkloadRiskColor(employeeData?.workload_risk)}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-gauge-high" style={{ color: getWorkloadRiskColor(employeeData?.workload_risk) }}></i>
                                        Workload Health
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: getWorkloadRiskColor(employeeData?.workload_risk) }}>
                                        {employeeData?.workload_risk}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                                    Your active workload utilization indices compute to <strong>{Math.round(employeeData?.utilization_percent)}%</strong> based on currently logged commitments.
                                </p>
                            </div>

                            {/* Card 2: Priority Focus */}
                            <div className="assistant-insight-card" style={{ borderLeft: '4px solid var(--accent)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent)' }}></i>
                                        Priority Focus
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                                        {topPriorityTask ? topPriorityTask.priority : 'All Clear'}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                                    {topPriorityTask ? (
                                        <>
                                            Top deliverable focus: <strong>"{topPriorityTask.task_title}"</strong> (Complexity: {topPriorityTask.task_complexity}, due in {topPriorityTask.deadline_days_remaining}d).
                                        </>
                                    ) : (
                                        "No pending tasks are currently active. Your checklist is completely clear!"
                                    )}
                                </p>
                            </div>

                            {/* Card 3: Meeting Load */}
                            <div className="assistant-insight-card" style={{ borderLeft: empMeetingHours > 8 ? '4px solid var(--warning)' : '4px solid var(--accent)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-video" style={{ color: empMeetingHours > 8 ? 'var(--warning)' : 'var(--accent)' }}></i>
                                        Meeting Load
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: empMeetingHours > 8 ? 'var(--warning)' : 'var(--accent)' }}>
                                        {empMeetingHours.toFixed(1)} hrs
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                                    Scheduled meeting hours account for <strong>{Math.round((empMeetingHours / (employeeDetail?.available_hours_per_week || 40.0)) * 100)}%</strong> of your baseline available work time this week.
                                </p>
                            </div>

                            {/* Card 4: Productivity Insight */}
                            <div className="assistant-insight-card" style={{ borderLeft: '4px solid var(--accent)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-chart-line" style={{ color: 'var(--accent)' }}></i>
                                        Productivity Insight
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                                        {Math.round(employeeData?.completion_rate_percent)}%
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                                    Sprint performance index reveals <strong>{employeeData?.completed_tasks} completed milestones</strong> out of {employeeData?.tasks?.length || 0} total tasks.
                                </p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: AI CHAT */}
                        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(79, 122, 92, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                        <i className="fa-solid fa-robot" style={{ color: 'var(--accent)', fontSize: '1rem' }}></i>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sustainable Assistant</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Decision support engine</div>
                                    </div>
                                </div>
                                <span className="badge badge-low" style={{ fontSize: '0.65rem', padding: '3px 8px', borderColor: 'var(--success)', color: 'var(--success)', backgroundColor: 'rgba(79, 122, 92, 0.08)' }}>AI Ready</span>
                            </div>

                            {/* Chat history logs */}
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '16px',
                                backgroundColor: 'var(--bg-primary)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                marginBottom: '16px'
                            }}>
                                {chatLog.map((chat, idx) => (
                                    <div key={idx} style={{
                                        alignSelf: chat.sender === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%',
                                        backgroundColor: chat.sender === 'user' ? 'var(--accent)' : 'var(--surface)',
                                        color: chat.sender === 'user' ? '#fff' : 'var(--text-primary)',
                                        border: chat.sender === 'user' ? 'none' : '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '12px 14px',
                                        fontSize: '0.825rem',
                                        lineHeight: '1.5',
                                        boxShadow: chat.sender === 'user' ? 'none' : 'var(--shadow-sm)'
                                    }}>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{chat.text}</div>
                                        
                                        {chat.trace && (
                                            <details style={{ marginTop: '10px', fontSize: '0.725rem', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                                                <summary style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, listStyle: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="fa-solid fa-calculator" style={{ fontSize: '0.65rem' }}></i>
                                                    How this was calculated
                                                </summary>
                                                <div style={{ padding: '6px 0 0 0', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                    {chat.trace.score !== undefined ? (
                                                        <>
                                                            <div>• Scanned Tasks: {chat.trace.evaluated_tasks_count} items</div>
                                                            <div>• Total Scored Weight: {chat.trace.score.toFixed(1)} pts</div>
                                                            <div>• Urgency Factor: {chat.trace.breakdown?.deadline_component?.toFixed(1)} pts</div>
                                                            <div>• Complexity Weight: {chat.trace.breakdown?.complexity_component?.toFixed(1)} pts</div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div>• Workload Ratio: {chat.trace.utilization_percent}%</div>
                                                            <div>• Task backlogs: {chat.trace.active_task_hours} hrs</div>
                                                            <div>• Meetings commitment: {chat.trace.meeting_hours} hrs</div>
                                                        </>
                                                    )}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                ))}
                                {askLoading && (
                                    <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-circle-notch fa-spin"></i> Assistant is calculating metrics...
                                    </div>
                                )}
                            </div>

                            {/* Suggested Prompts Clickable Chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                {suggestedPrompts.map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className="btn-action"
                                        onClick={(e) => handleAskQuestion(e, prompt)}
                                        disabled={askLoading}
                                        style={{
                                            fontSize: '0.7rem',
                                            padding: '6px 12px',
                                            borderRadius: '16px',
                                            border: '1px solid var(--border)',
                                            textTransform: 'none',
                                            height: 'auto',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>

                            {/* Input Box */}
                            <form onSubmit={handleAskQuestion} style={{ display: 'flex', gap: '8px' }}>
                                <input 
                                    type="text" 
                                    className="input-control" 
                                    placeholder="Ask about your workload, priorities, or meetings..."
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    disabled={askLoading}
                                    style={{ flex: 1, borderRadius: '24px', paddingLeft: '16px' }}
                                />
                                <button type="submit" className="btn-primary" disabled={askLoading || !question.trim()} style={{ width: '80px', height: '40px', padding: '0', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    <i className="fa-solid fa-paper-plane" style={{ fontSize: '0.8rem' }}></i>
                                    Ask
                                </button>
                            </form>
                        </div>

                    </div>

                    {/* BOTTOM SECTION: HOW IT WORKS FLOW */}
                    <div className="panel-card" style={{ marginTop: '12px', padding: '24px' }}>
                        <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>
                            How your AI assistant works
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <i className="fa-solid fa-list-check" style={{ color: 'var(--accent)', marginRight: '6px' }}></i> Tasks
                                </div>
                                <div style={{ border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <i className="fa-solid fa-video" style={{ color: 'var(--accent)', marginRight: '6px' }}></i> Meetings
                                </div>
                                <div style={{ border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <i className="fa-solid fa-clock" style={{ color: 'var(--accent)', marginRight: '6px' }}></i> Deadlines
                                </div>
                                <div style={{ border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <i className="fa-solid fa-gauge-high" style={{ color: 'var(--accent)', marginRight: '6px' }}></i> Workload
                                </div>
                            </div>
                            <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-right-long"></i>
                            </div>
                            <div style={{ border: '1px solid var(--border)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(79, 122, 92, 0.08)', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700 }}>
                                <i className="fa-solid fa-brain" style={{ marginRight: '6px' }}></i> AI Analysis
                            </div>
                            <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-right-long"></i>
                            </div>
                            <div style={{ border: '1px solid var(--accent)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
                                <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '6px' }}></i> Personalized Recommendations
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
