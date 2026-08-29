import React, { useState } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ManagerDashboard from './components/ManagerDashboard';
import EmployeeList from './components/EmployeeList';
import EmployeeDetailModal from './components/EmployeeDetailModal';
import EmployeeDashboard from './components/EmployeeDashboard';
import ResponsibleAi from './components/ResponsibleAi';
import PlaceholderView from './components/PlaceholderView';

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentRole, setCurrentRole] = useState('manager'); // 'manager' or 'employee'
    const [currentUser, setCurrentUser] = useState(null); // Sourced from Flask login response
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const handleLoginSuccess = (userProfile, role) => {
        setCurrentRole(role);
        setCurrentUser(userProfile);
        setIsLoggedIn(true);
        setActiveTab('dashboard');
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

    // Routing renderer
    const renderActiveContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return currentRole === 'manager' ? (
                    <ManagerDashboard />
                ) : (
                    <EmployeeDashboard employeeId={currentUser.employee_id} />
                );
            case 'employees':
                return currentRole === 'manager' ? (
                    <EmployeeList onViewDetails={handleViewDetails} />
                ) : null;
            case 'scale-balanced':
                return <ResponsibleAi />;
            default:
                return (
                    <PlaceholderView 
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
            {/* Sidebar Navigation */}
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                currentRole={currentRole} 
                currentUser={currentUser} 
                onLogout={handleLogout} 
            />

            {/* Main Panel Content Area */}
            <main className="main-panel">
                <Header activeTab={activeTab} currentRole={currentRole} />
                <div className="content-wrapper">
                    {renderActiveContent()}
                </div>
            </main>

            {/* Sliding detail pane for employee analysis (Manager view only) */}
            {isDetailOpen && (
                <EmployeeDetailModal 
                    employeeId={selectedEmployeeId} 
                    onClose={() => setIsDetailOpen(false)} 
                />
            )}
        </div>
    );
}
