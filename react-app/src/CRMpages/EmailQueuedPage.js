import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Pagination, Dropdown, Modal, Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const EmailQueueList = ({ guestMode = false }) => {
    const [emails, setEmails] = useState([]);
    const [recentEvents, setRecentEvents] = useState([]);
    const [smsQueue, setSmsQueue] = useState([]);
    const [smsStatusFilter, setSmsStatusFilter] = useState('pending');
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [userId, setUserId] = useState(null);
    const [subscribedToText, setSubscribedToText] = useState(() => {
        return JSON.parse(localStorage.getItem('textQueueEnabled')) || false;
    });

    const navigate = useNavigate();

    useEffect(() => {
        if (guestMode) return;
        const user = localStorage.getItem('user');
        try {
            if (user) {
                const parsedUser = JSON.parse(user);
                if (parsedUser && parsedUser.id) {
                    setUserId(parsedUser.id);
                    fetchEmails(parsedUser.id);
                    if (subscribedToText) fetchSmsQueue(parsedUser.id);
                }
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            navigate('/app/signin');
        }
    }, [navigate, currentPage, statusFilter, smsStatusFilter, guestMode]);

    const fetchEmails = async (id) => {
        setLoading(true);
        try {
            const res = await axios.post('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/emailQueue/showEmails', {
                userId: id,
                status: statusFilter,
                page: currentPage,
                limit: 10,
            });
            const { emails, totalPages, recentEvents } = res.data;
            setEmails(emails);
            setRecentEvents(recentEvents);
            setTotalPages(totalPages);
        } catch (error) {
            console.error('Error fetching email queue:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSmsQueue = async (id) => {
        try {
            const res = await axios.get(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/smsqueue/all/${id}`);
            setSmsQueue(res.data || []);
        } catch (error) {
            console.error('Error fetching scheduled SMS queue:', error);
        }
    };

    const handlePageChange = (page) => setCurrentPage(page);
    const handleStatusChange = (status) => {
        setStatusFilter(status);
        setCurrentPage(1);
    };
    const handleSmsStatusChange = (status) => setSmsStatusFilter(status);

    const handlePreview = (content) => {
        setPreviewContent(content);
        setShowPreview(true);
    };

    const handleSubscribeToText = () => {
        window.location.href = 'https://checkout.clubhouselinks.com/b/14kaGAaUMe786QgbJ0';
    };

    return (
        <Container fluid style={{ backgroundColor: 'white' }}>
            <Row>
                <Col>
                    <h3 style={{ textAlign: 'center', color: 'rgb(255, 112, 67)' }}>Email Queue</h3>
                </Col>
            </Row>

            {!guestMode && !subscribedToText && (
                <Row className="mb-4 justify-content-center">
                    <Button variant="warning" onClick={handleSubscribeToText}>
                        Subscribe to Text Queue for $40
                    </Button>
                </Row>
            )}

            {/* ---------------- EMAIL ---------------- */}
            <Row className="justify-content-center mb-3">
                <Col xs={12} sm={8} md={6}>
                    <Dropdown onSelect={handleStatusChange}>
                        <Dropdown.Toggle variant="secondary" className="w-100">
                            {statusFilter === 'all' ? 'All Emails' : `${statusFilter} Emails`}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item eventKey="all">All</Dropdown.Item>
                            <Dropdown.Item eventKey="pending">Pending</Dropdown.Item>
                            <Dropdown.Item eventKey="sent">Sent</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </Col>
            </Row>

            {loading ? <p className="text-center">Loading...</p> : (
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
                                <td>{email.subscriber_name}<br /><small>{email.subscriber_email}</small></td>
                                <td>{new Date(email.send_time).toLocaleString()}</td>
                                <td>{email.status}</td>
                                <td>
                                    <Button variant="primary" size="sm" onClick={() => handlePreview(email.template_preview)}>
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

                    {/* ---------------- SMS ---------------- */}
                    {subscribedToText && (
                        <>
                            <Row>
                                <Col>
                                    <h3 style={{ textAlign: 'center', color: 'rgb(255, 112, 67)' }}>SMS Queue</h3>
                                </Col>
                            </Row>
                            <Row className="mb-3 justify-content-center">
                                <Col xs={12} sm={8} md={6}>
                                    <Dropdown onSelect={handleSmsStatusChange}>
                                        <Dropdown.Toggle variant="secondary" className="w-100">
                                            {smsStatusFilter.charAt(0).toUpperCase() + smsStatusFilter.slice(1)} Texts
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            <Dropdown.Item eventKey="pending">Pending</Dropdown.Item>
                                            <Dropdown.Item eventKey="sent">Sent</Dropdown.Item>
                                            <Dropdown.Item eventKey="all">All</Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Col>
                            </Row>

                            <Table striped bordered hover responsive>
                                <thead>
                                <tr>
                                    <th>Subscriber ID</th>
                                    <th>Subscriber Name</th>
                                    <th>Message</th>
                                    <th>Scheduled Time</th>
                                    <th>Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {smsQueue
                                    .filter(sms => smsStatusFilter === 'all' || sms.status === smsStatusFilter)
                                    .map((sms) => (
                                        <tr key={sms.id}>
                                            <td>{sms.subscriber_id}</td>
                                            <td>{sms.subscriber_name || 'Unknown'}</td>
                                            <td>{sms.message}</td>
                                            <td>{new Date(sms.scheduled_time).toLocaleString()}</td>
                                            <td>{sms.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}

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
