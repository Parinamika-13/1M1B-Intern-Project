import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function MeetingsPage({ role, currentUser }) {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    useEffect(() => {
        const fetchMeetings = async () => {
            setLoading(true);
            try {
                const data = await apiService.getMeetings();
                if (role === 'employee' && currentUser?.employee_id) {
                    setMeetings(data.filter(m => m.employee_id === currentUser.employee_id));
                } else {
                    setMeetings(data);
                }
            } catch (err) {
                console.error('Failed to load meetings:', err);
                setError('Failed to load meetings calendar.');
            } finally {
                setLoading(false);
            }
        };

        fetchMeetings();
    }, [role, currentUser]);

    // Filter meetings
    let filteredMeetings = meetings;

    if (search) {
        const s = search.toLowerCase();
        filteredMeetings = filteredMeetings.filter(m => 
            m.meeting_title.toLowerCase().includes(s) || 
            m.employee_name.toLowerCase().includes(s) ||
            m.meeting_id.toLowerCase().includes(s)
        );
    }

    if (selectedType) {
        filteredMeetings = filteredMeetings.filter(m => m.attendance_type === selectedType);
    }

    if (selectedStatus) {
        filteredMeetings = filteredMeetings.filter(m => m.meeting_status === selectedStatus);
    }

    // Extract unique filters from actual data dynamically
    const uniqueTypes = [...new Set(meetings.map(m => m.attendance_type).filter(Boolean))].sort();
    const uniqueStatuses = [...new Set(meetings.map(m => m.meeting_status).filter(Boolean))].sort();

    // Schedule slot helper
    const getMeetingTime = (index) => {
        const times = ["09:00 AM", "10:30 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"];
        return times[index % times.length];
    };

    if (loading) {
        return <div style={{ color: 'var(--text-secondary)', padding: '24px', fontSize: '0.875rem' }}>Loading meetings calendar...</div>;
    }

    if (error) {
        return <div style={{ color: 'var(--danger)', padding: '24px', fontSize: '0.875rem' }}>{error}</div>;
    }

    return (
        <div className="tab-view animate-fade-in">
            <div className="panel-card" style={{ marginBottom: '24px' }}>
                <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-video" style={{ color: 'var(--accent)' }}></i>
                    {role === 'manager' ? 'Team Meetings Calendar' : 'My Meeting Schedule'}
                </h2>

                {/* Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Search Meetings or Participants</label>
                        <input 
                            type="text" 
                            className="input-control" 
                            placeholder="Search title, employee..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Attendance Type</label>
                        <select 
                            className="select-filter" 
                            value={selectedType} 
                            onChange={(e) => setSelectedType(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">All Attendance Types</option>
                            {uniqueTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Status</label>
                        <select 
                            className="select-filter" 
                            value={selectedStatus} 
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">All Statuses</option>
                            {uniqueStatuses.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <button 
                            type="button"
                            className="btn-action" 
                            onClick={() => { setSearch(''); setSelectedType(''); setSelectedStatus(''); }}
                            style={{ width: '100%', height: '38px', textTransform: 'none' }}
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>

                {/* Meetings List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {filteredMeetings.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                            No meetings scheduled matching the active filters.
                        </div>
                    ) : (
                        filteredMeetings.map((meeting, index) => (
                            <div key={meeting.meeting_id} className="panel-card" style={{
                                border: '1px solid var(--border)',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                backgroundColor: 'var(--bg-primary)',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                                        {getMeetingTime(index)}
                                    </span>
                                    <span className="badge" style={{
                                        fontSize: '0.65rem',
                                        backgroundColor: meeting.meeting_status === 'Completed' ? 'rgba(79, 122, 92, 0.1)' : 
                                                         meeting.meeting_status === 'Canceled' ? 'rgba(217, 83, 79, 0.1)' : 'rgba(0, 123, 255, 0.1)',
                                        color: meeting.meeting_status === 'Completed' ? 'var(--success)' : 
                                               meeting.meeting_status === 'Canceled' ? 'var(--danger)' : 'var(--info)',
                                        border: `1px solid ${meeting.meeting_status === 'Completed' ? 'var(--success)' : 
                                                              meeting.meeting_status === 'Canceled' ? 'var(--danger)' : 'var(--info)'}`
                                    }}>
                                        {meeting.meeting_status}
                                    </span>
                                </div>

                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '4px 0', color: 'var(--text-primary)' }}>
                                    {meeting.meeting_title}
                                </h3>

                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <i className="fa-regular fa-clock" style={{ marginRight: '6px' }}></i>
                                    Duration: <strong>{meeting.duration_minutes} mins</strong>
                                </div>

                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <i className="fa-solid fa-location-dot" style={{ marginRight: '6px' }}></i>
                                    Format: <strong>{meeting.attendance_type}</strong>
                                </div>

                                {role === 'manager' && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                                        <i className="fa-regular fa-user" style={{ marginRight: '6px' }}></i>
                                        Participant: <strong>{meeting.employee_name}</strong> <span style={{ fontSize: '0.7rem' }}>({meeting.employee_id})</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
