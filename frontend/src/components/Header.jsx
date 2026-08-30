import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function Header({ 
    activeTab, 
    setActiveTab, 
    currentRole, 
    currentUser, 
    theme, 
    toggleTheme,
    profileName,
    profileTitle,
    profilePhoto,
    onLogout
}) {
    const [alertsOpen, setAlertsOpen] = useState(false);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        let active = true;
        const fetchAlerts = async () => {
            try {
                if (currentRole === 'manager') {
                    const warnings = await apiService.getEarlyWarnings();
                    if (active) {
                        const computedAlerts = [];
                        if (warnings.high_workload && warnings.high_workload.length > 0) {
                            computedAlerts.push({
                                id: 'high-workload',
                                text: `${warnings.high_workload.length} employees currently have high workload risk.`,
                                severity: 'red'
                            });
                        }
                        if (warnings.meeting_overload && warnings.meeting_overload.length > 0) {
                            computedAlerts.push({
                                id: 'meeting-overload',
                                text: `${warnings.meeting_overload.length} employees have meeting fatigue risk.`,
                                severity: 'amber'
                            });
                        }
                        if (warnings.deadline_risk && warnings.deadline_risk.length > 0) {
                            computedAlerts.push({
                                id: 'deadline-risk',
                                text: `${warnings.deadline_risk.length} employees have active tasks nearing deadline.`,
                                severity: 'amber'
                            });
                        }
                        if (computedAlerts.length === 0) {
                            computedAlerts.push({
                                id: 'clean',
                                text: 'All operations indicators are performing within normal parameters.',
                                severity: 'green'
                            });
                        }
                        setAlerts(computedAlerts);
                    }
                } else if (currentUser) {
                    const detail = await apiService.getEmployeeDashboard(currentUser.employee_id);
                    if (active) {
                        const computedAlerts = [];
                        if (detail.workload_risk === 'High') {
                            computedAlerts.push({
                                id: 'emp-overloaded',
                                text: `Your workload is currently high (${Math.round(detail.utilization_percent)}%). Try to schedule focus blocks.`,
                                severity: 'red'
                            });
                        }
                        if (detail.overdue_tasks > 0) {
                            computedAlerts.push({
                                id: 'emp-overdue',
                                text: `You have ${detail.overdue_tasks} overdue tasks requiring attention.`,
                                severity: 'amber'
                            });
                        }
                        if (computedAlerts.length === 0) {
                            computedAlerts.push({
                                id: 'emp-clean',
                                text: 'Your schedule metrics are balanced. Have a productive week!',
                                severity: 'green'
                            });
                        }
                        setAlerts(computedAlerts);
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch dynamic alerts for header dropdown:', err);
            }
        };
        fetchAlerts();
        
        // Refresh header alerts on tab changes or every 30 seconds
        const interval = setInterval(fetchAlerts, 30000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [currentRole, currentUser, activeTab]);

    const getProfileInitial = () => {
        if (currentRole === 'manager') return getInitials(profileName);
        if (currentUser && currentUser.name) return getInitials(currentUser.name);
        return 'EE';
    };

    const getInitials = (name) => {
        if (!name) return 'EE';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    // Manager Portal sidebar tabs list
    const managerTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
        { id: 'employees', label: 'Employees', icon: 'fa-users' },
        { id: 'list-check', label: 'Tasks', icon: 'fa-list-check' },
        { id: 'calendar', label: 'Meetings', icon: 'fa-video' },
        { id: 'full-calendar', label: 'Work Calendar', icon: 'fa-calendar-days' },
        { id: 'chart-gantt', label: 'Progress', icon: 'fa-spinner' },
        { id: 'brain', label: 'AI Insights', icon: 'fa-brain' },
        { id: 'scale-balanced', label: 'Responsible AI', icon: 'fa-scale-balanced' }
    ];

    // Employee Portal sidebar tabs list
    const employeeTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
        { id: 'list-check', label: 'My Tasks', icon: 'fa-list-check' },
        { id: 'calendar', label: 'My Meetings', icon: 'fa-video' },
        { id: 'full-calendar', label: 'My Calendar', icon: 'fa-calendar-days' },
        { id: 'chart-gantt', label: 'My Progress', icon: 'fa-spinner' },
        { id: 'my-workload', label: 'My Workload', icon: 'fa-gauge-high' },
        { id: 'brain', label: 'AI Assistant', icon: 'fa-robot' }
    ];

    const currentTabs = currentRole === 'manager' ? managerTabs : employeeTabs;

    return (
        <header className="top-navbar">
            <div className="navbar-brand-section">
                {/* Logo */}
                <div className="sidebar-logo">
                    <i className="fa-solid fa-leaf"></i> SustWork AI
                </div>

                {/* Horizontal Navigation Menu */}
                <ul className="horizontal-nav-menu">
                    {currentTabs.map(tab => (
                        <li 
                            key={tab.id}
                            className={`horizontal-menu-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="top-bar-actions">
                {/* Active Portal Badge */}
                <span className={`role-badge ${currentRole === 'employee' ? 'employee' : ''}`}>
                    {currentRole === 'manager' ? 'Manager Portal' : 'Employee Portal'}
                </span>

                {/* Accessible Theme Toggle */}
                <button 
                    className="theme-toggle-btn"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? (
                        <span role="img" aria-label="light-mode">☀️</span>
                    ) : (
                        <span role="img" aria-label="dark-mode">🌙</span>
                    )}
                </button>

                {/* Notification Alerts Bell */}
                <div style={{ position: 'relative' }}>
                    <button 
                        className="notification-bell"
                        onClick={() => setAlertsOpen(!alertsOpen)}
                        aria-label="View system alerts"
                        style={{ background: 'none', border: 'none' }}
                    >
                        <i className="fa-regular fa-bell fa-lg"></i>
                        {alerts.length > 0 && alerts[0].id !== 'clean' && alerts[0].id !== 'emp-clean' && (
                            <span className="bell-badge"></span>
                        )}
                    </button>
                    
                    {alertsOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '40px',
                            right: '0',
                            backgroundColor: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow)',
                            width: '280px',
                            zIndex: 110,
                            padding: '8px 0',
                            animation: 'fadeIn 0.2s ease'
                        }}>
                            <div style={{
                                padding: '8px 16px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                borderBottom: '1px solid var(--border)',
                                marginBottom: '4px',
                                fontFamily: 'var(--font-mono)'
                             }}>
                                System Alerts
                            </div>
                            {alerts.map(alert => (
                                <div 
                                    key={alert.id} 
                                    style={{
                                        padding: '10px 16px',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-primary)',
                                        borderLeft: `3px solid ${
                                            alert.severity === 'red' ? 'var(--danger)' : 
                                            alert.severity === 'green' ? 'var(--success)' : 'var(--warning)'
                                        }`,
                                        backgroundColor: 'var(--bg-primary)',
                                        margin: '4px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        lineHeight: '1.4'
                                    }}
                                >
                                    {alert.text}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* User Widget Avatar Trigger (Manager Portal can edit profile) */}
                <button 
                    className="avatar-header-trigger"
                    onClick={() => setActiveTab('profile')}
                    title="Edit profile settings"
                >
                    <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {currentRole === 'manager' && profilePhoto ? (
                            <img src={profilePhoto} alt={profileName} />
                        ) : (
                            getProfileInitial()
                        )}
                    </div>
                    <span 
                        style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }} 
                        className="hidden-mobile"
                    >
                        {currentRole === 'manager' ? profileName : (currentUser ? currentUser.name : 'Employee')}
                    </span>
                </button>

                {/* Sign Out Button (Requirement 1) */}
                <button 
                    className="btn-action" 
                    onClick={onLogout}
                    title="Sign Out"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}
                >
                    <i className="fa-solid fa-right-from-bracket"></i>
                    <span className="hidden-mobile">Sign Out</span>
                </button>
            </div>
        </header>
    );
}
