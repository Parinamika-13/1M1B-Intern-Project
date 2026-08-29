import React from 'react';

export default function Header({ activeTab, currentRole }) {
    const getPageTitle = () => {
        switch (activeTab) {
            case 'dashboard':
                return currentRole === 'manager' ? 'Manager Dashboard Overview' : 'Employee Dashboard';
            case 'employees':
                return 'Team Members List';
            case 'list-check':
                return 'Task Management Board';
            case 'calendar':
                return 'Meeting Load Tracker';
            case 'chart-gantt':
                return 'Progress Analytics';
            case 'brain':
                return 'AI Insights Console';
            case 'scale-balanced':
                return 'Responsible AI Blueprint';
            default:
                return 'Dashboard';
        }
    };

    return (
        <header className="top-navbar">
            <div className="view-title">{getPageTitle()}</div>
            <div className="top-bar-actions">
                <span className={`role-badge ${currentRole === 'employee' ? 'employee' : ''}`}>
                    {currentRole === 'manager' ? 'Manager Portal' : 'Employee Portal'}
                </span>
                <div className="notification-bell">
                    <i className="fa-regular fa-bell fa-lg"></i>
                    <span class="bell-badge"></span>
                </div>
            </div>
        </header>
    );
}
