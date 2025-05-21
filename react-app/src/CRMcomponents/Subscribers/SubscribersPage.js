import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Row, Col, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';  // Toastify for notifications


const SubscribersPage = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredSubscribers, setFilteredSubscribers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedSubscriber, setSelectedSubscriber] = useState(null);
    const [email, setEmail] = useState('');
    const [customer, setCustomer] = useState(''); // Track subscriber customer
    const [listIds, setListIds] = useState([]);
    const [allLists, setAllLists] = useState([]);
    const [tags, setTags] = useState('');
    const [opens, setOpens] = useState(0);
    const [clicks, setClicks] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const fetchSubscribers = async () => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.id) {
                console.error('User ID not found');
                return;
            }

            const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/user/${user.id}`);
            const data = await response.json();

            if (response.ok) {
                setSubscribers(data);
                setFilteredSubscribers(data);
            } else {
                console.error('Error fetching subscribers:', data.message);
            }
        } catch (error) {
            console.error('Error fetching subscribers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLists = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.id) {
                console.error('User ID not found');
                return;
            }

            const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/lists/user/${user.id}`);
            const data = await response.json();

            if (response.ok) {
                setAllLists(data); // Only setting the lists belonging to this user
            } else {
                console.error('Error fetching lists:', data.message);
            }
        } catch (error) {
            console.error('Error fetching lists:', error);
        }
    };



    const handleSearchChange = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        const filtered = subscribers.filter((sub) =>
            sub.name.toLowerCase().includes(query) ||
            sub.email.toLowerCase().includes(query)
        );
        setFilteredSubscribers(filtered);
    };

    const handleDelete = async (id) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.id) {
            console.error('User ID not found');
            return;
        }

        try {
            const response = await fetch(
                `https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${id}?userId=${user.id}`,
                { method: 'DELETE' }
            );

            if (response.ok) {
                fetchSubscribers();
            } else {
                console.error('Error deleting subscriber');
            }
        } catch (error) {
            console.error('Error deleting subscriber:', error);
        }
    };

    const handleViewClick = async (subscriber) => {
        setSelectedSubscriber(subscriber);
        setEmail(subscriber.email);
        setTags(subscriber.tags ? subscriber.tags.join(',') : '');
        setOpens(subscriber.opens || 0);
        setClicks(subscriber.clicks || 0);

        // Fetch lists the subscriber is associated with
        try {
            const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${subscriber.id}/lists`);
            const data = await response.json();
            const selectedLists = data.map((list) => list.id); // Extract list IDs

            setListIds(selectedLists); // Set selected list IDs
        } catch (error) {
            console.error('Error fetching subscriber lists:', error);
        }

        // Fetch all available lists
        fetchLists();
        setShowModal(true);
    };
    const handleSendThankYou = async (subscriber) => {
        try {
            const user = JSON.parse(localStorage.getItem('user')); // Retrieve user info
            if (!user || !user.id) {
                console.error('User ID not found');
                return;
            }

            const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/templates/thankyou`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriberId: subscriber.id,
                    userId: user.id,
                    name: subscriber?.name, // Pass the name in the thank-you payload
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send thank-you email');
            }

            console.log('Thank-you email sent successfully');
            toast.success('Thank-you email sent successfully!');
            navigate('/app/dashboard');
        } catch (error) {
            console.error('Error sending thank-you email:', error);
            toast.error('Failed to send thank-you email');
        }
    };


    const handleSave = async () => {



        try {
            const updatedSubscriber = {
                email,
                name: selectedSubscriber?.name,
                phone_number: selectedSubscriber?.phone_number,
                physical_address: selectedSubscriber?.physical_address,
                lists: listIds,
                tags: tags.split(',').map((tag) => tag.trim()),
            };

            const response = await fetch(
                `https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${selectedSubscriber.id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedSubscriber),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to update subscriber');
            }




            setShowModal(false);
            fetchSubscribers(); // Refresh subscribers after update
        } catch (error) {
            console.error('Error updating subscriber:', error);
        }
    };
    const handleSubscribeToText = () => {
        // ✅ Redirect to your payment link here
        window.location.href = 'https://checkout.clubhouselinks.com/b/14kaGAaUMe786QgbJ0';
    };

    const handleListChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions);
        const selectedListIds = selectedOptions.map((option) => option.value);
        setListIds(selectedListIds);
    };

    return (
        <div className="subscribers-page p-4" style={{backgroundColor:'white'}}>
            <h3 style={{ textAlign: 'center',color:'rgb(255, 112, 67)' }}>Subscribers</h3>
            <Row className="mb-3">
                <Col>
                    <h2>Subscribers ({subscribers.length})</h2>
                </Col>



                <Col className="text-right">
                    <Button variant="primary" onClick={() => navigate('/subscribers/new')}>
                        + New
                    </Button>
                </Col>
            </Row>

            <Form.Control
                type="text"
                placeholder="Search by email or name"
                value={searchQuery}
                onChange={handleSearchChange}
                className="mb-3"
            />

            {loading ? (
                <p>Loading...</p>
            ) : (
                <Table striped bordered hover responsive>
                    <thead>
                    <tr>
                        <th>Has Opened Email</th>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Lists</th>
                        <th>Created</th>
                        <th>Updated</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredSubscribers.map((sub) => (
                        <tr key={sub.id}>
                            <td>{sub.customer || 'unconfirmed'}</td>
                            <td>{sub.email}</td>
                            <td>{sub.name}</td>
                            <td>{sub.list_count || 0}</td>
                            <td>{new Date(sub.created_at).toLocaleDateString()}</td>
                            <td>{new Date(sub.updated_at).toLocaleDateString()}</td>
                            <td>
                                <Button variant="info" onClick={() => handleViewClick(sub)}>
                                    View
                                </Button>{' '}
                                <Button
                                    variant="danger"
                                    onClick={() => handleDelete(sub.id)}
                                >
                                    Delete
                                </Button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Subscriber</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="name" className="mt-3">
                            <Form.Label>Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={selectedSubscriber?.name || ''}
                                onChange={(e) =>
                                    setSelectedSubscriber({ ...selectedSubscriber, name: e.target.value })
                                }
                            />
                        </Form.Group>

                        <Form.Group controlId="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </Form.Group>
                        <Form.Group controlId="phoneNumber" className="mt-3">
                            <Form.Label>Phone Number</Form.Label>
                            <Form.Control
                                type="text"
                                value={selectedSubscriber?.phone_number || ''}
                                onChange={(e) => setSelectedSubscriber({ ...selectedSubscriber, phone_number: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group controlId="physicalAddress" className="mt-3">
                            <Form.Label>Physical Address</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={selectedSubscriber?.physical_address || ''}
                                onChange={(e) => setSelectedSubscriber({ ...selectedSubscriber, physical_address: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group controlId="listSubscriptions" className="mt-3">
                            <Form.Label>Lists Subscribed To</Form.Label>
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
                        <Form.Group controlId="tags" className="mt-3">
                            <Form.Label>Tags</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Add tags (comma separated)"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                        </Form.Group>
                        <Form.Group controlId="emailOpens" className="mt-3">
                            <Form.Label>Email Opens</Form.Label>
                            <Form.Control type="number" readOnly value={opens} />
                        </Form.Group>
                        <Form.Group controlId="emailClicks" className="mt-3">
                            <Form.Label>Email Clicks</Form.Label>
                            <Form.Control type="number" readOnly value={clicks} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        Save
                    </Button>
                    {!JSON.parse(localStorage.getItem('textQueueEnabled')) && (
                        <Button variant="warning" onClick={handleSubscribeToText}>
                            Subscribe to send Thank you Text
                        </Button>
                    )}

                    <Button
                        variant="success"
                        onClick={() => handleSendThankYou(selectedSubscriber)}
                    >
                        Send Thank-You Email
                    </Button>
                </Modal.Footer>
            </Modal>

        </div>
    );
};

export default SubscribersPage;
