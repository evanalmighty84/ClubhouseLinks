import React from 'react';
import Topbar from './Topbar';  // Import the Topbar component
import '../CRMstyles/Layout.css';
import { Container } from 'react-bootstrap';  // Use Bootstrap container

const Layout = ({ children }) => {
    return (
        <div className="main-layout">
            <Topbar />
            <Container fluid className="content">
                {children}  {/* Render the page's content here */}
            </Container>
        </div>
    );
};

export default Layout;
