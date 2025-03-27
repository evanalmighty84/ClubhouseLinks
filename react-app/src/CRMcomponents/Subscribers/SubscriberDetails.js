import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';

const SubscriberDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [subscriber, setSubscriber] = useState({
        email: '',
        name: '',
        phone_number: '',
        physical_address: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubscriber();
    }, [id]);

    const fetchSubscriber = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/server/crm_function/api/subscribers/${id}`);
            const data = await response.json();
            setSubscriber({
                email: data.email || '',
                name: data.name || '',
                phone_number: data.phone_number || '',
                physical_address: data.physical_address || ''
            });
        } catch (error) {
            console.error('Error fetching subscriber:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const userId = JSON.parse(localStorage.getItem('user')).id;
        try {
            await fetch(`/server/crm_function/api/subscribers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...subscriber, user_id: userId }),
            });
            navigate('/subscribers');
        } catch (error) {
            console.error('Error updating subscriber:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSubscriber((prev) => ({ ...prev, [name]: value }));
    };

    return loading ? (
        <p>Loading...</p>
    ) : (
        <div className="subscriber-details p-4">
            <h2>Subscriber Details</h2>
            <Form>
                <Form.Group controlId="email">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                        type="email"
                        name="email"
                        value={subscriber.email}
                        onChange={handleChange}
                        required
                    />
                </Form.Group>

                <Form.Group controlId="name" className="mt-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                        type="text"
                        name="name"
                        value={subscriber.name}
                        onChange={handleChange}
                    />
                </Form.Group>

                <Form.Group controlId="phone_number" className="mt-3">
                    <Form.Label>Phone Number</Form.Label>
                    <Form.Control
                        type="text"
                        name="phone_number"
                        value={subscriber.phone_number}
                        onChange={handleChange}
                    />
                </Form.Group>

                <Form.Group controlId="physical_address" className="mt-3">
                    <Form.Label>Physical Address</Form.Label>
                    <Form.Control
                        as="textarea"
                        name="physical_address"
                        rows={2}
                        value={subscriber.physical_address}
                        onChange={handleChange}
                    />
                </Form.Group>

                <Button variant="primary" className="mt-3" onClick={handleSave}>
                    Save
                </Button>
            </Form>
        </div>
    );
};

export default SubscriberDetails;
