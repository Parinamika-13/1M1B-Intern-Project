import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { auth } from '../firebase';

export default function CalendarPage({ role, currentUser }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [notes, setNotes] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [meetings, setMeetings] = useState([]);
    
    // Note edit form state
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [saveError, setSaveError] = useState('');

    // Event detail modal state
    const [selectedEvent, setSelectedEvent] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const fetchCalendarData = async () => {
        setLoading(true);
        try {
            const [tasksList, meetingsList, notesList] = await Promise.all([
                apiService.getTasks(),
                apiService.getMeetings(),
                apiService.getCalendarNotes(auth.currentUser?.uid)
            ]);

            // Filter tasks and meetings based on role
            if (role === 'employee' && currentUser?.employee_id) {
                setTasks(tasksList.filter(t => t.employee_id === currentUser.employee_id));
                setMeetings(meetingsList.filter(m => m.employee_id === currentUser.employee_id));
            } else {
                setTasks(tasksList);
                setMeetings(meetingsList);
            }
            setNotes(notesList);
        } catch (err) {
            console.error("Failed to load calendar data:", err);
            setError("Failed to load work calendar.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchCalendarData();
        }
    }, [role, currentUser]);

    // Helpers to compute date strings deterministically
    const getTaskDateStr = (task) => {
        const today = new Date();
        const days = parseInt(task.deadline_days_remaining) || 0;
        const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
        return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    };

    const getMeetingDateStr = (meeting, idx) => {
        const today = new Date();
        const day = (idx % 28) + 1;
        const target = new Date(today.getFullYear(), today.getMonth(), day);
        return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    };

    // Calculate dates grid
    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => {
        const day = new Date(y, m, 1).getDay();
        return day === 0 ? 6 : day - 1; // Map Sun=0 to 6, Mon=1 to 0
    };

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);

    const daysGrid = [];
    // Previous month empty cells
    for (let i = 0; i < firstDayIndex; i++) {
        daysGrid.push(null);
    }
    // Current month cells
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        daysGrid.push({ day: d, dateStr });
    }

    // Get events for a date string
    const getEventsForDate = (dateStr) => {
        const dateTasks = tasks.filter(t => getTaskDateStr(t) === dateStr);
        const dateMeetings = meetings.filter((m, idx) => getMeetingDateStr(m, idx) === dateStr);
        const dateNotes = notes.filter(n => n.date === dateStr);
        return { tasks: dateTasks, meetings: dateMeetings, notes: dateNotes };
    };

    // Handlers
    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const handleAddNoteClick = (dateStr) => {
        setSelectedDate(dateStr);
        setNoteText('');
        setEditingNoteId(null);
        setSaveError('');
        setShowNoteModal(true);
    };

    const handleEditNoteClick = (note) => {
        setSelectedDate(note.date);
        setNoteText(note.text);
        setEditingNoteId(note.note_id);
        setSaveError('');
        setShowNoteModal(true);
    };

    const handleSaveNote = async (e) => {
        e.preventDefault();
        const userId = auth.currentUser?.uid;
        
        console.log("--- FIREBASE SAVE NOTE DIAGNOSTICS ---");
        console.log("auth.currentUser:", auth.currentUser);
        console.log("auth.currentUser.uid:", auth.currentUser?.uid);
        console.log("Firebase project ID:", auth.app?.options?.projectId);
        console.log("Collection name: calendarNotes");
        console.log("Payload:", {
            userId,
            employeeId: currentUser?.employee_id || '',
            date: selectedDate,
            content: noteText
        });

        if (!userId || !selectedDate || !noteText.trim()) return;

        setSaveError('');
        try {
            if (editingNoteId) {
                const updated = await apiService.updateCalendarNote(editingNoteId, noteText);
                setNotes(prev => prev.map(n => n.note_id === editingNoteId ? { ...n, text: updated.text, updated_at: updated.updated_at } : n));
            } else {
                const employeeId = currentUser?.employee_id || '';
                const created = await apiService.addCalendarNote(userId, employeeId, selectedDate, noteText);
                setNotes(prev => [...prev, created]);
            }
            setShowNoteModal(false);
            setNoteText('');
        } catch (err) {
            console.error("Failed to save calendar note:", err);
            setSaveError("⚠️ Unable to save this note. Please try again.");
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm("Are you sure you want to delete this personal note?")) return;
        try {
            await apiService.deleteCalendarNote(noteId);
            setNotes(prev => prev.filter(n => n.note_id !== noteId));
        } catch (err) {
            console.error("Failed to delete note:", err);
            alert("Failed to delete note.");
        }
    };

    if (loading && tasks.length === 0) {
        return <div style={{ color: 'var(--text-secondary)', padding: '24px', fontSize: '0.875rem' }}>Loading calendar environment...</div>;
    }

    if (error) {
        return (
            <div style={{ padding: '24px' }}>
                <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>
                <button className="btn-primary" onClick={fetchCalendarData}>Try Again</button>
            </div>
        );
    }

    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];

    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    return (
        <div className="tab-view animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* PAGE HEADER */}
            <div className="panel-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h2 className="panel-title" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <i className="fa-solid fa-calendar-days" style={{ color: 'var(--accent)' }}></i>
                        {role === 'manager' ? 'Work Calendar' : 'My Calendar'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                        {role === 'manager' 
                            ? 'Manager overview of team task deadlines, project deliverables, and shared meetings.' 
                            : 'Personal overview of your task deadlines, meeting timeline, and private calendar notes.'}
                    </p>
                </div>
            </div>

            {/* CALENDAR ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
                
                {/* GRID CARD */}
                <div className="panel-card" style={{ padding: '24px' }}>
                    {/* Month Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 className="font-serif" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
                            {monthNames[month]} {year}
                        </h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-action" onClick={handlePrevMonth} style={{ padding: '6px 12px' }}>
                                <i className="fa-solid fa-chevron-left"></i>
                            </button>
                            <button className="btn-action" onClick={handleToday} style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                Today
                            </button>
                            <button className="btn-action" onClick={handleNextMonth} style={{ padding: '6px 12px' }}>
                                <i className="fa-solid fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>

                    {/* Weekday titles */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {weekdays.map(d => <div key={d} style={{ padding: '8px 0' }}>{d}</div>)}
                    </div>

                    {/* Days Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', minHeight: '340px' }}>
                        {daysGrid.map((dayData, idx) => {
                            if (!dayData) {
                                return <div key={`empty-${idx}`} style={{ backgroundColor: 'transparent', border: '1px dashed transparent' }}></div>;
                            }

                            const { day, dateStr } = dayData;
                            const { tasks: dayTasks, meetings: dayMeetings, notes: dayNotes } = getEventsForDate(dateStr);
                            const totalEvents = dayTasks.length + dayMeetings.length + dayNotes.length;
                            const isToday = dateStr === todayStr;

                             return (
                                <div 
                                    key={dateStr}
                                    onClick={() => setSelectedDate(dateStr)}
                                    style={{
                                        border: selectedDate === dateStr ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '8px',
                                        backgroundColor: isToday ? 'rgba(79, 122, 92, 0.06)' : 'var(--surface)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        minHeight: '115px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'flex-start',
                                        alignItems: 'stretch',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                    onMouseLeave={(e) => { if (selectedDate !== dateStr) e.currentTarget.style.borderColor = 'var(--border)'; }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <span style={{ 
                                            fontSize: '0.8rem', 
                                            fontWeight: isToday ? 800 : 500, 
                                            color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                                            backgroundColor: isToday ? 'rgba(79, 122, 92, 0.15)' : 'transparent',
                                            borderRadius: '50%',
                                            width: '20px',
                                            height: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {day}
                                        </span>
                                    </div>

                                    {/* Events List within cell */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' }}>
                                        {dayTasks.map(t => {
                                            const days = parseInt(t.deadline_days_remaining) || 0;
                                            const isOverdue = days <= 0;
                                            const dotColor = isOverdue ? 'var(--danger)' : (t.priority === 'High' ? 'var(--warning)' : 'var(--accent)');
                                            return (
                                                <div 
                                                    key={t.task_id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEvent({ type: 'task', data: t });
                                                    }}
                                                    title={`Task: ${t.task_title}`}
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        lineHeight: '1.2',
                                                        padding: '1px 4px',
                                                        borderRadius: '2px',
                                                        backgroundColor: 'var(--bg-primary)',
                                                        color: 'var(--text-primary)',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        border: `1px solid var(--border)`,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block', flexShrink: 0 }}></span>
                                                    {t.task_title}
                                                </div>
                                            );
                                        })}

                                        {dayMeetings.map(m => (
                                            <div 
                                                key={m.meeting_id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedEvent({ type: 'meeting', data: m });
                                                }}
                                                title={`Meeting: ${m.meeting_title}`}
                                                style={{
                                                    fontSize: '0.65rem',
                                                    lineHeight: '1.2',
                                                    padding: '1px 4px',
                                                    borderRadius: '2px',
                                                    backgroundColor: 'rgba(0, 120, 215, 0.08)',
                                                    color: 'var(--text-primary)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    border: `1px solid var(--border)`,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--info)', display: 'inline-block', flexShrink: 0 }}></span>
                                                {m.meeting_title}
                                            </div>
                                        ))}

                                        {dayNotes.map(n => (
                                            <div 
                                                key={n.note_id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditNoteClick(n);
                                                }}
                                                title={`Note: ${n.text}`}
                                                style={{
                                                    fontSize: '0.65rem',
                                                    lineHeight: '1.2',
                                                    padding: '1px 4px',
                                                    borderRadius: '2px',
                                                    backgroundColor: 'rgba(128, 128, 128, 0.08)',
                                                    color: 'var(--text-primary)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    border: `1px dashed var(--border)`,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span style={{ display: 'inline-block', flexShrink: 0 }}>📝</span>
                                                {n.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '20px', fontSize: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '16px', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)' }}></span> Regular Deadline
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)' }}></span> High Priority Deadline
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></span> Overdue Task
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--info)' }}></span> Shared Meeting
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)' }}></span> Personal Note
                        </span>
                    </div>
                </div>

                {/* SIDEBAR: DATE DETAIL / ADD NOTES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    <div className="panel-card" style={{ padding: '24px', minHeight: '340px' }}>
                        {selectedDate ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                                    <h4 className="font-serif" style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
                                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </h4>
                                    <button 
                                        className="btn-primary" 
                                        onClick={() => handleAddNoteClick(selectedDate)}
                                        style={{ fontSize: '0.7rem', padding: '4px 10px', height: 'auto', borderRadius: '16px' }}
                                    >
                                        <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i> Note
                                    </button>
                                </div>

                                {/* Events List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {(() => {
                                        const { tasks: dt, meetings: dm, notes: dn } = getEventsForDate(selectedDate);
                                        const total = dt.length + dm.length + dn.length;

                                        if (total === 0) {
                                            return (
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '24px 0' }}>
                                                    No events scheduled.
                                                </div>
                                            );
                                        }

                                        return (
                                            <>
                                                {/* Tasks List */}
                                                {dt.map(task => (
                                                    <div 
                                                        key={task.task_id} 
                                                        onClick={() => setSelectedEvent({ type: 'task', data: task })}
                                                        style={{ border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                            <span>Task Deadline</span>
                                                            <span className={`priority-pill ${task.priority === 'High' ? 'priority-high' : (task.priority === 'Medium' ? 'priority-medium' : 'priority-low')}`}>
                                                                {task.priority}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{task.task_title}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            Project: {task.project_name || 'General'} | Status: {task.status}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Meetings List */}
                                                {dm.map(meet => (
                                                    <div 
                                                        key={meet.meeting_id} 
                                                        onClick={() => setSelectedEvent({ type: 'meeting', data: meet })}
                                                        style={{ border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                            <span>Shared Meeting</span>
                                                            <span className="badge badge-low" style={{ fontSize: '0.6rem' }}>{meet.meeting_status}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{meet.meeting_title}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            Duration: {meet.duration_minutes}m | Format: {meet.attendance_type}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Notes List */}
                                                {dn.map(note => (
                                                    <div 
                                                        key={note.note_id}
                                                        style={{ border: '1px dashed var(--border)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface)' }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                            <span><i className="fa-solid fa-pen-clip"></i> Personal Note</span>
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button onClick={() => handleEditNoteClick(note)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)' }}>
                                                                    <i className="fa-solid fa-pen-to-square"></i>
                                                                </button>
                                                                <button onClick={() => handleDeleteNote(note.note_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                                                                    <i className="fa-solid fa-trash-can"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                                                    </div>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <i className="fa-solid fa-circle-info" style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent)' }}></i>
                                Select a date on the calendar grid to view detailed schedule events and personal logs.
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* DYNAMIC MODALS */}
            {/* Note Edit Modal */}
            {showNoteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <form onSubmit={handleSaveNote} className="panel-card" style={{ padding: '24px', width: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 className="font-serif" style={{ fontSize: '1.1rem', margin: 0 }}>
                            {editingNoteId ? 'Edit Personal Note' : 'Add Personal Note'}
                        </h4>
                        <div className="form-group" style={{ margin: 0 }}>
                            <textarea 
                                className="input-control"
                                placeholder="Enter note text..."
                                required
                                rows="4"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                style={{ resize: 'none', width: '100%', padding: '10px' }}
                            ></textarea>
                        </div>
                        {saveError && (
                            <div style={{ color: 'var(--danger)', fontSize: '0.725rem', lineHeight: '1.3', padding: '6px 10px', backgroundColor: 'rgba(211, 47, 47, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)' }}>
                                <strong>Error:</strong> {saveError}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" className="btn-action" onClick={() => setShowNoteModal(false)}>Cancel</button>
                            <button type="submit" className="btn-primary" style={{ width: '80px', height: '36px', padding: 0 }}>Save</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div className="panel-card" style={{ padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 className="font-serif" style={{ fontSize: '1.1rem', margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                            {selectedEvent.type === 'task' ? 'Work Task Details' : 'Shared Meeting Details'}
                        </h4>

                        {selectedEvent.type === 'task' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <div><strong>Task ID:</strong> {selectedEvent.data.task_id}</div>
                                <div><strong>Title:</strong> <strong style={{ color: 'var(--text-primary)' }}>{selectedEvent.data.task_title}</strong></div>
                                <div><strong>Project:</strong> {selectedEvent.data.project_name || 'General'}</div>
                                <div><strong>Priority:</strong> {selectedEvent.data.priority}</div>
                                <div><strong>Complexity:</strong> {selectedEvent.data.task_complexity}</div>
                                <div><strong>Est. Hours:</strong> {selectedEvent.data.estimated_hours} hrs</div>
                                <div><strong>Status:</strong> {selectedEvent.data.status}</div>
                                <div><strong>Days Remaining:</strong> {selectedEvent.data.deadline_days_remaining}d</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <div><strong>Meeting ID:</strong> {selectedEvent.data.meeting_id}</div>
                                <div><strong>Title:</strong> <strong style={{ color: 'var(--text-primary)' }}>{selectedEvent.data.meeting_title}</strong></div>
                                <div><strong>Duration:</strong> {selectedEvent.data.duration_minutes} minutes</div>
                                <div><strong>Format:</strong> {selectedEvent.data.attendance_type}</div>
                                <div><strong>Status:</strong> {selectedEvent.data.meeting_status}</div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button type="button" className="btn-primary" onClick={() => setSelectedEvent(null)} style={{ width: '80px', height: '36px', padding: 0 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
