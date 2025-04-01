import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Pagination, Dropdown, Modal, Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const EmailQueueList = ({ guestMode = false }) => {
    const [emails, setEmails] = useState([]);
    const [recentEvents, setRecentEvents] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();

    // --- Mock Data ---
    const sampleEmails = [
        {
            id: 1,
            subscriber_name: "Jane Doe",
            subscriber_email: "jane@example.com",
            send_time: new Date().toISOString(),
            status: "pending",
            template_preview: "<p>Sample template preview for Jane</p>"
        },
        {
            id: 2,
            subscriber_name: "John Smith",
            subscriber_email: "john@example.com",
            send_time: new Date(Date.now() - 86400000).toISOString(),
            status: "sent",
            template_preview: "<p>Sample template preview for John</p>"
        }
    ];

    const sampleRecentEvents = [
        {
            name: "Jane Doe",
            email: "jane@example.com",
            opened_at: new Date().toISOString(),
            time_period: "2 hours ago"
        },
        {
            name: "John Smith",
            email: "john@example.com",
            opened_at: new Date(Date.now() - 7200000).toISOString(),
            time_period: "5 hours ago"
        }
    ];

    useEffect(() => {
        if (guestMode) {
            setEmails(sampleEmails);
            setRecentEvents(sampleRecentEvents);
            setTotalPages(1);
            setLoading(false);
            return;
        }

        const user = localStorage.getItem('user');
        try {
            if (user) {
                const parsedUser = JSON.parse(user);
                if (parsedUser && parsedUser.id) {
                    setUserId(parsedUser.id);
                    fetchEmails(parsedUser.id);
                } else {
                    throw new Error('Invalid user data');
                }
            } else {
                throw new Error('No user found in localStorage');
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            navigate('/app/signin');
        }
    }, [navigate, currentPage, statusFilter, guestMode]);

    const fetchEmails = async (id) => {
        setLoading(true);
        try {
            const response = await axios.post('/server/crm_function/api/emailQueue/showEmails', {
                userId: id,
                status: statusFilter,
                page: currentPage,
                limit: 10,
            });

            const { emails, totalPages, recentEvents } = response.data;
            setEmails(emails);
            setRecentEvents(recentEvents);
            setTotalPages(totalPages);
        } catch (error) {
            console.error('Error fetching email queue:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleStatusChange = (status) => {
        setStatusFilter(status);
        setCurrentPage(1);
    };

    const handlePreview = (content) => {
        setPreviewContent(content);
        setShowPreview(true);
    };

    return (
        <Container fluid style={{ backgroundColor: 'white' }}>
            <Row>
                <Col>
                    <h3 style={{ textAlign: 'center', color: 'rgb(255, 112, 67)' }}>
                        Email Queue {guestMode && ''}
                    </h3>
                </Col>
            </Row>

            {!guestMode && (
                <Row className="justify-content-center mb-3">
                    <Col xs={12} sm={8} md={6}>
                        <Dropdown onSelect={handleStatusChange}>
                            <Dropdown.Toggle variant="secondary" id="dropdown-basic" className="w-100">
                                {statusFilter === 'all' ? 'All Emails' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Emails`}
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item eventKey="all">All</Dropdown.Item>
                                <Dropdown.Item eventKey="pending">Pending</Dropdown.Item>
                                <Dropdown.Item eventKey="sent">Sent</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Col>
                </Row>
            )}

            {loading ? (
                <p className="text-center">Loading...</p>
            ) : (
                <>
                    <Table striped bordered hover responsive>
                        <thead>
                        <tr>
                            <th>#</th>
                            <th>Subscriber</th>
                            <th>Send Time</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {emails.map((email, index) => (
                            <tr key={email.id}>
                                <td>{index + 1 + (currentPage - 1) * 10}</td>
                                <td>
                                    {email.subscriber_name} <br />
                                    <small>{email.subscriber_email}</small>
                                </td>
                                <td>{new Date(email.send_time).toLocaleString()}</td>
                                <td>{email.status}</td>
                                <td>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handlePreview(email.template_preview)}
                                    >
                                        Preview Template
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>

                    <h4 className="mt-4">Recent Email Opens</h4>
                    <Table striped bordered hover responsive>
                        <thead>
                        <tr>
                            <th>Subscriber</th>
                            <th>Email</th>
                            <th>Opened At</th>
                            <th>Time Period</th>
                        </tr>
                        </thead>
                        <tbody>
                        {recentEvents.map((event, index) => (
                            <tr key={index}>
                                <td>{event.name}</td>
                                <td>{event.email}</td>
                                <td>{new Date(event.opened_at).toLocaleString()}</td>
                                <td>{event.time_period}</td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>

                    {!guestMode && (
                        <Pagination className="justify-content-center">
                            {[...Array(totalPages).keys()].map((page) => (
                                <Pagination.Item
                                    key={page + 1}
                                    active={page + 1 === currentPage}
                                    onClick={() => handlePageChange(page + 1)}
                                >
                                    {page + 1}
                                </Pagination.Item>
                            ))}
                        </Pagination>
                    )}
                </>
            )}

            <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Template Preview</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPreview(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default EmailQueueList;
