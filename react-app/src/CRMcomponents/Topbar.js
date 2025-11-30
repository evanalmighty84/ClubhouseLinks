import React, { useState } from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../CRMstyles/Topbar.css'; // Your custom CRMstyles
import logo from '../logo.png'; // Assuming your logo is saved in assets folder

const Topbar = () => {
    const [expanded, setExpanded] = useState(false); // Manage expanded state
    const navigate = useNavigate(); // For navigation

    // Handle navigation and collapse the navbar
    const handleNavigation = (path) => {
        console.log(`Navigating to ${path}`); // Log the path being navigated to
        navigate(path);
        setExpanded(false); // Collapse the navbar after navigation
    };

    const handleToggle = () => {
        console.log('Toggle clicked!'); // Log the toggle click
        setExpanded(!expanded); // Toggle expanded state
    };

    return (
        <Navbar
            className="topbar"
            expand="lg"
            expanded={expanded} // Control whether the navbar is expanded or collapsed
            onToggle={handleToggle} // Handle toggle click
        >
            {/* Replace text with your logo */}

            <Navbar.Brand
                onClick={() => handleNavigation('/dashboard')}
                style={{ cursor: 'pointer', textAlign: 'center', width: '60px' }}

            >
                <img
                    src={logo}
                    alt="Logo"
                    style={{ width: '40px', display: 'block', margin: '0 auto' }}
                />
                <small style={{ color: 'white', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                    Dashboard
                </small>
            </Navbar.Brand>

            <Navbar.Toggle aria-controls="basic-navbar-nav" onClick={handleToggle} />
            <Navbar.Collapse id="basic-navbar-nav" style={{paddingRight:'2px'}}>
                <p style={{ color: 'white', textAlign: 'center' }}>
                    {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).name : 'Guest'}
                </p>
                <Nav className="ms-auto">
                    <Nav.Link onClick={() => handleNavigation('/subscribers')}>Subscribers</Nav.Link>
                    <Nav.Link onClick={() => handleNavigation('/lists')}>Lists</Nav.Link>
                    <Nav.Link onClick={() => handleNavigation('/campaigns')}>Email Campaigns</Nav.Link>
                    <Nav.Link onClick={() => handleNavigation('/emailqueued')}>Email Log</Nav.Link>
                    <Nav.Link onClick={() => handleNavigation('/leads')}>Leads</Nav.Link>


            {/*        <Nav.Link onClick={() => handleNavigation('/app/signup')}>Sign Up</Nav.Link>*/}
    {/*                <Nav.Link onClick={() => handleNavigation('/app/signin')}>Sign In</Nav.Link>*/}
                    <Nav.Link onClick={() => handleNavigation('/settings')}>Account Settings</Nav.Link>
                    <Nav.Link onClick={() => handleNavigation('/appstore')}>Log Out</Nav.Link>
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
};

export default Topbar;
