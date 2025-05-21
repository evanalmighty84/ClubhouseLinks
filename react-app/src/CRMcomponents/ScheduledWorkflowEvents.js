import React, { useEffect, useState } from 'react';
import { Table, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

const ScheduledWorkflowEvents = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const user_id = localStorage.getItem('user_id'); // Adjust based on where user_id is stored

    useEffect(() => {
        const fetchEvents = async () => {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                console.error('No user data found in localStorage');
                setError('User data is missing.');
                setLoading(false);
                return;
            }

            const parsedUser = JSON.parse(storedUser);
            const user_id = parsedUser?.id;

            if (!user_id) {
                setError('User ID is required to fetch workflow events.');
                setLoading(false);
                return;
            }

            try {
                console.log('Fetching workflow events for user_id:', user_id);
                const response = await axios.get('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/workflow/scheduled-workflows', {
                    params: { user_id },
                });
                setEvents(response.data);
                console.log('Workflow events fetched:', response.data);
            } catch (err) {
                console.error('Error fetching scheduled workflow events:', err);
                setError('Failed to load scheduled workflow events.');
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);


    if (loading) return <Spinner animation="border" variant="primary" />;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <div className="scheduled-workflow-events">
            <h2>Scheduled Workflow Events</h2>
            <Table striped bordered hover>
                <thead>
                <tr>
                    <th>Subscriber ID</th>
                    <th>Email</th>
                    <th>Next Send Time</th>
                    <th>List Name</th>
                    <th>Workflow</th>
                </tr>
                </thead>
                <tbody>
                {events.map((event) => (
                    <tr key={event.subscriber_id}>
                        <td>{event.subscriber_id}</td>
                        <td>{event.email}</td>
                        <td>{new Date(event.next_send_time).toLocaleString()}</td>
                        <td>{event.list_name}</td>
                        <td>{event.workflow}</td>
                    </tr>
                ))}
                </tbody>
            </Table>
        </div>
    );
};

export default ScheduledWorkflowEvents;
