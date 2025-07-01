import React, { useState } from 'react';
import axios from 'axios';
import { Form, Button, Alert, Container, Row, Col, Card } from 'react-bootstrap';
import CommercialLoan from '../commercialloan.jpeg'
import { FaFacebookF } from 'react-icons/fa';


const WebsiteLeadsForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        message: 'I’m interested in your new SmartHome Security Camera. Can you tell me more about setup and monthly pricing?',
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

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={8}>
                    <Card className="p-4 shadow">
                        <Card.Title className="text-center mb-4" style={{ fontSize: '1.5rem' }}>
                            <FaFacebookF style={{ color: '#1877F2', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            Get Approved for a Commercial Loan Today!
                        </Card.Title>

                        <Card.Img
                            variant="top"
                            src={CommercialLoan} // Update with actual path
                            style={{
                                maxHeight: '200px',
                                objectFit: 'cover',
                                borderRadius: '0.5rem',
                                marginBottom: '1rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}
                        />

                        <p className="text-center" style={{ fontStyle: 'italic', fontWeight: '500', fontSize: '1.1rem', color: '#333' }}>
                            Need funding for your business? <strong>Get $10K–$1M next-day funded</strong> with great rates and access to top commercial property deals. Whether you're expanding or launching something new, we’ve helped thousands of entrepreneurs secure fast, flexible loans — and we can help you too.
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
                                />
                            </Form.Group>

                            <div className="d-grid">
                                <Button variant="primary" type="submit">Send Message</Button>
                            </div>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default WebsiteLeadsForm;
