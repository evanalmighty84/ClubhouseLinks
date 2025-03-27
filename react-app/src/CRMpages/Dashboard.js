import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'react-bootstrap';
import DashboardCards from '../CRMcomponents/DashboardCards';
import VideoOverlay from '../CRMpages/CRMutils/dashboardanimations';
import CalendarScheduler from '../CRMcomponents/CalendarScheduler';
import axios from 'axios';
import '../CRMstyles/Dashboard.css';

const Dashboard = () => {
    const [userName, setUserName] = useState('');
    const [userIndustry, setUserIndustry] = useState('');
    const [dashboardData, setDashboardData] = useState({
        lists: 0,
        subscribers: 0,
        campaigns: 0,
        opens: 0,
        latestActivity: {
            newSubscribers: [],
            newLists: [],
            newCampaigns: []
        },
        recentEvents: 0
    });

    const navigate = useNavigate();

    useEffect(() => {
        const user = localStorage.getItem('user');
        try {
            if (user) {
                const parsedUser = JSON.parse(user);

                if (parsedUser && parsedUser.name && parsedUser.id) {
                    setUserName(parsedUser.name || 'Guest');
                    fetchDashboardData(parsedUser.id);
                } else {
                    throw new Error('Invalid user data');
                }
            } else {
                throw new Error('No user found in localStorage');
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            navigate('/app/signin');
        }
    }, [navigate]);

    const fetchDashboardData = async (userId) => {
        try {
            const response = await axios.get(`/server/crm_function/api/dashboard/${userId}`);
            const data = response.data;

            setUserIndustry(data.industry);

            setDashboardData({
                lists: data.totalLists,
                subscribers: data.totalSubscribers,
                campaigns: data.totalCampaigns,
                opens: data.totalOpens,
                recentEvents: data.recentEvents,
                latestActivity: data.latestActivity
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const getTickerId = (industry) => {
        switch (industry) {
            case 'Real Estate':
                return 'tOiggT7g2s6B43o4';
            case 'Finance':
                return 'tczIVO69TxVo83tO';
            case 'Tech':
                return 'tmiycRgWp9Q0dAjT';
            case 'Insurance':
                return 'taZGapwkthHkLrQG';
            case 'Health':
                return 'tMEB4ssF9JUrMuGe';
            default:
                return null;
        }
    };

    return (
        <Card className="p-3" style={{ maxWidth: '100%', backgroundColor: 'white', marginBottom: '0px' }}>

            <CalendarScheduler/>

            <div className="dashboard">
                {userIndustry && (
                    <rssapp-ticker id={getTickerId(userIndustry)}></rssapp-ticker>
                )}

                <div className="main-content">
                    {/* First Card Section */}
                    <div className="dashboard-cards">
                        <DashboardCards recentEvents={dashboardData.recentEvents} latestActivity={dashboardData.latestActivity} />
                    </div>
<br/>

                    <VideoOverlay />

                    {/* Second Card Section */}
                    <div className="d-flex flex-row text-center" style={{ gap: '10px', width: '100%', overflow: 'hidden' }}>
                        {/* Subscribers Section */}
                        <div style={{ background: 'linear-gradient(to bottom right, #f5c2d5, #de4e7f)', padding: '20px', color: 'white', flex: '1', borderRadius: '5px' }}>
                            <img
                                src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1733514628/subscribers.001_kwwld0.jpg"
                                alt="Subscribers"
                                style={{ width: '100%', borderRadius: '5px 5px 0 0' }}
                            />
                            <p className="responsive-text" style={{ color: 'white', margin: '5px 0' }}>
                                Subscribers
                            </p>
                            {dashboardData.subscribers}
                        </div>

                        {/* Lists Section */}
                        <div style={{ background: 'linear-gradient(to right bottom, #34eb92, #23ad6a)', padding: '20px', color: 'white', flex: '1', borderRadius: '5px' }}>
                            <img
                                src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1733517271/Lists.001_yozwhy.jpg"
                                alt="Lists"
                                style={{ width: '100%', borderRadius: '5px 5px 0 0' }}
                            />
                            <p className="responsive-text" style={{ color: 'white', margin: '5px 0' }}>
                                Lists
                            </p>
                            {dashboardData.lists}
                        </div>

                        {/* Campaigns Section */}
                        <div style={{ background: 'linear-gradient(to bottom right, #ffdab3, orange)', padding: '20px', color: 'white', flex: '1', borderRadius: '5px' }}>
                            <img
                                src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1733520655/Campaigns.001_pslyjv.jpg"
                                alt="Campaigns"
                                style={{ width: '100%', borderRadius: '5px 5px 0 0' }}
                            />
                            <p className="responsive-text" style={{ color: 'white', margin: '5px 0' }}>
                                Campaigns
                            </p>
                            {dashboardData.campaigns}
                        </div>

                        {/* Email Opens Section */}
                        <div style={{ background: 'linear-gradient(to bottom right, #a9d8d8, cadetblue)', padding: '20px', color: 'white', flex: '1', borderRadius: '5px' }}>
                            <img
                                src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1733521783/Recent_Events.001_nhf0sk.jpg"
                                alt="Email Opens"
                                style={{ width: '100%', borderRadius: '5px 5px 0 0' }}
                            />
                            <p className="responsive-text" style={{ color: 'white', margin: '5px 0' }}>
                                Email Opens
                            </p>
                            {dashboardData.opens}
                        </div>
                    </div>

                </div>
            </div>
        </Card>
    );
};

export default Dashboard;
