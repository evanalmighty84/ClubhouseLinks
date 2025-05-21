import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';

const SubscribersForm = ({ initialSubscriber = {} }) => {
    const [email, setEmail] = useState(initialSubscriber.email || '');
    const [name, setName] = useState(initialSubscriber.name || '');
    const [phone, setPhone] = useState(initialSubscriber.phone_number || '');
    const [address, setAddress] = useState(initialSubscriber.physical_address || '');
    const [allLists, setAllLists] = useState([]);
    const [listIds, setListIds] = useState([]);
    const [tags, setTags] = useState(initialSubscriber.tags ? initialSubscriber.tags.join(',') : '');
    const [error, setError] = useState('');
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.id) {
            setError('User is not authenticated. Please log in.');
            return;
        }
        const userId = user.id;

        fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/lists/user/${userId}`)
            .then(response => response.json())
            .then(data => setAllLists(data))
            .catch(err => console.error('Error fetching lists:', err));

        if (id) {
            fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${id}`)
                .then(response => response.json())
                .then(subscriber => {
                    setEmail(subscriber.email);
                    setName(subscriber.name);
                    setPhone(subscriber.phone_number || '');
                    setAddress(subscriber.physical_address || '');
                    setTags(subscriber.tags ? subscriber.tags.join(',') : '');
                    fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${id}/lists`)
                        .then(response => response.json())
                        .then(listData => {
                            const selectedListIds = listData.map(list => list.id);
                            setListIds(selectedListIds);
                        })
                        .catch(err => console.error('Error fetching subscriber lists:', err));
                })
                .catch(err => console.error('Error fetching subscriber:', err));
        }
    }, [id]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.id) {
            setError('User is not authenticated. Please log in.');
            return;
        }
        const userId = user.id;
        const subscriberData = {
            email,
            name,
            phone_number: phone,
            physical_address: address,
            lists: listIds,
            tags: tags.split(',').map(tag => tag.trim()),
            user_id: userId,
        };

        const method = id ? 'PUT' : 'POST';
        const endpoint = id
            ? `https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${id}/edit`
            : 'https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/create';

        fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriberData),
        })
            .then(response => response.json())
            .then(() => {
                navigate('/subscribers');
            })
            .catch(err => console.error('Error saving subscriber:', err));
    };

    const handleRemoveSelectedList = (listId) => {
        setListIds(listIds.filter(id => id !== listId));
    };

    const handleAddList = (listId) => {
        if (!listIds.includes(listId)) {
            setListIds([...listIds, listId]);
        }
    };

    const availableLists = allLists.filter(list => !listIds.includes(list.id));

    return (
        <div className="subscriber-form p-4">
            <h2>{id ? 'Edit Subscriber' : 'Create New Subscriber'}</h2>
            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                <Form.Group controlId="subscriberEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                        type="email"
                        placeholder="Enter subscriber's email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group controlId="subscriberName" className="mt-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter subscriber's name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group controlId="subscriberPhone" className="mt-3">
                    <Form.Label>Phone Number</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter subscriber's phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </Form.Group>

                <Form.Group controlId="subscriberAddress" className="mt-3">
                    <Form.Label>Physical Address</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter subscriber's address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </Form.Group>

                <Form.Group controlId="listSubscriptions" className="mt-3">
                    <Form.Label>Subscribed to Lists</Form.Label>
                    <div>
                        {listIds.map(listId => {
                            const selectedList = allLists.find(list => list.id === listId);
                            return (
                                <Button
                                    key={listId}
                                    variant="outline-primary"
                                    className="me-2 mb-2"
                                    onClick={() => handleRemoveSelectedList(listId)}
                                >
                                    {selectedList ? selectedList.name : 'Unknown List'} &times;
                                </Button>
                            );
                        })}
                    </div>
                </Form.Group>

                <Form.Group controlId="availableLists" className="mt-3">
                    <Form.Label>Select Lists</Form.Label>
                    <Form.Control
                        as="select"
                        value=""
                        onChange={(e) => handleAddList(Number(e.target.value))}
                    >
                        <option value="">Select list...</option>
                        {availableLists.map(list => (
                            <option key={list.id} value={list.id}>
                                {list.name}
                            </option>
                        ))}
                    </Form.Control>
                </Form.Group>

                <Form.Group controlId="subscriberTags" className="mt-3">
                    <Form.Label>Tags</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter tags (comma-separated)"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                    />
                </Form.Group>

                <Button variant="primary" type="submit" className="mt-3">
                    {id ? 'Update Subscriber' : 'Create Subscriber'}
                </Button>
            </Form>
        </div>
    );
};

export default SubscribersForm;