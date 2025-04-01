import React, { useEffect, useState } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { FaList, FaUserFriends, FaBullhorn, FaCalendarCheck } from 'react-icons/fa';

const DashboardCards = ({ recentEvents = {}, latestActivity = {} }) => {
    // Extract the relevant data from the props
    const { newSubscribers = [], newLists = [], newCampaigns = [] } = latestActivity;

    const cardStyle = {
        color: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderStyle: 'solid',
        borderColor: 'white',
        borderWidth: '0em',
        border:'0em'
    };

    const cardTextStyle = {
        fontSize: 'medium',
        color: 'white',
    };

    // Scrolling state for each category
    const [currentIndex, setCurrentIndex] = useState({
        subscribers: 0,
        lists: 0,
        campaigns: 0,
        events: 0,
    });

    // Extract Last Week events from recentEvents
    const lastWeekEvents = recentEvents['Last Week'] || [];

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentIndex((prevIndex) => ({
                subscribers: newSubscribers.length
                    ? (prevIndex.subscribers + 1) % newSubscribers.length
                    : 0,
                lists: newLists.length
                    ? (prevIndex.lists + 1) % newLists.length
                    : 0,
                campaigns: newCampaigns.length
                    ? (prevIndex.campaigns + 1) % newCampaigns.length
                    : 0,
                events: lastWeekEvents.length
                    ? (prevIndex.events + 1) % lastWeekEvents.length
                    : 0,
            }));
        }, 3000); // Scroll every 3 seconds

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [newSubscribers, newLists, newCampaigns, lastWeekEvents]);

    // Current items for scrolling
    const currentSubscriber = newSubscribers[currentIndex.subscribers];
    const currentList = newLists[currentIndex.lists];
    const currentCampaign = newCampaigns[currentIndex.campaigns];
    const currentEvent = lastWeekEvents[currentIndex.events];

    return (
        <Row>
            {/* New Subscribers Card */}
            <Col xs={12} md={6} lg={3}>
                <Card className="mb-4" style={cardStyle}>
                    <Card.Body
                        style={{
                            background: 'linear-gradient(to bottom right, #f5c2d5, #de4e7f)',
                            textAlign: 'center'
                        }}
                    >
                        <FaUserFriends size={48} style={{ color: '#de4e7f',margin:'auto' }} className="m-3" />
                        <Card.Title>New Subscribers</Card.Title>
                        {newSubscribers.length > 0 ? (
                            <Card.Text style={cardTextStyle}>
                                {currentSubscriber?.name || 'No Name'} <br />
                                <small>
                                    Created At:{' '}
                                    {new Date(currentSubscriber?.created_at).toLocaleString()}
                                </small>
                            </Card.Text>
                        ) : (
                            <p>No new subscribers</p>
                        )}
                    </Card.Body>
                </Card>
            </Col>

            {/* New Lists Card */}
            <Col xs={12} md={6} lg={3}>
                <Card className="mb-4" style={cardStyle}>
                    <Card.Body
                        style={{
                            background: 'linear-gradient(to right bottom, #34eb92, #23ad6a)',
                            textAlign: 'center'
                        }}
                    >
                        <FaList size={48} style={{ color: '#28a745' }} className="m-3" />
                        <Card.Title>New Lists</Card.Title>
                        {newLists.length > 0 ? (
                            <Card.Text style={cardTextStyle}>
                                {currentList?.name || 'No Name'} <br />
                                <small>
                                    Created At:{' '}
                                    {new Date(currentList?.created_at).toLocaleString()}
                                </small>
                            </Card.Text>
                        ) : (
                            <p>No new lists</p>
                        )}
                    </Card.Body>
                </Card>
            </Col>

            {/* New Campaigns Card */}
            <Col xs={12} md={6} lg={3}>
                <Card className="mb-4" style={cardStyle}>
                    <Card.Body
                        style={{
                            background: 'linear-gradient(to bottom right, #ffdab3, orange)',
                            textAlign: 'center'
                        }}
                    >
                        <FaBullhorn size={48} style={{ color: '#ffa726' }} className="m-3" />
                        <Card.Title>New Campaigns</Card.Title>
                        {newCampaigns.length > 0 ? (
                            <Card.Text style={cardTextStyle}>
                                {currentCampaign?.name || 'No Name'} <br />
                                <small>
                                    Created At:{' '}
                                    {new Date(currentCampaign?.created_at).toLocaleString()}
                                </small>
                            </Card.Text>
                        ) : (
                            <p>No new campaigns</p>
                        )}
                    </Card.Body>
                </Card>
            </Col>

            {/* Recent Events Card */}
            <Col xs={12} md={6} lg={3}>
                <Card className="mb-4" style={cardStyle}>
                    <Card.Body
                        style={{
                            background: 'linear-gradient(to bottom right, #a9d8d8, cadetblue)',
                            textAlign: 'center'
                        }}
                    >
                        <FaCalendarCheck size={48} style={{ color: 'cadetblue' }} className="m-3" />
                        <Card.Title>Recent Events</Card.Title>
                        {lastWeekEvents.length > 0 ? (
                            <div>
                                <Card.Text style={cardTextStyle}>
                                    <strong>{currentEvent?.name}</strong>
                                </Card.Text>
                                opened the email on{' '}
                                {new Date(currentEvent?.opened_at).toLocaleString()}
                            </div>
                        ) : (
                            <p>No recent events</p>
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default DashboardCards;
