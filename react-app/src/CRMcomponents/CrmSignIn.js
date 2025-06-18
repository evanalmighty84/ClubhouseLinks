import React, { useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import DashboardCards from '../CRMcomponents/DashboardCards';
import EmailQueued from '../CRMpages/EmailQueuedPage';
import CalendarScheduler from '../CRMcomponents/CalendarScheduler';
import SignUp from "../CRMpages/SignUp";
import SignIn from "../CRMpages/SignIn";
import ListsPage from "./Lists/ListsPage";
import '../CRMstyles/Dashboard.css';
import './NonUserDashboard.css';
import ServicesSection from "../components/services/ServicesSection";
import servicesData from "../components/landing-pages/WebsiteLeadData";
import Unlimited from "../components/WideMovieLogo.gif";
import Logo from "../components/Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png";

// ✅ Reusable CRM Description Block
const CrmDescription = () => (

    <div style={{ marginTop: '2rem', padding: '1rem 2rem', backgroundColor: '#eef7ff', borderRadius: '10px' }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: '1rem', color: '#333', textAlign: 'center' }}>
            Ready to Grow Your Business?
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#444', lineHeight: '1.6', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
            Whether you're a startup or an established brand, our CRM is designed to help you connect with more leads, stay organized, and grow
            your revenue. Create an account today and get access to tools that streamline your outreach, boost your client retention, and give you
            full visibility into your communication. It’s free to try — and powerful enough to scale with you.
        </p>
    </div>
);

const CrmSignin = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % 3);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

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
        <CalendarScheduler key="calendar" guestMode />,
        <>
            <DashboardCards recentEvents={mockDashboardData.recentEvents} latestActivity={mockDashboardData.latestActivity} />
            <ListsPage isPreview={true} guestMode={true} />
        </>,
        <EmailQueued guestMode={true} key="queued" />
    ];

    return (
        <>
            <ServicesSection
                services={[]}
                heroGif={Unlimited}
                heroLogo={Logo}
                fullScreen={false}
                heroSwapDelay={24000}
            />

            {/* 🔹 #1: Above the Card */}
            <CrmDescription />

            <Card className="p-3" style={{ maxWidth: '100%', backgroundColor: 'white', marginBottom: '0px' }}>
                <SignUp />
                <SignIn />

                <div style={{ marginTop: '2rem', padding: '1rem 2rem', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                    <h2 style={{ fontWeight: 'bold', marginBottom: '1rem', color: '#333', textAlign: 'center' }}>
                        Everything You Need to Stay in Control
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#444', lineHeight: '1.8', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
                        Our all-in-one CRM brings your team’s tools into one smart dashboard:
                        <br /><br />
                        📋 <strong>List Management:</strong> Group and segment contacts with ease.<br />
                        📨 <strong>Email Campaigns:</strong> Design, schedule, and automate messages.<br />
                        📅 <strong>Calendar Integration:</strong> Schedule calls, meetings, and follow-ups.<br />
                        📈 <strong>Real-Time Metrics:</strong> See who’s opening and clicking your messages.<br />
                        🧠 <strong>Smart Automation:</strong> Trigger emails and reminders automatically.<br />
                        🛠️ <strong>Easy Setup:</strong> No IT team required — get started in minutes!
                    </p>
                </div>

                <div className="flipper-container">
                    <div className="flipper" style={{ transform: `rotateY(${index * 120}deg)` }}>
                        {components.map((Component, i) => (
                            <div className="flipper-face" key={i} style={{ transform: `rotateY(${-i * 120}deg)` }}>
                                {Component}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '2rem', padding: '1rem 2rem', backgroundColor: '#eaf7ec', borderRadius: '10px' }}>
                    <h2 style={{ fontWeight: 'bold', marginBottom: '1rem', color: '#2d6a4f', textAlign: 'center' }}>
                        Track Performance. Build Relationships. Win More.
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#3d5a4c', lineHeight: '1.6', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
                        With built-in open tracking, click reports, and smart alerts, you’ll know exactly how your customers are engaging. Our CRM doesn’t just
                        help you organize — it helps you convert. Your customers get timely follow-ups, clean communication, and a professional experience from
                        start to finish. Because great service starts with great systems — and we’ve got both.
                    </p>
                </div>
            </Card>
        </>
    );
};

export default CrmSignin;
