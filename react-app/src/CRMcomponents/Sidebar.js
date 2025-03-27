import React, { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import '../CRMstyles/Sidebar.css';

const Sidebar = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <>
            {/* Topbar for mobile (portrait and landscape mode) */}
            <div className="topbar">
                <button className="menu-btn" onClick={toggleSidebar}>
                    {sidebarOpen ? <FaTimes /> : <FaBars />}
                </button>
                <h2>MyApp</h2>
            </div>

            {/* Sidebar navigation */}
            <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <nav>
                    <ul>
                        <li>
                            <Link to="/dashboard" onClick={toggleSidebar}>Dashboard</Link>
                        </li>
                        <li>
                            <Link to="/lists" onClick={toggleSidebar}>Lists</Link>
                        </li>
                        <li>
                            <Link to="/subscribers" onClick={toggleSidebar}>Subscribers</Link>
                        </li>
                        <li>
                            <Link to="/campaigns" onClick={toggleSidebar}>Campaigns</Link>
                        </li>
                        <li>
                            <Link to="/settings" onClick={toggleSidebar}>Settings</Link>
                        </li>
                        <li>
                            <Link to="/logout" onClick={toggleSidebar}>Log Out</Link>
                        </li>
                    </ul>
                </nav>
            </div>
        </>
    );
};

export default Sidebar;
