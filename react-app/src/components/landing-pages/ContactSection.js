import React, { useEffect, useRef, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import axios from 'axios';
import { Form, Button, Row, Col, Alert } from 'react-bootstrap';
import './ContactUs.css';
import profilePic from '../profilepicevan.png'; // Update path as needed
import logo from '../../components/Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png'; // Replace with your actual logo



//old <WebServices> component
const ContactUs = () => {
    const heroRef = useRef(null);
    const [showLogo, setShowLogo] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        message: '',
    });
    const [status, setStatus] = useState(null);

    useEffect(() => {
        AOS.init({ duration: 800, once: true, offset: 120 });
    }, []);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
        <section id="contact-us" className="contact-section">
            <div className="container">
                {/* Hero */}
                <div className="row justify-content-center mb-5">
                    <div ref={heroRef} className="col-12 text-center">
                        <img
                            src={logo}
                            alt="Logo"
                            style={{
                                display: 'block',
                                margin: '0 auto',
                                height: 'auto',
                                width: '50%',
                                maxWidth: '300px',
                            }}
                        />
                        {showLogo && (
                            <h2
                                style={{
                                    backgroundImage: 'linear-gradient(to right, black, steelblue, #ff0080, black)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    color: 'transparent',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 'bold',
                                    fontFamily: 'cursive',
                                    marginTop: '1rem',
                                }}
                                data-aos="fade-down"
                            >
                               Get Started
                            </h2>
                        )}
                    </div>
                </div>

                {/* Contact Layout */}
                <Row className="align-items-center">
                    <Col md={4} className="text-center mb-4 mb-md-0">
                        <img
                            src={profilePic}
                            alt="Profile"
                            className="img-fluid rounded-circle shadow"
                            style={{ maxWidth: '250px' }}
                        />
                        <p className="mt-3" style={{ fontSize: '1.1rem' }}>
                            I'm here to help you elevate your business. Let’s chat about your goals!
                        </p>
                    </Col>

                    <Col md={8}>
                        <Form onSubmit={handleSubmit}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group controlId="formName" className="mb-3">
                                        <Form.Label>Name</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group controlId="formEmail" className="mb-3">
                                        <Form.Label>Email</Form.Label>
                                        <Form.Control
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group controlId="formPhone" className="mb-3">
                                        <Form.Label>Phone</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group controlId="formAddress" className="mb-3">
                                        <Form.Label>Address</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group controlId="formMessage" className="mb-3">
                                <Form.Label>Message</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                            <Button variant="primary" type="submit">
                                Submit
                            </Button>
                            {status && (
                                <Alert
                                    variant={status.success ? 'success' : 'danger'}
                                    className="mt-3"
                                >
                                    {status.message}
                                </Alert>
                            )}
                        </Form>
                    </Col>
                </Row>
            </div>
        </section>
    );
};

export default ContactUs;
