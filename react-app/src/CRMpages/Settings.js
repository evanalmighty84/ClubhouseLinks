import React, { useState, useEffect } from 'react';
import { Form, Button, Col, Row, Tab, Nav, Card } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../CRMstyles/Settings.css'; // Ensure custom styles if needed

const Settings = () => {
    const [smtpSettings, setSmtpSettings] = useState({
        smtp_host: '',
        smtp_port: '',
        smtp_username: '',
        smtp_password: '',
        tls_enabled: true,
    });

    const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : null;

    useEffect(() => {
        if (userId) {
            fetchSmtpSettings(userId);
        }
    }, [userId]);

    // Fetch the user's existing SMTP settings
    const fetchSmtpSettings = async (userId) => {
        try {
            const response = await axios.get(`/server/crm_function/api/smtp/smtp-settings/${userId}`);
            if (response.data) {
                setSmtpSettings(response.data);
            }
        } catch (error) {
            console.error('Error fetching SMTP settings:', error);
            toast.error('Failed to load SMTP settings');
        }
    };

    // Handle SMTP input changes
    const handleSmtpChange = (e) => {
        setSmtpSettings({
            ...smtpSettings,
            [e.target.name]: e.target.value,
        });
    };

    // Handle TLS toggle
    const handleTlsToggle = () => {
        setSmtpSettings({
            ...smtpSettings,
            tls_enabled: !smtpSettings.tls_enabled,
        });
    };

    // Submit the SMTP settings
    const handleSmtpSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/server/crm_function/api/smtp/smtp-settings', {
                ...smtpSettings,
                userId,
            });
            toast.success('SMTP settings saved successfully!');
        } catch (error) {
            console.error('Error saving SMTP settings:', error);
            toast.error('Failed to save SMTP settings');
        }
    };

    return (
        <div className="settings-page p-4">
            <h2>SMTP Settings</h2>
            <Tab.Container defaultActiveKey="overview">
                <Row>
                    <Col sm={3}>
                        <Nav variant="pills" className="flex-column">
                            <Nav.Item>
                                <Nav.Link eventKey="overview">Overview</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="setup">Setup Instructions</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="form">Update SMTP Settings</Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </Col>
                    <Col sm={9}>
                        <Tab.Content>
                            <Tab.Pane eventKey="overview">
                                <Card className="p-3">
                                    <h4>Why Update SMTP Settings?</h4>
                                    <p>
                                        By updating your SMTP settings, you can send emails from your personalized or company email address, ensuring better recognition and trust among your clients.
                                    </p>
                                    <p>
                                        If you don't update, emails will be sent from the default "Clubhouse Links" email address, which might not resonate with your audience.
                                    </p>
                                    <p>
                                        Services like Gmail, Apple, Outlook, and Yahoo allow app-specific passwords for added security. Follow the setup instructions in the next tab to configure your SMTP settings.
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
                                                src="https://res.cloudinary.com/duz4vhtcn/video/upload/v1735896237/Gmail_Settings_Setup_za609r.mp4"
                                                type="video/mp4"
                                            />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                    <h5>Steps to Configure Gmail SMTP:</h5>
                                    <ol>
                                        <li>Open your Gmail account and navigate to <b>Account Settings</b>.</li>
                                        <li>Go to the <b>Security</b> tab and enable <b>2-Step Verification</b>.</li>
                                        <li>Generate an <b>App Password</b> under the "App Passwords" section.</li>
                                        <li>Copy the generated password and paste it into the <b>SMTP Password</b> field in the form below.</li>
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
                        </Tab.Content>
                    </Col>
                </Row>
            </Tab.Container>
        </div>
    );
};

export default Settings;
