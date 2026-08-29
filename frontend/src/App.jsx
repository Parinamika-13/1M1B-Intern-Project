import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Profile from './pages/Profile';
import ResponsibleAiPage from './pages/ResponsibleAiPage';
import PlaceholderViewPage from './pages/PlaceholderViewPage';
import Header from './components/Header';
import EmployeeDetailModal from './components/EmployeeDetailModal';

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentRole, setCurrentRole] = useState('manager'); // 'manager' or 'employee'
    const [currentUser, setCurrentUser] = useState(null); // Sourced from Flask login
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // Slideout drawer details state (Manager directory only)
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Profile Settings States (Requirement 2)
    const [profileName, setProfileName] = useState('Sarah Jenkins');
    const [profileTitle, setProfileTitle] = useState('Operations Director');
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
        setCurrentUser(userProfile);
        setIsLoggedIn(true);
        setActiveTab('dashboard');

        if (role === 'manager') {
            setProfileName('Sarah Jenkins');
            setProfileTitle('Operations Director');
        } else {
            setProfileName(userProfile.name || 'Employee');
            setProfileTitle(userProfile.role || 'Team Member');
        }
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
                return <Dashboard currentRole={currentRole} currentUser={currentUser} />;
            case 'employees':
                return currentRole === 'manager' ? (
                    <Employees onViewDetails={handleViewDetails} />
                ) : null;
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
                return (
                    <PlaceholderViewPage 
                        tabName={activeTab} 
                        role={currentRole} 
                        currentUser={currentUser} 
                    />
                );
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
                    onClose={() => setIsDetailOpen(false)} 
                />
            )}
        </div>
    );
}
