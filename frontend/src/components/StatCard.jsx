import React from 'react';

export default function StatCard({ title, value, icon, desc, style }) {
    return (
        <div className="metric-card" style={style}>
            <div className="metric-header">
                <span className="metric-title">{title}</span>
                {icon && <i className={`fa-solid ${icon} metric-icon`}></i>}
            </div>
            <div className="metric-value">{value}</div>
            {desc && <span className="metric-desc">{desc}</span>}
        </div>
    );
}
