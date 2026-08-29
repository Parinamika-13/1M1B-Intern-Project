import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export default function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('manager'); // 'manager' or 'employee'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [demoAccounts, setDemoAccounts] = useState([]);

    // Fetch demo accounts dynamically from the loaded dataset on mount (Requirement 4)
    useEffect(() => {
        let active = true;
        const fetchDemoAccounts = async () => {
            try {
                const data = await apiService.getDemoAccounts();
                if (active) {
                    setDemoAccounts(data);
                }
            } catch (err) {
                console.warn('Could not load demo accounts list dynamically.', err);
            }
        };
        fetchDemoAccounts();
        return () => { active = false; };
    }, []);

    const handleRoleChange = (selectedRole) => {
        setRole(selectedRole);
        setError('');
    };

    const handleDemoLogin = (demoEmail, demoRole) => {
        setEmail(demoEmail);
        setRole(demoRole);
        setError('');
        submitLogin(demoEmail, demoRole);
    };

    const submitLogin = async (loginEmail, loginRole) => {
        setLoading(true);
        setError('');
        try {
            const data = await apiService.login(loginEmail, loginRole);
            if (data.status === 'success') {
                onLoginSuccess(data, loginRole);
            } else {
                setError(data.message || 'Verification credentials rejected.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('System is offline. Ensure Python service is active.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitLogin(email, role);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo"><i className="fa-solid fa-leaf"></i> SustWork AI</div>
                    <div className="login-subtitle">Sustainable Workforce Management Portal</div>
                </div>

                {error && (
                    <div style={{ 
                        background: 'var(--danger-bg)', 
                        border: '1px solid var(--danger)', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '12px', 
                        fontSize: '0.8125rem', 
                        color: 'var(--danger)', 
                        marginBottom: '16px',
                        lineHeight: '1.4'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">Email Address</label>
                        <input 
                            type="email" 
                            id="login-email" 
                            className="input-control" 
                            placeholder="name@company.com" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="login-password">Password</label>
                        <input 
                            type="password" 
                            id="login-password" 
                            className="input-control" 
                            placeholder="••••••••" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <label className="form-label">System Access Role</label>
                    <div className="role-selector" style={{ marginBottom: '24px' }}>
                        <div 
                            className={`role-option ${role === 'manager' ? 'active' : ''}`}
                            onClick={() => handleRoleChange('manager')}
                        >
                            Manager
                        </div>
                        <div 
                            className={`role-option ${role === 'employee' ? 'active' : ''}`}
                            onClick={() => handleRoleChange('employee')}
                        >
                            Employee
                        </div>
                        <div 
                            className="role-slider" 
                            style={{ transform: role === 'manager' ? 'translateX(0%)' : 'translateX(100%)' }}
                        ></div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ fontFamily: 'var(--font-heading)' }}>
                        {loading ? 'Verifying...' : 'Sign In'}
                    </button>
                </form>

                {demoAccounts.length > 0 && (
                    <div className="demo-credentials" style={{ marginTop: '24px' }}>
                        <div className="demo-title">Demo Access Channels</div>
                        {demoAccounts.map(acc => (
                            <div key={acc.email} className="demo-account" onClick={() => handleDemoLogin(acc.email, acc.role)}>
                                <span>{acc.name} ({acc.role})</span>
                                <i className="fa-solid fa-arrow-right-to-bracket"></i>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
