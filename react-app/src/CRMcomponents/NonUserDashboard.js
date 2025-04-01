import React, { useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import DashboardCards from '../CRMcomponents/DashboardCards';
import EmailQueued from '../CRMpages/EmailQueuedPage';
import CalendarScheduler from '../CRMcomponents/CalendarScheduler';
import SignUp from "../CRMpages/SignUp";
import SignIn from "../CRMpages/SignIn";
import ListsPage from "./Lists/ListsPage";
import '../CRMstyles/Dashboard.css';
import './NonUserDashboard.css'; // you should have this for flipper styles

const NonUserDashboard = () => {
    const [index, setIndex] = useState(0);

    // Auto-rotate every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % 3); // cycles 0 -> 1 -> 2 -> 0
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // ✅ Mock Dashboard Data
    const mockDashboardData = {
        recentEvents: 3,
        latestActivity: {
            newSubscribers: [
                { name: 'John Doe', email: 'john@example.com' },
                { name: 'Jane Smith', email: 'jane@example.com' },
            ],
            newLists: [
                { name: 'Prospects', created_at: new Date() },
                { name: 'VIP Clients', created_at: new Date() },
            ],
            newCampaigns: [
                { name: 'Spring Promo', created_at: new Date() }
            ]
        }
    };

    const components = [
        <CalendarScheduler key="calendar" guestMode  />,
        <>
            <DashboardCards recentEvents={mockDashboardData.recentEvents} latestActivity={mockDashboardData.latestActivity} />
            <ListsPage isPreview={true} guestMode={true} />
            {/* optional: pass prop to indicate it's a demo */}
        </>,
        <EmailQueued guestMode={true} key="queued" />
    ];

    return (
        <Card className="p-3" style={{ maxWidth: '100%', backgroundColor: 'white', marginBottom: '0px' }}>
            <div className="flipper-container">
                <div className="flipper" style={{ transform: `rotateY(${index * 120}deg)` }}>
                    {components.map((Component, i) => (
                        <div className="flipper-face" key={i} style={{ transform: `rotateY(${-i * 120}deg)` }}>
                            {Component}
                        </div>
                    ))}
                </div>
            </div>

            {/* Optional sign up / sign in under the flipper */}
            <SignUp />
            <SignIn />
        </Card>
    );
};

export default NonUserDashboard;
