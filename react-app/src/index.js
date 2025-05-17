import React from "react";
import { createRoot } from "react-dom/client";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation
} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

// Minimal dummy components
const Header = () => <div style={{ background: "#222", color: "white", padding: "1rem" }}>🌐 Header</div>;
const TopBar = () => <div style={{ background: "#555", color: "white", padding: "1rem" }}>📊 TopBar</div>;
const NonUserDashboard = () => <h1 style={{ padding: "2rem" }}>🏠 Home - NonUserDashboard is Working!</h1>;
const SignIn = () => <h1 style={{ padding: "2rem" }}>🔐 Sign In Page</h1>;

const ConditionalHeader = () => {
    const location = useLocation();
    const hideHeaderRoutes = ['/signin'];

    if (hideHeaderRoutes.includes(location.pathname)) return null;
    return <Header />;
};

const ProtectedRoute = ({ children }) => {
    const user = localStorage.getItem("user");
    if (!user) return <Navigate to="/signin" replace />;
    return children;
};

const App = () => {
    return (
        <Router>
            <ConditionalHeader />
            <Routes>
                <Route path="/" element={<NonUserDashboard />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/dashboard" element={<ProtectedRoute><h1 style={{ padding: '2rem' }}>📈 Protected Dashboard</h1></ProtectedRoute>} />
                <Route path="*" element={<div style={{ padding: '2rem', color: 'red' }}>❌ 404 / Route Not Found</div>} />
            </Routes>
        </Router>
    );
};

// New React 18+ rendering method
const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
