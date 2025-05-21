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
        physical_address: '',
    });
    const [allLists, setAllLists] = useState([]);
    const [listIds, setListIds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubscriber();
        fetchLists();
    }, [id]);

    const fetchLists = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/lists/user/${user.id}`);
        const data = await response.json();
        setAllLists(data);
    };

    const fetchSubscriber = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${id}`);
            const data = await response.json();
            setSubscriber({
                email: data.email || '',
                name: data.name || '',
                phone_number: data.phone_number || '',
                physical_address: data.physical_address || ''
            });
            // Load assigned lists
            const listResponse = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${id}/lists`);
            const listData = await listResponse.json();
            setListIds(listData.map((list) => list.id));
        } catch (error) {
            console.error('Error fetching subscriber:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const userId = JSON.parse(localStorage.getItem('user')).id;
        try {
            await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...subscriber,
                    user_id: userId,
                    lists: listIds,
                }),
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

    const handleListChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions);
        const selectedListIds = selectedOptions.map((option) => Number(option.value));
        setListIds(selectedListIds);
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

                <Form.Group controlId="listSubscriptions" className="mt-3">
                    <Form.Label>Subscribed Lists</Form.Label>
                    <Form.Control
                        as="select"
                        multiple
                        value={listIds}
                        onChange={handleListChange}
                    >
                        {allLists.map((list) => (
                            <option key={list.id} value={list.id}>
                                {list.name}
                            </option>
                        ))}
                    </Form.Control>
                </Form.Group>

                <Button variant="primary" className="mt-3" onClick={handleSave}>
                    Save
                </Button>
            </Form>
        </div>
    );
};

export default SubscriberDetails;
