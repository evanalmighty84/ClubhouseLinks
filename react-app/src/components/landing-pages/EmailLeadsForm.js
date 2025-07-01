import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Form, Button, Alert, Container, Row, Col, Card } from 'react-bootstrap';
import { FaEnvelope } from 'react-icons/fa';
import emailImage from '../emailcampaign.png'; // your campaign preview image
import heroLogo from '../Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png';

const EmailLeadsForm = () => {
    const heroRef = useRef(null);
    const [showLogo, setShowLogo] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        message: 'I saw your email campaign and wanted to learn more about the offer you mentioned.',
    });

    const [status, setStatus] = useState({ success: null, message: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('https://crm-function-app.herokuapp.com/api/contactus', formData);
            setStatus({ success: true, message: 'Message sent successfully!' });
            setFormData({ name: '', email: '', phone: '', address: '', message: '' });
        } catch (err) {
            setStatus({ success: false, message: 'Something went wrong. Please try again later.' });
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const container = heroRef.current;
            if (container) {
                const oldH = container.getBoundingClientRect().height;
                setShowLogo(true);
                requestAnimationFrame(() => {
                    const newH = container.getBoundingClientRect().height;
                    container.style.height = `${oldH}px`;
                    container.style.transition = 'height 1.6s ease';
                    requestAnimationFrame(() => {
                        container.style.height = `${newH}px`;
                    });
                    setTimeout(() => {
                        container.style.height = '';
                        container.style.transition = '';
                    }, 100);
                });
            } else {
                setShowLogo(true);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={8}>
                    {/* Animated Logo Header */}
                    <div ref={heroRef} style={{ overflow: 'hidden', textAlign: 'center', marginBottom: '2rem' }}>
                        {showLogo && (
                            <>
                                <img
                                    src={heroLogo}
                                    alt="Email Logo"
                                    style={{
                                        display: 'block',
                                        margin: '0 auto',
                                        height: 'auto',
                                        maxWidth: '300px',
                                        borderRadius: '12px',
                                    }}
                                />
                                <h2
                                    style={{
                                        backgroundImage: 'linear-gradient(to right, #ff7e5f, #feb47b)',
                                        WebkitBackgroundClip: 'text',
                                        color: 'transparent',
                                        WebkitTextFillColor: 'transparent',
                                        fontWeight: 'bold',
                                        fontFamily: 'cursive',
                                        marginTop: '1rem',
                                    }}
                                >
                                    Email Campaign Lead Capture
                                </h2>
                            </>
                        )}
                    </div>

                    {/* Main Form Card */}
                    <Card
                        className="p-4 shadow"
                        style={{
                            background: 'linear-gradient(to right, #ff8a00, #e52e71)',
                            borderRadius: '1rem',
                            color: 'white',
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                        }}
                    >
                        <Card.Img
                            variant="top"
                            src={emailImage}
                            style={{
                                maxHeight: '200px',
                                objectFit: 'cover',
                                borderRadius: '0.5rem',
                                marginBottom: '1rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            }}
                        />

                        <Card.Title className="text-center mb-2" style={{ fontSize: '1.4rem', fontWeight: '700' }}>
                            <FaEnvelope style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            Follow Up From Our Recent Email
                        </Card.Title>

                        <p className="text-center" style={{ fontStyle: 'italic', fontWeight: '500', fontSize: '1.1rem', color: 'white' }}>
                            Interested in what you saw in our recent campaign? Leave your details below, and we’ll send you more
                            info or connect you directly with our team.
                        </p>

                        {status.message && (
                            <Alert variant={status.success ? 'success' : 'danger'}>
                                {status.message}
                            </Alert>
                        )}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3" controlId="formName">
                                <Form.Label>Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Your full name"
                                    required
                                    style={{ backgroundColor: 'white', color: '#000' }}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formEmail">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    required
                                    style={{ backgroundColor: 'white', color: '#000' }}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formPhone">
                                <Form.Label>Phone</Form.Label>
                                <Form.Control
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="(555) 123-4567"
                                    style={{ backgroundColor: 'white', color: '#000' }}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formAddress">
                                <Form.Label>Address</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="123 Main St, City, State"
                                    style={{ backgroundColor: 'white', color: '#000' }}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formMessage">
                                <Form.Label>Message</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    style={{ backgroundColor: 'white', color: '#000' }}
                                />
                            </Form.Group>

                            <div className="d-grid">
                                <Button
                                    type="submit"
                                    style={{
                                        background: 'linear-gradient(to right, #ff416c, #ff4b2b)',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        color: 'white',
                                    }}
                                >
                                    Submit Lead
                                </Button>
                            </div>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default EmailLeadsForm;
