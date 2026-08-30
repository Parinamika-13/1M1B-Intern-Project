import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('manager'); // visual only — never trusted for authorization
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [demoAccounts, setDemoAccounts] = useState([]);

    // Load demo accounts dynamically from Firestore (demo === true only)
    useEffect(() => {
        let active = true;

        const fetchDemoAccounts = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'users'));

                const accounts = snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
                    .filter((account) => account.demo === true);

                if (active) {
                    setDemoAccounts(accounts);
                }
            } catch (err) {
                console.error('Could not load demo accounts from Firestore:', err);
            }
        };

        fetchDemoAccounts();

        return () => {
            active = false;
        };
    }, []);

    const handleRoleChange = (selectedRole) => {
        setRole(selectedRole);
        setError('');
    };

    // Demo account click only fills email + visual role.
    // It does NOT auto-login and never carries a password.
    const handleDemoLogin = (demoEmail, demoRole) => {
        setEmail(demoEmail);
        setRole(demoRole);
        setError('');
    };

    const submitLogin = async (loginEmail) => {
        setLoading(true);
        setError('');

        try {
            // 1. Firebase Authentication verifies email + password
            const userCredential = await signInWithEmailAndPassword(
                auth,
                loginEmail,
                password
            );

            const user = userCredential.user;

            // 2. Fetch the user's WorkLens profile using the Firebase UID
            const userRef = doc(db, 'users', user.uid);
            const userSnapshot = await getDoc(userRef);

            // 3. Firestore profile must exist
            if (!userSnapshot.exists()) {
                setError('Your account is authenticated, but no WorkLens user profile was found.');
                return;
            }

            const userData = userSnapshot.data();
            const actualRole = userData.role;

            // 4. Firestore role must be valid — this is the source of truth, not the UI selector
            if (actualRole !== 'manager' && actualRole !== 'employee') {
                setError('Your WorkLens account has an invalid or missing role.');
                return;
            }

            console.log('Firebase login successful:', user.email, '| role:', actualRole);

            // 5. Pass the authenticated Firebase user + Firestore profile up to the app
            onLoginSuccess(
                {
                    status: 'success',
                    user: user,
                    profile: {
                        uid: user.uid,
                        name: userData.name || user.displayName || '',
                        email: userData.email || user.email,
                        role: actualRole,
                        demo: userData.demo === true,
                        employee_id: userData.employee_id || ''
                    }
                },
                // Always the Firestore role — never the dropdown's role state
                actualRole
            );

        } catch (err) {
            console.error('Firebase login error:', err);

            switch (err.code) {
                case 'auth/invalid-credential':
                    setError('Invalid email or password.');
                    break;
                case 'auth/user-not-found':
                    setError('No account found with this email.');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password.');
                    break;
                case 'auth/invalid-email':
                    setError('Please enter a valid email address.');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many login attempts. Please try again later.');
                    break;
                case 'auth/user-disabled':
                    setError('This account has been disabled.');
                    break;
                default:
                    setError(`Login failed: ${err.code || err.message}`);
                    break;
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }

        submitLogin(email);
    };

    return (
        <div className="login-container">
            <div className="login-card">

                <div className="login-header">
                    <div className="login-logo">
                        <i className="fa-solid fa-leaf"></i> SustWork AI
                    </div>
                    <div className="login-subtitle">
                        Sustainable Workforce Management Portal
                    </div>
                </div>

                {error && (
                    <div
                        style={{
                            background: 'var(--danger-bg)',
                            border: '1px solid var(--danger)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px',
                            fontSize: '0.8125rem',
                            color: 'var(--danger)',
                            marginBottom: '16px',
                            lineHeight: '1.4'
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="login-email"
                            className="input-control"
                            placeholder="name@company.com"
                            required
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError('');
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="login-password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="login-password"
                            className="input-control"
                            placeholder="••••••••"
                            required
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
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

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        {loading ? 'Verifying...' : 'Sign In'}
                    </button>

                </form>

                {demoAccounts.length > 0 && (
                    <div className="demo-credentials" style={{ marginTop: '24px' }}>
                        <div className="demo-title">Demo Access Channels</div>
                        {demoAccounts.map((account) => (
                            <div
                                key={account.id}
                                className="demo-account"
                                onClick={() => handleDemoLogin(account.email, account.role)}
                            >
                                <span>{account.name} ({account.role})</span>
                                <i className="fa-solid fa-arrow-right-to-bracket"></i>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}