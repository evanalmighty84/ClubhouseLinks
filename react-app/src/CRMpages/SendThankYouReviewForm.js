import React, { useState } from 'react';
import { Form, Button, Modal, Container } from 'react-bootstrap';
import axios from 'axios';
import '../CRMcomponents/CalendarScheduler.css';

const SendThankYouReviewForm = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.post('/server/crm_function/api/templates/send-thank-you-form', {
                email,
                name
            });
            setShowModal(true);
        } catch (err) {
            console.error('Error sending thank-you email:', err);
            setError('Failed to send email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="p-4 rounded" style={{ background: 'linear-gradient(to right bottom, rgb(255, 218, 179), orange)', maxWidth: 600 }}>
            <h3 className="text-center mb-4" style={{ color: '#fff' }}>Send a Thank You Email</h3>
            <Form onSubmit={handleSubmit}>
                <Form.Group controlId="formName">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter recipient's name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group controlId="formEmail" className="mt-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                        type="email"
                        placeholder="Enter recipient's email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </Form.Group>

                {error && <p className="text-danger mt-3">{error}</p>}

                <Button variant="success" type="submit" className="mt-4" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Thank You Email'}
                </Button>
            </Form>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Thanks Sent!</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>If you were satisfied with your service or interaction today with Silverado Roofing, please rate us on Google:</p>
                    <a href="https://g.page/r/CW1l1CsSbg4yEBM/review" target="_blank" rel="noopener noreferrer" className="btn btn-warning w-100">
                        Leave a Review
                    </a>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default SendThankYouReviewForm;
