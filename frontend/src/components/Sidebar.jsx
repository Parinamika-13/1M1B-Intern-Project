import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, currentRole, currentUser, onLogout }) {
    // Generate initials for employee avatar
    const getInitials = () => {
        if (currentRole === 'manager') return 'SJ';
        if (!currentUser || !currentUser.name) return 'EE';
        return currentUser.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const getProfileName = () => {
        if (currentRole === 'manager') return 'Sarah Jenkins';
        return currentUser ? currentUser.name : 'Employee';
    };

    const getProfileRole = () => {
        if (currentRole === 'manager') return 'Operations Director';
        if (!currentUser) return 'Staff';
        return `${currentUser.role_title} (${currentUser.department})`;
    };

    return (
        <aside className="app-sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo"><i className="fa-solid fa-leaf"></i> SustWork AI</div>
            </div>
            
            <div className="user-profile-widget">
                <div className="avatar">{getInitials()}</div>
                <div className="profile-info">
                    <div className="profile-name">{getProfileName()}</div>
                    <div className="profile-role">{getProfileRole()}</div>
                </div>
            </div>
            
            <ul className="sidebar-menu">
                <li 
                    className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    <i className="fa-solid fa-chart-line"></i> Dashboard
                </li>
                
                {currentRole === 'manager' && (
                    <li 
                        className={`menu-item ${activeTab === 'employees' ? 'active' : ''}`}
                        onClick={() => setActiveTab('employees')}
                    >
                        <i className="fa-solid fa-users"></i> Employees
                    </li>
                )}
                
                <li 
                    className={`menu-item ${activeTab === 'list-check' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list-check')}
                >
                    <i className="fa-solid fa-list-check"></i> Tasks
                </li>
                
                <li 
                    className={`menu-item ${activeTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calendar')}
                >
                    <i className="fa-solid fa-video"></i> Meetings
                </li>
                
                <li 
                    className={`menu-item ${activeTab === 'chart-gantt' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chart-gantt')}
                >
                    <i className="fa-solid fa-spinner"></i> Progress
                </li>
                
                <li 
                    className={`menu-item ${activeTab === 'brain' ? 'active' : ''}`}
                    onClick={() => setActiveTab('brain')}
                >
                    <i className="fa-solid fa-brain"></i> AI Insights
                </li>
                
                <li 
                    className={`menu-item ${activeTab === 'scale-balanced' ? 'active' : ''}`}
                    onClick={() => setActiveTab('scale-balanced')}
                >
                    <i className="fa-solid fa-scale-balanced"></i> Responsible AI
                </li>
            </ul>
            
            <div className="sidebar-footer">
                <button className="btn-logout" onClick={onLogout}>
                    <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                </button>
            </div>
        </aside>
    );
}
