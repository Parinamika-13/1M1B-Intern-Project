import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import TasksPage from './pages/TasksPage';
import MeetingsPage from './pages/MeetingsPage';
import CalendarPage from './pages/CalendarPage';
import ProgressPage from './pages/ProgressPage';
import MyWorkloadPage from './pages/MyWorkloadPage';
import AiInsightsPage from './pages/AiInsightsPage';
import Profile from './pages/Profile';
import ResponsibleAiPage from './pages/ResponsibleAiPage';
import Header from './components/Header';
import EmployeeDetailModal from './components/EmployeeDetailModal';
import { apiService } from './services/api';

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentRole, setCurrentRole] = useState('manager'); // 'manager' or 'employee'
    const [currentUser, setCurrentUser] = useState(null); // Sourced from Flask login
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // Slideout drawer details state (Manager directory only)
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Profile Settings States (Requirement 2)
    const [profileName, setProfileName] = useState('');
    const [profileTitle, setProfileTitle] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null); // Base64 data URL string or null

    // Theme (Light/Dark mode) management with localStorage persistence (Requirement 3)
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    const handleLoginSuccess = (userProfile, role) => {
        setCurrentRole(role);
        const resolvedEmpId = apiService.resolveEmployeeId(userProfile);
        const normalizedUser = {
            ...userProfile,
            ...userProfile.profile,
            employee_id: resolvedEmpId
        };
        setCurrentUser(normalizedUser);
        setIsLoggedIn(true);
        setActiveTab('dashboard');

        setProfileName(normalizedUser.name || '');
        setProfileTitle(normalizedUser.role_title || '');
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setSelectedEmployeeId(null);
        setIsDetailOpen(false);
    };

    const handleViewDetails = (employeeId) => {
        setSelectedEmployeeId(employeeId);
        setIsDetailOpen(true);
    };

    // Client-side Page Router
    const renderActiveContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard currentRole={currentRole} currentUser={currentUser} setActiveTab={setActiveTab} />;
            case 'employees':
                return currentRole === 'manager' ? (
                    <Employees onViewDetails={handleViewDetails} />
                ) : null;
            case 'list-check':
                return <TasksPage role={currentRole} currentUser={currentUser} />;
            case 'calendar':
                return <MeetingsPage role={currentRole} currentUser={currentUser} />;
            case 'full-calendar':
                return <CalendarPage role={currentRole} currentUser={currentUser} />;
            case 'chart-gantt':
                return <ProgressPage role={currentRole} currentUser={currentUser} />;
            case 'my-workload':
                return currentRole === 'employee' ? <MyWorkloadPage currentUser={currentUser} /> : null;
            case 'brain':
                return <AiInsightsPage role={currentRole} currentUser={currentUser} />;
            case 'profile':
                return (
                    <Profile 
                        profileName={profileName}
                        setProfileName={setProfileName}
                        profileTitle={profileTitle}
                        setProfileTitle={setProfileTitle}
                        profilePhoto={profilePhoto}
                        setProfilePhoto={setProfilePhoto}
                        theme={theme}
                        toggleTheme={toggleTheme}
                        setActiveTab={setActiveTab}
                    />
                );
            case 'scale-balanced':
                return <ResponsibleAiPage />;
            default:
                return <div style={{ color: 'var(--text-secondary)', padding: '24px' }}>Page not found.</div>;
        }
    };

    if (!isLoggedIn) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="app-container">
            {/* Top Navigation Navbar (Replaces the old sidebar layout) */}
            <Header 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                currentRole={currentRole} 
                currentUser={currentUser} 
                theme={theme}
                toggleTheme={toggleTheme}
                profileName={profileName}
                profileTitle={profileTitle}
                profilePhoto={profilePhoto}
                onLogout={handleLogout}
            />
            
            {/* Center Content panel */}
            <div className="content-wrapper">
                {renderActiveContent()}
            </div>

            {/* Sliding Drawer Detail Panel (Manager view only) */}
            {isDetailOpen && (
                <EmployeeDetailModal 
                    employeeId={selectedEmployeeId} 
                    onClose={() => { setIsDetailOpen(false); setSelectedEmployeeId(null); }} 
                />
            )}
        </div>
    );
}
