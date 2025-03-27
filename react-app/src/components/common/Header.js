import React, { useState, useEffect } from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import { NavLink, useLocation } from 'react-router-dom';
import stockEmoji from "../memphis-social-engineering-with-good-slash-evil-smileys.png";
import eCommerceEmoji from "../memphis-shopping-cart-and-receipt-for-shopping.png";
import onlineReviewsEmoji from "../memphis-live-podcast-recording-with-lettering-on-air.png";
import aiProjectsEmoji from "../memphis-ai-and-artificial-neural-networks.png";
import samplePortfoliosEmoji from "../memphis-software-development-and-programming-on-laptop.png";
import localSportsEmoji from "../memphis-contacting-customer-support-over-phone.png";
import appStoreEmoji from "../memphis-cloud-storage-and-cloud-computing.png";
import homeImg from '../icons8-home-500.svg'; // Update the path to your home image
import './Header.css';

const Header = () => {
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsHeaderExpanded(false); // Collapse the navbar on component mount
    }, []);

    const handleToggle = () => {
        setIsHeaderExpanded(!isHeaderExpanded);
    };

    const getBorderColor = (path) => {
        switch (path) {
            case '/app/samplePortfolios': return 'linear-gradient(to bottom right, #f7e0c4, brown)';
            case '/app/aiProjects': return 'linear-gradient(to bottom right, #b0d4e3, steelblue';
            case '/app/onlineReviews': return 'linear-gradient(to bottom right, #f5c2d5, #de4e7f)';
            case '/app/eCommerce': return 'linear-gradient(to right bottom, #34eb92, #23ad6a';
            case '/app/clubhouseMarketing': return 'linear-gradient(to bottom right, #a9d8d8, cadetblue';
            case '/app/contactUs': return 'linear-gradient(to bottom right, #ffecb3, gold';
            case '/app/appstore': return 'linear-gradient(to bottom right, #ffdab3, orange';
            default: return 'transparent';
        }
    };

    const getNavLinkStyle = (path) => {
        let style = {
            color: 'white', // Default text color
            backgroundColor: 'transparent', // Default background color
            borderWidth: '.4em',
            borderStyle: 'solid',
            borderColor: 'white' // Default border color
        };
        switch (path) {
            case '/app/samplePortfolios2':
                style.background = 'linear-gradient(to bottom right, #f7e0c4, brown';
                style.color = 'white';
                style.borderColor = 'white';
                style.color = 'brown';
                break;
            case '/app/aiProjects':
                style.background = 'linear-gradient(to bottom right, #b0d4e3, steelblue';
                style.color = 'white';
                style.borderColor = 'white';
                style.color = 'steelblue';
                break;
            case '/app/onlineReviews':
                style.background = 'linear-gradient(to bottom right, #f5c2d5, #de4e7f';
                style.color = 'white';
                style.borderColor = 'white';
                style.color = "#de4e7f";
                break;
            case '/app/eCommerce':
                style.background = 'linear-gradient(to right bottom, #34eb92, #23ad6a';
                style.color = 'white';
                style.borderColor = 'white';
                style.color = "#008B00";
                break;
            case '/app/clubhouseMarketing':
                style.background = 'linear-gradient(to bottom right, #a9d8d8, cadetblue)';
                style.color = 'white';
                style.borderColor = 'white';
                style.color = 'cadetblue';
                break;
            case '/app/contactUs':
                style.background = 'linear-gradient(to bottom right, #ffecb3, #ffd700)';
                style.color = 'white';
                style.borderColor = 'white'; // Changed to match the visual intent (gold and yellow have different hex values)
                style.color = 'gold';
                break;
            case '/app/appstore':
                style.background = 'linear-gradient(to bottom right, #ffdab3, orange';
                style.color = 'white';
                style.borderColor = 'white';
                style.color = 'orange';
                break;
            default:
                style.borderColor = 'white';
                style.color = 'white';
        }

        return style;
    };

    const navItems = [
        { path: '/app/samplePortfolios', label: 'Website Builder', icon: samplePortfoliosEmoji, isDropdown: true, dropdownItems: [
                { path: '/app/samplePortfolio1', label: 'Sample Portfolio 1' },
                { path: '/app/samplePortfolio2', label: 'Sample Portfolio 2' },
                { path: '/app/samplePortfolio3', label: 'Sample Portfolio 3' }
            ]},
        { path: '/app/aiProjects', label: 'AI Projects', icon: aiProjectsEmoji },
        { path: '/app/clubhouseMarketing', label: 'Clubhouse Marketing', icon: stockEmoji },
        { path: '/app/eCommerce', label: 'E-commerce/ Retail', icon: eCommerceEmoji },
        { path: '/app/onlineReviews', label: 'Online Reviews', icon: onlineReviewsEmoji },
        { path: '/app/contactUs', label: 'Contact/Hire', icon: localSportsEmoji },
        { path: '/app/appstore', label: 'Clubhouse Links Apps', icon: appStoreEmoji }
    ];

    const renderNavLink = (item) => (

        <Nav.Link
            key={item.path}
            onClick={handleToggle}
            className="evanston-tavern navLinkHover"
            style={{
                ...getNavLinkStyle(item.path),
                flex: '1 0 0', // Equal width for each link
                justifyContent: 'center',
                alignItems: 'center', // Center content vertically
            }}
            as={NavLink}
            to={item.path}
        >
            <div className="navlinkText" style={{
                width: '100%',
                flexDirection: 'column', // Stack items vertically
                justifyContent: 'center', // Center vertically
                alignItems: 'center', // Center horizontally
                textAlign: 'center',
                color: 'white',
                border: getNavLinkStyle(location.pathname === item.path ? item.path : '/').borderWidth + ' solid',
                borderColor: getNavLinkStyle(location.pathname === item.path ? item.path : '/').backgroundColor
            }}>
                <img style={{ maxWidth: '100%', height: 'auto', marginBottom: '5px', border: 'none' }} src={item.icon} alt={item.label}/>
                <div>{item.label}</div>
            </div>
        </Nav.Link>




    );



    return (
        <div className="headerSection">
            <Navbar className={`menu-container ${isHeaderExpanded ? 'open' : ''}`} onToggle={handleToggle} expanded={isHeaderExpanded} variant="dark" collapseOnSelect expand="sm">
                <Navbar.Toggle
                    className="custom-toggler"
                    style={{
                        borderRadius: '0px',
                        borderRight: 'none',
                        backgroundImage: "url('data:image/svg+xml,%3csvg viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3e%3cpath stroke='white' stroke-width='2' stroke-linecap='round' stroke-miterlimit='10' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e\")"
                    }}
                    aria-controls="basic-navbar-nav"
                />
                <a className="hamburger-text" href={'/app/'}> <span>Clubhouse Links</span></a>
                <Navbar.Collapse id="basic-navbar-nav" style={{ border: 'solid', borderWidth: '.5em', borderColor: getBorderColor(location.pathname) }}>
                    <Nav className="mr-auto" style={{ display: 'flex', width: '100%' }}>
                        {navItems.map(renderNavLink)}
                    </Nav>
                </Navbar.Collapse>
                <Nav.Link
                    as={NavLink}
                    to="/"
                    className="ml-auto"
                    style={{
                        display: isHeaderExpanded ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                </Nav.Link>
            </Navbar>
        </div>
    );
};

export default Header;
