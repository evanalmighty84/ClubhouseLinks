// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Modal from 'react-bootstrap/Modal';
import './Header.css';

import leadIcon from "../LeadGeneration.png";
import teamIcon from "../OurTeam.png";
import stockEmoji from "../newestservice4.png";
import eCommerceEmoji from "../ClientPortfolios (1).png";
import onlineReviewsEmoji from "../ContactUs.png";
import aiProjectsEmoji from "../ReportsSmartCrop.png";
import samplePortfoliosEmoji from "../CRMSmartCrop.png";
import appStoreEmoji from "../WebsiteDesignSmartCrop.png";
import emailGeneration from "../email-leads.png"
import socialGeneration from "../social-lead-generation.png"
import websiteGeneration from "../websiteleadgeneration (1).png"
import bidGeneration from "../bidding-leads.webp"
import MarkandTrish from "../markandtrish.jpg"
import PodcastImage from '../profilepicevan.png';
import DavidDixon from '../JodiandGregg.JPG'
import JasonGardner from '../JasonGardner.jpeg'
import Plumbing from '../services/images/plumbing.png'

const Header = () => {
    const [expanded, setExpanded] = useState(false);
    const [showLeadsModal, setShowLeadsModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setExpanded(false);
    }, [location]);

    useEffect(() => {
        setShowLeadsModal(false);
        setShowTeamModal(false);
    }, [location]);


    const handleToggle = () => setExpanded(!expanded);

    // Render a generic link with icon + label
    const NavItem = ({ to, icon, label }) => (
        <Nav.Link
            as={NavLink}
            to={to}
            onClick={handleToggle}
            className="navLinkHover"
        >
            <div className="navlinkText">
                <img src={icon} alt={label}/>
                <span>{label}</span>
            </div>
        </Nav.Link>
    );

    return (
        <>
            <header className="headerSection">
                <Navbar
                    expanded={expanded}
                    onToggle={handleToggle}
                    collapseOnSelect
                    expand="sm"
                    variant="dark"
                    className="menu-container"
                >
                    <Navbar.Toggle aria-controls="responsive-navbar-nav" className="custom-toggler" />
                    <a className="hamburger-text" href="/app">
                        <span>Clubhouse Links</span>
                    </a>
                    <Navbar.Collapse id="responsive-navbar-nav">
                        <Nav className="navbar-nav">

                            {/* Lead Generation triggers modal */}
                            <Nav.Link onClick={() => setShowLeadsModal(true)} className="navLinkHover">
                                <div className="navlinkText">
                                    <img src={leadIcon} alt="Lead Generation"/>
                                    <span>Lead Generation</span>
                                </div>
                            </Nav.Link>

                            {/* Our Team triggers modal */}
                            <Nav.Link onClick={() => setShowTeamModal(true)} className="navLinkHover">
                                <div className="navlinkText">
                                    <img src={teamIcon} alt="Our Team"/>
                                    <span>Our Team</span>
                                </div>
                            </Nav.Link>


                            {/* Other static links */}
                            <NavItem to="/aiProjects" icon={stockEmoji} label="Services" />
                            <NavItem to="/ClientPortfolios"        icon={eCommerceEmoji} label="Client Portfolios" />
                            <NavItem to="/clubhouseMarketing"        icon={aiProjectsEmoji} label="Reports" />
                            <NavItem to="/contactus"     icon={onlineReviewsEmoji} label="Contact Us" />
                            <NavItem to="/signIn"  icon={samplePortfoliosEmoji} label="CRM" />
                            <NavItem to="/appstore"          icon={appStoreEmoji}   label="Clubhouse Links Apps" />

                        </Nav>
                    </Navbar.Collapse>
                </Navbar>
            </header>

            {/* Lead Generation Modal */}
            <Modal
                show={showLeadsModal}
                onHide={() => setShowLeadsModal(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>                  <h2
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, black, steelblue, #ff0080, black)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 'bold',
                            fontFamily: 'cursive',
                            marginTop: '1rem',
                            textAlign:'center'
                        }}
                        data-aos="fade-down"
                        data-aos-delay="200"
                    >
                        Lead Generation and Bids
                    </h2></Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Modal.Body style={{margin: '0 auto',padding:'0px'}}>
                        <div
                            style={{
                                margin: '0 auto',
                                padding:'0px',
                                background: 'linear-gradient(to right, black, steelblue, #ff0080, black)',
                            }}
                        >
                            <Nav className="flex-column text-center">
                                <NavItem
                                    to="/Social"
                                    icon={socialGeneration}
                                    label={<span style={{fontSize:'25px' }}>Social Media Lead Generation

                                </span>}                                />
                                <NavItem
                                    to="/Bids"
                                    icon={bidGeneration}
                                    label={<span style={{ fontSize:'25px' }}>Bid Lead Generation

                                </span>}                                />
                                <NavItem
                                    to="/leads/website-leads"
                                    icon={websiteGeneration}
                                    label={<span style={{ fontSize:'25px' }}>Website Lead Generation

                                </span>}
                                />
                                <NavItem
                                    to="/leads/email-leads"
                                    icon={emailGeneration}
                                    label={<span style={{ fontSize:'25px' }}>Email Lead Generation

                                </span>}  />
                            </Nav>
                        </div>
                    </Modal.Body>

                </Modal.Body>
            </Modal>

            {/* Our Team Modal */}
            <Modal
                show={showTeamModal}
                onHide={() => setShowTeamModal(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Our Team Services</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '2rem' }}>
                    <div style={{ display: 'grid', gap: '2rem' }}>


                        {/* Graphic Design */}
                        <div
                            onClick={() => window.location.href = '/Plumbing'}
                            style={{ textAlign: 'center', cursor: 'pointer' }}
                        >
                            <img
                                src={Plumbing}
                                alt="Graphic Design"
                                style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '0.75rem' }}
                            />
                            <h4 style={{ fontSize: '1.4rem', color: '#111', marginBottom: '0.5rem' }}>Handyman/Plumbing</h4>
                            <p style={{ fontSize: '1rem', color: '#555', maxWidth: '400px', margin: '0 auto' }}>
                                Randy and Denys will provide you with great value at minimal cost with our plumbing and handyman services. All technicians are licensed and have been thoroughly vetted.
                                Whether it's a leaky faucet or a garbage disposal removal, we'll make sure it's done right.
                                `,                            </p>
                        </div>
                        {/* Construction Team */}
                        <div
                            onClick={() => window.location.href = '/Construction'}
                            style={{ textAlign: 'center', cursor: 'pointer' }}
                        >
                            <img
                                src={MarkandTrish}
                                alt="Construction Team Lead"
                                style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '0.75rem' }}
                            />
                            <h4 style={{ fontSize: '1.4rem', color: '#111', marginBottom: '0.5rem' }}>Construction Team Lead</h4>
                            <p style={{ fontSize: '1rem', color: '#555', maxWidth: '400px', margin: '0 auto' }}>
                                Our construction professionals bring decades of experience in general contracting, custom projects, and reliable residential services.
                            </p>
                        </div>

                        {/* Graphic Design */}
                        <div
                            onClick={() => window.location.href = '/our-team/graphic-design'}
                            style={{ textAlign: 'center', cursor: 'pointer' }}
                        >
                            <img
                                src={PodcastImage}
                                alt="Graphic Design"
                                style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '0.75rem' }}
                            />
                            <h4 style={{ fontSize: '1.4rem', color: '#111', marginBottom: '0.5rem' }}>Graphic Design Team Lead</h4>
                            <p style={{ fontSize: '1rem', color: '#555', maxWidth: '400px', margin: '0 auto' }}>
                                From branding to marketing visuals, our design team crafts stunning, purposeful graphics that elevate your image and message.
                            </p>
                        </div>

                        {/* Pool Service */}
                        <div
                            onClick={() => window.location.href = '/Pool'}
                            style={{ textAlign: 'center', cursor: 'pointer' }}
                        >
                            <img
                                src={DavidDixon}
                                alt="Pool Service"
                                style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '0.75rem' }}
                            />
                            <h4 style={{ fontSize: '1.4rem', color: '#111', marginBottom: '0.5rem' }}>Pool Service Team Lead</h4>
                            <p style={{ fontSize: '1rem', color: '#555', maxWidth: '400px', margin: '0 auto' }}>
                                Keep your pool clean, safe, and looking great with our dependable weekly service, chemical balance, and equipment checks.
                            </p>
                        </div>

                        {/* Athletic Apparel */}
                        <div
                            onClick={() => window.location.href = '/Apparel'}
                            style={{ textAlign: 'center', cursor: 'pointer' }}
                        >
                            <img
                                src={JasonGardner}
                                alt="Athletic Apparel"
                                style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '0.75rem' }}
                            />
                            <h4 style={{ fontSize: '1.4rem', color: '#111', marginBottom: '0.5rem' }}>Athletic Apparel Team Lead</h4>
                            <p style={{ fontSize: '1rem', color: '#555', maxWidth: '400px', margin: '0 auto' }}>
                                Outfit your team with high-quality custom uniforms, sublimated designs, and branded gear tailored to your program.
                            </p>
                        </div>
                    </div>
                </Modal.Body>

            </Modal>
        </>
    );
};

export default Header;
