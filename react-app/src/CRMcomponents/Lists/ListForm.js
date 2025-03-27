import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';

const ListForm = ({ initialList, onSaveSuccess, userId }) => {
    const [name, setName] = useState(initialList.name || '');
    const [allSubscribers, setAllSubscribers] = useState([]); // All subscribers
    const [selectedSubscriberIds, setSelectedSubscriberIds] = useState([]); // Pre-selected subscribers
    const [searchQuery, setSearchQuery] = useState(''); // Search input for filtering subscribers

    useEffect(() => {
        // Fetch all available subscribers for this user
        fetch(`/server/crm_function/api/subscribers/user/${userId}`)
            .then((response) => response.json())
            .then((data) => setAllSubscribers(Array.isArray(data) ? data : [])) // Ensure data is an array
            .catch((err) => console.error('Error fetching subscribers:', err));

        // If editing a list, fetch the subscribers for the list
        if (initialList && initialList.id) {
            fetch(`/server/crm_function/api/lists/${initialList.id}/subscribers`)
                .then((response) => response.json())
                .then((data) => setSelectedSubscriberIds(data.map((sub) => sub.id)))
                .catch((err) => console.error('Error fetching list subscribers:', err));
        }
    }, [initialList, userId]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const listData = {
            name,
            user_id: userId,
            subscribers: selectedSubscriberIds, // Send selected subscriber IDs
        };

        const method = initialList.id ? 'PUT' : 'POST';
        const endpoint = initialList.id
            ? `/server/crm_function/api/lists/${initialList.id}`
            : '/server/crm_function/api/lists/create';

        fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listData),
        })
            .then((response) => response.json())
            .then(() => onSaveSuccess())
            .catch((err) => console.error('Error saving list:', err));
    };

    // Add/remove subscribers on checkbox change
    const handleSubscriberToggle = (subscriberId) => {
        setSelectedSubscriberIds((prevIds) =>
            prevIds.includes(subscriberId)
                ? prevIds.filter((id) => id !== subscriberId) // Deselect
                : [...prevIds, subscriberId] // Select
        );
    };

    // Filter subscribers based on search query
    const filteredSubscribers = allSubscribers.filter(
        (subscriber) =>
            subscriber.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            subscriber.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Form onSubmit={handleSubmit}>
            <Form.Group controlId="listName">
                <Form.Label>Name</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Enter list name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </Form.Group>

            {/* Search Box */}
            <Form.Group controlId="searchSubscribers" className="mt-3">
                <Form.Label>Search Subscribers</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Search by name or email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </Form.Group>

            {/* Subscribers List with Checkboxes */}
            <Form.Group controlId="listSubscribers" className="mt-3">
                <Form.Label>Subscribers in this List</Form.Label>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredSubscribers.map((subscriber) => (
                        <Form.Check
                            key={subscriber.id}
                            type="checkbox"
                            label={`${subscriber.name} (${subscriber.email})`}
                            checked={selectedSubscriberIds.includes(subscriber.id)}
                            onChange={() => handleSubscriberToggle(subscriber.id)}
                        />
                    ))}
                </div>
            </Form.Group>

            <Button variant="primary" type="submit" className="mt-3">
                {initialList.id ? 'Update List' : 'Create List'}
            </Button>
        </Form>
    );
};

export default ListForm;
