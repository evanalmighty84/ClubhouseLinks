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
            localStorage.setItem('textQueueEnabled', JSON.stringify(data.textQueueEnabled));

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



            <div className="dashboard">
                {userIndustry && (
                    <rssapp-ticker id={getTickerId(userIndustry)}></rssapp-ticker>
                )}

                <div className="main-content">
                    {/* First Card Section */}
                    <div className="dashboard-cards">
                        <DashboardCards recentEvents={dashboardData.recentEvents} latestActivity={dashboardData.latestActivity} />
                    </div>
                    <hr/>
                    <CalendarScheduler/>
                    <hr/>
<br/>

                    <VideoOverlay />

                    {/* Second Card Section */}
                </div>
            </div>
        </Card>
    );
};

export default Dashboard;
