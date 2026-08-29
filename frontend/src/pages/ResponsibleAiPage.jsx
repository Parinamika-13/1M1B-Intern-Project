import React from 'react';

export default function ResponsibleAiPage() {
    return (
        <div className="tab-view animate-fade-in">
            <div className="panel-card" style={{ marginBottom: '30px', lineHeight: '1.6' }}>
                <h2 className="text-heading font-serif" style={{ marginBottom: '16px', color: 'var(--accent)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-scale-balanced"></i> Responsible AI Blueprint & Privacy Guide
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                    This workforce management platform is designed with an <strong>Augmentation, Not Automation</strong> core philosophy. It serves to protect employees from overload and support operations managers—it does not automate punitive measures or conduct covert performance grading.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '24px' }}>
                    <div style={{ padding: '4px' }}>
                        <h3 className="font-sans" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-eye-slash" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}></i> Privacy First (No Surveillance)
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            The system calculates workload using explicit project structures: logged tasks, estimated complexities, and calendar meetings. It does not monitor keyboard strokes, screenshot histories, desktop video feeds, or screen time. Employee activity tracking is strictly limited to work artifacts.
                        </p>
                    </div>
                    <div style={{ padding: '4px' }}>
                        <h3 className="font-sans" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-circle-info" style={{ color: 'var(--success)', fontSize: '0.95rem' }}></i> Explainable Risk Indicators
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            All workload estimates and risk indicators (Low/Medium/High) clearly list their underlying calculations (such as task deadlines, complex backlogs, and total meetings hours). AI never outputs a judgment without detailing exactly which data metrics led to that analysis.
                        </p>
                    </div>
                    <div style={{ padding: '4px', marginTop: '8px' }}>
                        <h3 className="font-sans" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-user-check" style={{ color: 'var(--info)', fontSize: '0.95rem' }}></i> Human-in-the-loop Agency
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            AI recommendations are strictly advisory. Managers remain fully responsible for assigning tasks and adjusting team schedules. AI suggestions can be accepted, rejected, or modified at any point.
                        </p>
                    </div>
                    <div style={{ padding: '4px', marginTop: '8px' }}>
                        <h3 className="font-sans" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--warning)', fontSize: '0.95rem' }}></i> Prototype Limitations
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            Metrics such as the <strong>Sustainable Work Index</strong> are conceptual prototypes meant for organization research and planning. They are not validated indicators of individual performance, nor should they be used for HR reviews.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
