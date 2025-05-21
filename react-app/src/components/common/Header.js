import React, { useState, useEffect } from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import { NavLink, useLocation } from 'react-router-dom';
import './Header.css';

import stockEmoji from "../memphis-social-engineering-with-good-slash-evil-smileys.png";
import eCommerceEmoji from "../memphis-shopping-cart-and-receipt-for-shopping.png";
import onlineReviewsEmoji from "../memphis-live-podcast-recording-with-lettering-on-air.png";
import aiProjectsEmoji from "../memphis-ai-and-artificial-neural-networks.png";
import samplePortfoliosEmoji from "../memphis-software-development-and-programming-on-laptop.png";
import localSportsEmoji from "../memphis-contacting-customer-support-over-phone.png";
import appStoreEmoji from "../memphis-cloud-storage-and-cloud-computing.png";

const Header = () => {
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsHeaderExpanded(false);
    }, [location]);

    const handleToggle = () => {
        setIsHeaderExpanded(!isHeaderExpanded);
    };

    const navItems = [
        { path: '/app/samplePortfolios', label: 'Website Builder', icon: samplePortfoliosEmoji },
        { path: '/aiProjects', label: 'AI Projects', icon: aiProjectsEmoji },
        { path: '/clubhouseMarketing', label: 'Clubhouse Marketing', icon: stockEmoji },
        { path: '/eCommerce', label: 'E-commerce/ Retail', icon: eCommerceEmoji },
        { path: '/onlineReviews', label: 'Online Reviews', icon: onlineReviewsEmoji },
        { path: '/contactUs', label: 'Contact/Hire', icon: localSportsEmoji },
        { path: '/appstore', label: 'Clubhouse Links Apps', icon: appStoreEmoji }
    ];

    const renderNavLink = (item) => (
        <Nav.Link
            key={item.path}
            onClick={handleToggle}
            className="navLinkHover"
            as={NavLink}
            to={item.path}
        >
            <div className="navlinkText">
                <img src={item.icon} alt={item.label} />
                <span>{item.label}</span>
            </div>
        </Nav.Link>
    );

    return (
        <header className="headerSection">
            <Navbar expanded={isHeaderExpanded} onToggle={handleToggle} collapseOnSelect expand="sm" variant="dark" className="menu-container">
                <Navbar.Toggle
                    aria-controls="responsive-navbar-nav"
                    className="custom-toggler"
                />
                <a className="hamburger-text" href="/app">
                    <span>Clubhouse Links</span>
                </a>
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="navbar-nav">
                        {navItems.map(renderNavLink)}
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </header>
    );
};

export default Header;
