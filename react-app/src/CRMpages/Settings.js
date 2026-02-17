import React, { useState, useEffect } from 'react';
import { Form, Button, Col, Row, Tab, Nav, Card } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../CRMstyles/Settings.css'; // Custom styles
const LEAD_API_BASE = 'https://crm-function-app-5d4de511071d.herokuapp.com/server/lead_function/api';
const API_BASE = 'https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api';

const Settings = () => {
    const [smtpSettings, setSmtpSettings] = useState({
        smtp_host: '',
        smtp_port: '',
        smtp_username: '',
        smtp_password: '',
        tls_enabled: true,
    });
    const [billingHistory, setBillingHistory] = useState([]);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // NEW: industries state
    const [industryOptions, setIndustryOptions] = useState([]);
    const [selectedIndustries, setSelectedIndustries] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [loadingBilling, setLoadingBilling] = useState(false);


    const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : null;

    useEffect(() => {
        if (userId) {
            fetchSmtpSettings(userId);
            fetchIndustryOptions().then(() => preloadUserIndustries(userId))
            // (Optional) if you add GET /users/:id/industries, preload selections here.
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchSmtpSettings(userId);
            fetchIndustryOptions().then(() => preloadUserIndustries(userId));
            fetchSubscriptionStatus(userId);
        }
    }, [userId]);

/*    const fetchSubscriptionStatus = async (userId) => {
        try {
            const res = await axios.get(`${LEAD_API_BASE}/stripe/subscription/${userId}`);
            setSubscription(res.data);
        } catch (err) {
            console.error('Failed to load subscription:', err);
        }
    };*/

    const fetchSubscriptionStatus = async (userId) => {
        try {
            const res = await axios.get(`${LEAD_API_BASE}/stripe/sync/${userId}`);
            setSubscription(res.data);
        } catch (err) {
            console.error('Failed to load subscription:', err);
        }
    };


    const handleSubscribe = async () => {
        try {
            setLoadingBilling(true);
            const res = await axios.post(`${LEAD_API_BASE}/stripe/checkout`, { userId });
            window.location.href = res.data.url; // Stripe Checkout
        } catch (err) {
            toast.error('Failed to start subscription');
        } finally {
            setLoadingBilling(false);
        }
    };

    const fetchBillingHistory = async (userId) => {
        try {
            const res = await axios.get(
                `${LEAD_API_BASE}/stripe/billing-history/${userId}`
            );
            setBillingHistory(res.data);
        } catch (err) {
            console.error("Failed to load billing history:", err);
        }
    };


    const handleCancelSubscription = async () => {
        if (!window.confirm('Are you sure you want to cancel your subscription?')) return;

        try {
            setLoadingBilling(true);
            await axios.post(`${LEAD_API_BASE}/stripe/cancel-subscription`, { userId });
            toast.success('Subscription canceled');
            fetchSubscriptionStatus(userId);
        } catch (err) {
            toast.error('Failed to cancel subscription');
        } finally {
            setLoadingBilling(false);
        }
    };

    const fetchSmtpSettings = async (userId) => {
        try {
            const response = await axios.get(
                `https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/smtp/smtp-settings/${userId}`
            );
            if (response.data) {
                setSmtpSettings(response.data);
            }
        } catch (error) {
            console.error('Error fetching SMTP settings:', error);

        }
    };

    // NEW: fetch industry options from backend (GET)
    const fetchIndustryOptions = async () => {
        try {
            const res = await axios.get(`${API_BASE}/users/industries`);
            setIndustryOptions(res.data?.industries || []);
        } catch (e) {
            console.error('Error fetching industries:', e);
            toast.error('Failed to load industries');
        }
    };
    const preloadUserIndustries = async (id) => {
        try {
            const res = await axios.get(`${API_BASE}/users/${id}/industries`);
            const saved = res.data?.userIndustriesArrayNormalized || res.data?.userIndustriesArrayRaw || [];
            setSelectedIndustries(saved);

            // If user has legacy values not in options, include them so they render checked
            setIndustryOptions((opts) => Array.from(new Set([...(opts || []), ...saved])));
        } catch (e) {
            // it's okay if user has none yet
            if (e?.response?.status !== 404) {
                console.error('Error preloading user industries:', e);
                toast.error('Failed to preload industries');
            }
        }
    };

    const handleSmtpChange = (e) => {
        setSmtpSettings({
            ...smtpSettings,
            [e.target.name]: e.target.value,
        });
    };

    const handleTlsToggle = () => {
        setSmtpSettings({
            ...smtpSettings,
            tls_enabled: !smtpSettings.tls_enabled,
        });
    };

    const handleSmtpSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(
                'https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/smtp/smtp-settings',
                {
                    ...smtpSettings,
                    userId,
                }
            );
            toast.success('SMTP settings saved successfully!');
        } catch (error) {
            console.error('Error saving SMTP settings:', error);
            toast.error('Failed to save SMTP settings');
        }
    };

    // Password submit (unchanged logic)
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/users/update-settings`, {
                userId,
                currentPassword,
                newPassword,
                // no industries here; industries live in their own tab now
            });
            toast.success('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
        } catch (error) {
            console.error('Error updating password:', error);
            toast.error('Failed to update password');
        }
    };

    // NEW: industries handlers + submit
    const allSelected =
        industryOptions.length > 0 && selectedIndustries.length === industryOptions.length;

    const handleIndustryToggle = (value) => {
        setSelectedIndustries((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
    };


    const handleSelectAllIndustries = (e) => {
        if (e.target.checked) setSelectedIndustries(industryOptions);
        else setSelectedIndustries([]);
    };

    const handleIndustrySubmit = async (e) => {
        e.preventDefault();

        // OPTIONAL: block from frontend before hitting backend
        if (userId !== 8) {
            toast.error("Only your account administrator can change industries. Please contact support@clubhouselinksmedia.com.");
            return;
        }

        try {
            const { data } = await axios.post(`${API_BASE}/users/update-settings`, {
                userId,
                industries: selectedIndustries,
            });

            // reflect canonical/normalized values if backend returns them
            if (Array.isArray(data?.userIndustriesArrayNormalized)) {
                setSelectedIndustries(data.userIndustriesArrayNormalized);
            }

            toast.success("Industries updated successfully!");
        } catch (error) {
            console.log("🔥 CATCH BLOCK HIT — INDUSTRY UPDATE FAILED");
            console.log("🔥 error.response:", error?.response);
            console.log("🔥 error.response.data:", error?.response?.data);

            const msg =
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                error?.message ||
                "Failed to update industries";

            // GUARANTEED toast
            toast.error(msg || "An error occurred updating industries.");
        }
    };


    return (
        <div className="settings-page p-4">
            <h2>Settings</h2>
            <Tab.Container defaultActiveKey="overview">
                <Row>
                    <Col sm={3}>
                        <Nav variant="pills" className="flex-column">

                            {/* 🔵 Lead Generation Settings */}
                            <div className="mt-2 mb-1 px-2 py-1 rounded" style={{ background: "#e6f2ff" }}>
                                <strong style={{ fontSize: "0.85rem", color: "#0056b3" }}>
                                    Lead Generation Settings
                                </strong>
                            </div>

                            <Nav.Item>
                                <Nav.Link eventKey="industries">Update Industries</Nav.Link>
                            </Nav.Item>
                            <div className="mt-4 mb-1 px-2 py-1 rounded" style={{ background: "#e8fff3" }}>
                                <strong style={{ fontSize: "0.85rem", color: "#0f7a4a" }}>
                                    Billing
                                </strong>
                            </div>

                            <Nav.Item>
                                <Nav.Link eventKey="billing">Billing & Subscription</Nav.Link>
                            </Nav.Item>


                            {/* 🟣 Email Campaign Settings */}
                            <div className="mt-4 mb-1 px-2 py-1 rounded" style={{ background: "#f3e8ff" }}>
                                <strong style={{ fontSize: "0.85rem", color: "#6a00a3" }}>
                                    Email Campaign Settings
                                </strong>
                            </div>

                            <Nav.Item>
                                <Nav.Link eventKey="form">Update SMTP Settings</Nav.Link>
                            </Nav.Item>


                            {/* 🔴 Administrator Settings */}
                            <div className="mt-4 mb-1 px-2 py-1 rounded" style={{ background: "#ffe6e6" }}>
                                <strong style={{ fontSize: "0.85rem", color: "#b30000" }}>
                                    Administrator Settings
                                </strong>
                            </div>

                            <Nav.Item>
                                <Nav.Link eventKey="password">User Password Settings</Nav.Link>
                            </Nav.Item>

                        </Nav>

                    </Col>

                    <Col sm={9}>
                        <Tab.Content>
                            <Tab.Pane eventKey="overview">
                                <Card className="p-3">
                                    <h4>Why Update SMTP Settings?</h4>
                                    <p>
                                        By updating your SMTP settings, you can send emails from your personalized or company email
                                        address, ensuring better recognition and trust among your clients.
                                    </p>
                                    <p>If you don't update, emails will be sent from the default "Clubhouse Links" email address.</p>
                                    <p>
                                        Services like Gmail, Apple, Outlook, and Yahoo allow app-specific passwords for added security.
                                        Follow the setup instructions in the next tab.
                                    </p>
                                </Card>
                            </Tab.Pane>

                            <Tab.Pane eventKey="setup">
                                <Card className="p-3">
                                    <h4>Setup Instructions</h4>
                                    <p>Watch this video or follow the step-by-step guide below:</p>
                                    <div className="video-container">
                                        <video width="100%" controls>
                                            <source
                                                src="https://res.cloudinary.com/duz4vhtcn/video/upload/f_auto:video,q_auto/v1735896237/Gmail_Settings_Setup_za609r.mp4"
                                                type="video/mp4"
                                            />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                    <h5>Steps to Configure Gmail SMTP:</h5>
                                    <ol>
                                        <li>Open your Gmail account and navigate to <b>Account Settings</b>.</li>
                                        <li>Enable <b>2-Step Verification</b> in the Security tab.</li>
                                        <li>Generate an <b>App Password</b> under the "App Passwords" section.</li>
                                        <li>Copy and paste the generated password into the <b>SMTP Password</b> field.</li>
                                    </ol>
                                </Card>
                            </Tab.Pane>

                            <Tab.Pane eventKey="form">
                                <Form onSubmit={handleSmtpSubmit}>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Group controlId="smtpHost">
                                                <Form.Label>SMTP Host</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="smtp_host"
                                                    value={smtpSettings.smtp_host}
                                                    onChange={handleSmtpChange}
                                                    placeholder="e.g., smtp.gmail.com"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group controlId="smtpPort">
                                                <Form.Label>SMTP Port</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    name="smtp_port"
                                                    value={smtpSettings.smtp_port}
                                                    onChange={handleSmtpChange}
                                                    placeholder="e.g., 587"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Group controlId="smtpUsername">
                                                <Form.Label>SMTP Username</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="smtp_username"
                                                    value={smtpSettings.smtp_username}
                                                    onChange={handleSmtpChange}
                                                    placeholder="Your email address"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group controlId="smtpPassword">
                                                <Form.Label>SMTP Password</Form.Label>
                                                <Form.Control
                                                    type="password"
                                                    name="smtp_password"
                                                    value={smtpSettings.smtp_password}
                                                    onChange={handleSmtpChange}
                                                    placeholder="Your SMTP password"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Group controlId="tlsEnabled">
                                                <Form.Check
                                                    type="checkbox"
                                                    label="Enable TLS"
                                                    checked={smtpSettings.tls_enabled}
                                                    onChange={handleTlsToggle}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Button variant="primary" type="submit">
                                        Save SMTP Settings
                                    </Button>
                                </Form>
                            </Tab.Pane>
                            <Tab.Pane eventKey="billing">
                                <Card className="p-3">
                                    <h4>Billing & Subscription</h4>

                                    <p>
                                        <strong>Status:</strong>{' '}
                                        {subscription?.status
                                            ? subscription.status.toUpperCase()
                                            : 'No subscription'}
                                    </p>

                                    {(subscription?.status === 'active' ||
                                        subscription?.status === 'trialing') && (
                                        <>
                                            <p>
                                                Your subscription is active. You can cancel anytime — your
                                                access will remain until the end of the billing period.
                                            </p>

                                            {/* 🔹 Billing History Section */}
                                            {billingHistory.length > 0 && (
                                                <div className="mb-4">
                                                    <h5 className="mt-3 mb-3">Billing History</h5>

                                                    <div className="border rounded">
                                                        {billingHistory.map((invoice, index) => (
                                                            <div
                                                                key={invoice.id}
                                                                className={`d-flex justify-content-between align-items-center p-3 ${
                                                                    index !== billingHistory.length - 1
                                                                        ? "border-bottom"
                                                                        : ""
                                                                }`}
                                                            >
                                                                <div>
                                                                    <div className="fw-semibold">
                                                                        {new Date(invoice.date).toLocaleDateString()}
                                                                    </div>
                                                                    <small className="text-muted">
                                                                        ${invoice.amount} {invoice.currency}
                                                                    </small>
                                                                </div>

                                                                <div
                                                                    className={`fw-semibold ${
                                                                        invoice.status === "paid"
                                                                            ? "text-success"
                                                                            : "text-danger"
                                                                    }`}
                                                                >
                                                                    {invoice.status.toUpperCase()}
                                                                </div>

                                                                <a
                                                                    href={invoice.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-primary text-decoration-none"
                                                                >
                                                                    View Receipt →
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                variant="danger"
                                                onClick={handleCancelSubscription}
                                                disabled={loadingBilling}
                                            >
                                                Cancel Subscription
                                            </Button>
                                        </>
                                    )}

                                    {(!subscription?.status ||
                                        subscription.status === "inactive" ||
                                        subscription.status === "canceled") && (
                                        <>
                                            <p>
                                                You are not currently subscribed. Subscribe to enable all
                                                features.
                                            </p>

                                            <Button
                                                variant="success"
                                                onClick={handleSubscribe}
                                                disabled={loadingBilling}
                                            >
                                                Subscribe
                                            </Button>
                                        </>
                                    )}
                                </Card>
                            </Tab.Pane>



                            {/* NEW: industries-only tab */}
                            <Tab.Pane eventKey="industries">
                                <Card className="p-3">
                                    <h4>Update Industries</h4>
                                    <div className="mt-2 mb-3">
                                        <h5 className="mb-2">Select Your Industries (choose all that apply)</h5>
                                        <Form.Check
                                            type="checkbox"
                                            id="industries-select-all"
                                            label="Select All"
                                            checked={allSelected}
                                            onChange={handleSelectAllIndustries}
                                            className="mb-2"
                                        />
                                        <Form onSubmit={handleIndustrySubmit}>
                                            <div className="industry-grid mb-3">
                                                {industryOptions.map((ind) => (
                                                    <Form.Check
                                                        key={ind.value}
                                                        type="checkbox"
                                                        id={`industry-${ind.value}`}
                                                        label={ind.label}
                                                        checked={selectedIndustries.includes(ind.value)}
                                                        onChange={() => handleIndustryToggle(ind.value)}
                                                    />
                                                ))}

                                            </div>
                                            <Button className="mt-1" variant="primary" type="submit">
                                                Save Industries
                                            </Button>
                                        </Form>

                                    </div>
                                </Card>
                            </Tab.Pane>

                            {/* Password tab unchanged */}
                            <Tab.Pane eventKey="password">
                                <Card className="p-3">
                                    <h4>Change Password</h4>
                                    <Form onSubmit={handlePasswordSubmit}>
                                        <Form.Group controlId="currentPassword" className="mt-2">
                                            <Form.Label>Current Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                required
                                            />
                                        </Form.Group>

                                        <Form.Group controlId="newPassword" className="mt-2">
                                            <Form.Label>New Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                            />
                                        </Form.Group>

                                        <Button className="mt-3" variant="primary" type="submit">
                                            Update Password
                                        </Button>
                                    </Form>
                                </Card>
                            </Tab.Pane>
                        </Tab.Content>
                    </Col>
                </Row>
            </Tab.Container>
        </div>
    );
};

export default Settings;
