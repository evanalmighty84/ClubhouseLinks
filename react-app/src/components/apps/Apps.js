import React from 'react';
import { Container, Row, Col, Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

import CrmPicture from '../../components/CRM.png';
import CampaignPicture from '../CRMPicture.jpg';
import HOAPicture from '../../components/HOANewPicture.png';

import './appstore.css';

const Apps = () => {
    const navigate = useNavigate();

    const apps = [
        {
            title: 'Clubhouse Links HOA App',
            status: 'Available Now',
            image: HOAPicture,
            description:
                'Manage HOA communities, events, clubhouse activity, neighborhood communication, and local homeowner opportunities.',
            action: () => navigate('/hoa'),
        },
        {
            title: 'Clubhouse Links CRM App',
            status: 'Available Now',
            image: CrmPicture,
            description:
                'Track leads, manage clients, organize follow-ups, and stay connected with customers when it matters most.',
            action: () => navigate('/signin'),
        },
        {
            title: 'Clubhouse Links Email & Social Media Campaign App',
            status: 'Coming soon',
            image: CampaignPicture,
            description:
                'Create campaigns, schedule emails, manage social media outreach, and automate client communication from one dashboard.',
            action: () => navigate('/appstore'),
        },
    ];

    return (
        <main className="appstore-shell">
            <Container fluid className="appstore-container">
                <section className="appstore-hero">
                    <p className="appstore-eyebrow">CLUBHOUSE LINKS APP STORE</p>
                    <h1>Choose Your Clubhouse Links App</h1>
                    <p>
                        Three focused tools for communities, businesses, and marketing teams —
                        all built around local relationships and smarter lead generation.
                    </p>
                </section>

                <Row className="appstore-grid">
                    {apps.map((app, index) => (
                        <Col lg={4} md={6} sm={12} key={index} className="mb-4">
                            <button className="appstore-card" onClick={app.action}>
                                <div className="appstore-image-wrap">
                                    <Image
                                        src={app.image}
                                        alt={app.title}
                                        className="appstore-image"
                                        fluid
                                    />

                                    <span className="appstore-status">
                                        {app.status}
                                    </span>
                                </div>

                                <div className="appstore-card-body">
                                    <h2>{app.title}</h2>
                                    <p>{app.description}</p>
                                    <span className="appstore-cta">Open App</span>
                                </div>
                            </button>
                        </Col>
                    ))}
                </Row>
            </Container>
        </main>
    );
};

export default Apps;