import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function ResponsibleAiPage() {
    const [employees, setEmployees] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedSection, setExpandedSection] = useState(null);

    useEffect(() => {
        const fetchGovernanceData = async () => {
            setLoading(true);
            try {
                const [employeesList, tasksList] = await Promise.all([
                    apiService.getEmployees(),
                    apiService.getTasks()
                ]);
                setEmployees(employeesList);
                setTasks(tasksList);
            } catch (err) {
                console.error('Failed to load governance metrics:', err);
                setError('Failed to fetch governance diagnostics.');
            } finally {
                setLoading(false);
            }
        };

        fetchGovernanceData();
    }, []);

    if (loading) {
        return <div style={{ color: 'var(--text-secondary)', padding: '24px', fontSize: '0.875rem' }}>Loading Governance Center...</div>;
    }

    if (error) {
        return <div style={{ color: 'var(--danger)', padding: '24px', fontSize: '0.875rem' }}>{error}</div>;
    }

    // ==================== GOVERNANCE CALCULATIONS ====================
    const deptsGroup = {};
    employees.forEach(emp => {
        const d = emp.department || 'General';
        if (!deptsGroup[d]) {
            deptsGroup[d] = { sumWorkload: 0, headcount: 0, completedTasks: 0, totalTasks: 0 };
        }
        deptsGroup[d].sumWorkload += emp.utilization_percent || 0;
        deptsGroup[d].headcount += 1;
    });

    tasks.forEach(task => {
        const emp = employees.find(e => e.employee_id === task.employee_id);
        const d = emp ? emp.department : 'General';
        if (deptsGroup[d]) {
            deptsGroup[d].totalTasks += 1;
            if (task.status === 'Completed' || task.status === 'Done') {
                deptsGroup[d].completedTasks += 1;
            }
        }
    });

    const deptsGovernance = Object.keys(deptsGroup).map(dept => {
        const data = deptsGroup[dept];
        const avgWorkload = data.headcount > 0 ? Math.round(data.sumWorkload / data.headcount) : 0;
        const completionRate = data.totalTasks > 0 ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0;
        return {
            name: dept,
            avgWorkload,
            completionRate,
            headcount: data.headcount
        };
    }).sort((a, b) => b.avgWorkload - a.avgWorkload);

    return (
        <div className="tab-view animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Top Title Block */}
            <div className="panel-card" style={{ padding: '24px' }}>
                <h2 className="panel-title" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <i className="fa-solid fa-scale-balanced" style={{ color: 'var(--accent)' }}></i>
                    Responsible AI & Algorithmic Governance Center
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '6px', marginBottom: 0 }}>
                    Ensuring algorithmic transparency, workload distribution fairness, and human oversight for automated prioritization systems.
                </p>
            </div>

            {/* AI Governance Checklist Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div className="metric-card" style={{ padding: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Explainability</span>
                        <span className="badge" style={{ fontSize: '0.6rem', backgroundColor: 'rgba(79, 122, 92, 0.1)', color: 'var(--success)', borderColor: 'var(--success)' }}>
                            Implemented
                        </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Trace logs are available for all employee priority equations.</p>
                </div>

                <div className="metric-card" style={{ padding: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Human Oversight</span>
                        <span className="badge" style={{ fontSize: '0.6rem', backgroundColor: 'rgba(79, 122, 92, 0.1)', color: 'var(--success)', borderColor: 'var(--success)' }}>
                            Active
                        </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>All recommendations require manual manager verification.</p>
                </div>

                <div className="metric-card" style={{ padding: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Data Minimization</span>
                        <span className="badge" style={{ fontSize: '0.6rem', backgroundColor: 'rgba(79, 122, 92, 0.1)', color: 'var(--success)', borderColor: 'var(--success)' }}>
                            Configured
                        </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Tracks only tasks and meetings. No background monitoring.</p>
                </div>

                <div className="metric-card" style={{ padding: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Fairness Controls</span>
                        <span className="badge" style={{ fontSize: '0.6rem', backgroundColor: 'rgba(185, 130, 47, 0.1)', color: 'var(--warning)', borderColor: 'var(--warning)' }}>
                            Under Review
                        </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Monitoring workload variance between departments dynamically.</p>
                </div>
            </div>

            {/* Visual Decision Flowchart */}
            <div className="panel-card" style={{ padding: '24px' }}>
                <h3 className="panel-title" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                    <i className="fa-solid fa-route" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                    Workload Decision Flow Transparency
                </h3>
                
                <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    justifyContent: 'space-between', 
                    alignItems: 'stretch',
                    gap: '16px',
                    position: 'relative'
                }}>
                    <div style={{ flex: '1 1 180px', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>1. INPUT DATA</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Firestore Collections</div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Logs tasks, meeting schedules, and target deadlines.</p>
                    </div>

                    <div style={{ flex: '1 1 180px', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>2. RISK METRICS</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Formula Heuristics</div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Evaluates weekly utilization % and deadline congestion factors.</p>
                    </div>

                    <div style={{ flex: '1 1 180px', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>3. SYSTEM SIGNAL</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI Early Warning</div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Generates potential stress, backlog, and scheduling recommendations.</p>
                    </div>

                    <div style={{ flex: '1 1 180px', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>4. HUMAN ACTION</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Manager Override</div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Manager reviews evidence, alters priority, and re-allocates task splits.</p>
                    </div>
                </div>
            </div>

            {/* Fairness and bias monitoring chart section */}
            <div className="panel-card" style={{ padding: '24px' }}>
                <h3 className="panel-title" style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                    <i className="fa-solid fa-chart-bar" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                    Workload Fairness Monitoring (By Department)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '20px', margin: 0 }}>
                    We track task distribution variance and workload utilization across departments to avoid resource planning bias.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {deptsGovernance.map(dept => (
                        <div key={dept.name} style={{
                            border: '1px solid var(--border)',
                            padding: '14px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-primary)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{dept.name} Department</strong>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>Headcount: {dept.headcount} staff</span>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    <span>Avg. Workload: <strong style={{ color: 'var(--accent)' }}>{dept.avgWorkload}%</strong></span>
                                    <span>Task Completion: <strong>{dept.completionRate}%</strong></span>
                                </div>
                            </div>
                            <div className="progress-track" style={{ height: '8px' }}>
                                <div className="progress-bar" style={{ backgroundColor: 'var(--accent)', width: `${dept.avgWorkload}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Safety Principles */}
            <div className="panel-card" style={{ padding: '24px' }}>
                <h3 className="panel-title" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                    <i className="fa-solid fa-shield-halved" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                    Core AI Safety & Governance Principles
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <i className="fa-solid fa-eye" style={{ color: 'var(--accent)' }}></i> Transparent
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                            Complete algorithmic visibility into all inputs, weights, and scoring calculations with audit trace logs.
                        </p>
                    </div>
                    <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <i className="fa-solid fa-lock" style={{ color: 'var(--accent)' }}></i> Privacy-conscious
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                            Saves zero keystrokes, chat recordings, or intrusive background telemetry. Focuses strictly on work tasks.
                        </p>
                    </div>
                    <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <i className="fa-solid fa-scale-balanced" style={{ color: 'var(--accent)' }}></i> Fair & Balanced
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                            Monitors resource distributions between departments dynamically to prevent work allocation biases.
                        </p>
                    </div>
                    <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <i className="fa-solid fa-user-gear" style={{ color: 'var(--accent)' }}></i> Human-centered
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                            Empowers employee-driven prioritization. AI serves as decision support, not an automated manager.
                        </p>
                    </div>
                    <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <i className="fa-solid fa-file-code" style={{ color: 'var(--accent)' }}></i> Explainable
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                            Provides readable formulas and trace logic logs in plain english for all recommendations.
                        </p>
                    </div>
                    <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <i className="fa-solid fa-database" style={{ color: 'var(--accent)' }}></i> Data-driven
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                            Avoids black-box LLM hallucinations. All recommendations derive cleanly from verifiable Firestore data.
                        </p>
                    </div>
                </div>
            </div>

            {/* AI Decision Boundary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <div className="panel-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--success)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-circle-check"></i> AI Permitted Boundary (AI CAN)
                    </h3>
                    <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.8', margin: 0 }}>
                        <li>Summarize workload patterns & weekly utilization indexes</li>
                        <li>Identify delivery bottleneck patterns and deadline congestion</li>
                        <li>Suggest optimal backlog task prioritizations</li>
                        <li>Highlight possible workload stress risks</li>
                        <li>Aggregate scheduled meeting and task hour statistics</li>
                    </ul>
                </div>

                <div className="panel-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-circle-xmark"></i> AI Restrictive Boundary (AI SHOULD NOT)
                    </h3>
                    <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.8', margin: 0 }}>
                        <li style={{ textDecoration: 'line-through' }}>Make hiring or firing decisions</li>
                        <li style={{ textDecoration: 'line-through' }}>Automate performance promotions or reviews</li>
                        <li style={{ textDecoration: 'line-through' }}>Infer sensitive personal character traits</li>
                        <li style={{ textDecoration: 'line-through' }}>Conduct intrusive employee background tracking</li>
                        <li style={{ textDecoration: 'line-through' }}>Override final manager or human workspace overrides</li>
                    </ul>
                </div>
            </div>

            {/* Human Oversight & Prototype limitations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div className="panel-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-user-check" style={{ color: 'var(--accent)' }}></i> Human-in-the-loop Agency
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.6', margin: 0 }}>
                        All automated insights are informational. The platform serves as decision support, and managers maintain complete agency to override any priority calculation or allocate tasks as required by the business.
                    </p>
                </div>

                <div className="panel-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--warning)' }}></i> Prototype Limitations
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.6', margin: 0 }}>
                        Metrics such as Workload Risk and Stress Signals are estimates evaluated from logged tasks and scheduled meetings. They are not metrics for employee evaluation or official performance feedback.
                    </p>
                </div>
            </div>

            {/* Audit & Explainability Accordion */}
            <div className="panel-card" style={{ padding: '24px' }}>
                <h3 className="panel-title" style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
                    <i className="fa-solid fa-list-check" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                    Algorithmic Explainability Index
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <button 
                            onClick={() => setExpandedSection(expandedSection === 'workload' ? null : 'workload')}
                            style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <span>How Workload Risk is calculated</span>
                            <i className={`fa-solid ${expandedSection === 'workload' ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                        </button>
                        {expandedSection === 'workload' && (
                            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                <strong>Utilization Formula:</strong> Sum of active task estimated hours + meeting hours, divided by available baseline capacity (normally 40 hrs).
                                <div style={{ marginTop: '8px' }}>
                                    <strong>Risk Classification Levels:</strong>
                                    <ul>
                                        <li>High Risk: &gt; 110% utilization. Indicated by a red badge alert.</li>
                                        <li>Medium Risk: 80% to 110% utilization. Indicated by an orange badge.</li>
                                        <li>Low Risk: &lt; 80% utilization. Indicated by a green badge.</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <button 
                            onClick={() => setExpandedSection(expandedSection === 'priority' ? null : 'priority')}
                            style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <span>How Task Priority is determined</span>
                            <i className={`fa-solid ${expandedSection === 'priority' ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                        </button>
                        {expandedSection === 'priority' && (
                            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                <strong>Priority Score Heuristic:</strong> Sum of baseline values assigned based on task complexity (Low: 1, Medium: 2, High: 3) and deadline urgency:
                                <div style={{ marginTop: '8px' }}>
                                    <code>Score = Complexity_Weight + Max(0, 10 - Days_Remaining)</code>
                                </div>
                                <div style={{ marginTop: '8px' }}>
                                    This ensures tasks with approaching deadlines are prioritized and sorted at the top of the workspace lists.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
