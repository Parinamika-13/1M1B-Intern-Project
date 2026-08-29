import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('sarah.jenkins@company.com');
    const [password, setPassword] = useState('password123');
    const [role, setRole] = useState('manager'); // 'manager' or 'employee'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRoleChange = (selectedRole) => {
        setRole(selectedRole);
        if (selectedRole === 'manager') {
            setEmail('sarah.jenkins@company.com');
        } else {
            setEmail('e001@company.com');
        }
        setError('');
    };

    const handleDemoLogin = (demoEmail, demoRole) => {
        setEmail(demoEmail);
        setRole(demoRole);
        setError('');
        // Immediately submit for demo ease
        submitLogin(demoEmail, demoRole);
    };

    const submitLogin = async (loginEmail, loginRole) => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, role: loginRole }),
            });
            const data = await response.json();
            if (response.ok && data.status === 'success') {
                onLoginSuccess(data, loginRole);
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Unable to connect to Flask backend server. Ensure it is running on port 5000.');
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
                        background: 'rgba(244, 63, 94, 0.12)', 
                        border: '1px solid var(--color-high)', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '12px', 
                        fontSize: '0.85rem', 
                        color: 'var(--color-high)', 
                        marginBottom: '20px',
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
                    <div className="role-selector" id="role-selector">
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

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="demo-credentials">
                    <div className="demo-title">Demo Quick Access</div>
                    <div className="demo-account" onClick={() => handleDemoLogin('sarah.jenkins@company.com', 'manager')}>
                        <span>Manager (Sarah Jenkins)</span>
                        <i className="fa-solid fa-arrow-right-to-bracket"></i>
                    </div>
                    <div className="demo-account" onClick={() => handleDemoLogin('e001@company.com', 'employee')}>
                        <span>Employee (E001 - Dev)</span>
                        <i className="fa-solid fa-arrow-right-to-bracket"></i>
                    </div>
                    <div className="demo-account" onClick={() => handleDemoLogin('e012@company.com', 'employee')}>
                        <span>Employee (E012 - Designer)</span>
                        <i className="fa-solid fa-arrow-right-to-bracket"></i>
                    </div>
                </div>
            </div>
        </div>
    );
}
