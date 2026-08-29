import React, { useRef } from 'react';

export default function Profile({ 
    profileName, 
    setProfileName, 
    profileTitle, 
    setProfileTitle, 
    profilePhoto, 
    setProfilePhoto, 
    theme, 
    toggleTheme, 
    setActiveTab 
}) {
    const fileInputRef = useRef(null);

    const getInitials = (name) => {
        if (!name) return 'EE';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const handleCameraClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                setProfilePhoto(uploadEvent.target.result); // Save Base64 Data URL
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="tab-view animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="panel-card" style={{ padding: '32px' }}>
                
                {/* Back Button */}
                <button 
                    className="btn-action" 
                    onClick={() => setActiveTab('dashboard')}
                    style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
                </button>

                <h2 className="text-heading font-serif" style={{ fontSize: '1.5rem', marginBottom: '24px', textAlign: 'center' }}>
                    User Profile Settings
                </h2>

                {/* Profile Photo Upload Section */}
                <div className="profile-photo-upload-container">
                    <div className="profile-avatar-edit-wrapper">
                        <div className="avatar">
                            {profilePhoto ? (
                                <img src={profilePhoto} alt={profileName} />
                            ) : (
                                getInitials(profileName)
                            )}
                        </div>
                        
                        {/* Camera Overlay */}
                        <div 
                            className="camera-upload-overlay" 
                            onClick={handleCameraClick}
                            title="Upload profile photo"
                        >
                            <i className="fa-solid fa-camera"></i>
                        </div>
                        
                        {/* Hidden input file */}
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                {/* Profile Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="profile-fullname">Full Name</label>
                        <input 
                            type="text" 
                            id="profile-fullname" 
                            className="form-input-editable"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="profile-jobtitle">Job Title</label>
                        <input 
                            type="text" 
                            id="profile-jobtitle" 
                            className="form-input-editable"
                            value={profileTitle}
                            onChange={(e) => setProfileTitle(e.target.value)}
                        />
                    </div>

                    {/* Integrated Theme Toggle Row */}
                    <div className="theme-switch-row">
                        <span className="switch-label">
                            Interface Theme: <strong style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>{theme} mode</strong>
                        </span>
                        <button 
                            className="switch-control-btn"
                            onClick={toggleTheme}
                        >
                            Toggle Theme
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
