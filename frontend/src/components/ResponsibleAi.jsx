import React from 'react';

export default function ResponsibleAi() {
    return (
        <div className="tab-view">
            <div className="panel-card" style={{ marginBottom: '30px' }}>
                <h2 className="text-outfit" style={{ marginBottom: '15px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-scale-balanced"></i> Responsible AI Blueprint & Privacy Guard
                </h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
                    This workforce management platform is designed with an <strong>Augmentation, Not Automation</strong> core philosophy. It serves to protect employees from overload and support operations managers—it does not automate punitive measures or conduct covert performance grading.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '30px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-eye-slash" style={{ color: 'var(--accent-purple)' }}></i> Privacy First (No Surveillance)
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            The system calculates workload using explicit project structures: logged tasks, estimated complexities, and calendar meetings. It does not monitor keyboard strokes, screenshot histories, desktop video feeds, or screen time. Employee activity tracking is strictly limited to work artifacts.
                        </p>
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-circle-info" style={{ color: 'var(--color-low)' }}></i> Explainable Risk Indicators
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            All workload estimates and risk indicators (Low/Medium/High) clearly list their underlying calculations (such as task deadlines, complex backlogs, and total meetings hours). AI never outputs a judgment without detailing exactly which data metrics led to that analysis.
                        </p>
                    </div>
                    <div style={{ marginTop: '15px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-user-check" style={{ color: 'var(--accent-blue)' }}></i> Human-in-the-loop Agency
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            AI recommendations are strictly advisory. Managers remain fully responsible for assigning tasks and adjusting team schedules. AI suggestions can be accepted, rejected, or modified at any point.
                        </p>
                    </div>
                    <div style={{ marginTop: '15px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-square-poll-vertical" style={{ color: 'var(--color-medium)' }}></i> Prototype Context
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Metrics such as the <strong>Sustainable Work Index</strong> (Phase 3) are conceptual prototypes meant for organization research and planning. They are not validated indicators of individual performance, nor should they be used for HR reviews.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
