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
                if (parsedUser?.id) {
                    setUserId(parsedUser.id);
                    fetchEmails(parsedUser.id);
                    if (subscribedToText) fetchSmsQueue(parsedUser.id);
                }
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            navigate('/signin');
        }
    }, [navigate, currentPage, statusFilter, smsStatusFilter, guestMode]);

    const fetchEmails = async (id) => {
        setLoading(true);
        try {
            let endpoint;
            if (statusFilter === 'all') {
                endpoint = '/api/emailQueue/campaignsandtemplates';
            } else if (statusFilter === 'pending') {
                endpoint = '/api/emailQueue/pendingEmails';
            } else if (statusFilter === 'sent') {
                endpoint = '/api/campaigns/user/sent';
            } else if (statusFilter === 'opened') {
                endpoint = '/api/emailQueue/showEmails';
            }

            const res = await axios.post(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function${endpoint}`, {
                userId: id,
                status: statusFilter,
                page: currentPage,
                limit: 10,
            });

            const { emails, totalPages, recentEvents } = res.data;
            setEmails(emails);
            setRecentEvents(recentEvents || []);
            setTotalPages(totalPages || 1);
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

    const handleRemove = async (id) => {
        if (!window.confirm('Are you sure you want to remove this from your Email Queue?')) return;
        try {
            await axios.delete(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/emailQueue/delete/${id}`);
            fetchEmails(userId);
        } catch (error) {
            console.error('Error removing email:', error);
        }
    };

    const handleSubscribeToText = () => {
        window.location.href = 'https://checkout.clubhouselinks.com/b/14kaGAaUMe786QgbJ0';
    };

    const statusTitleMap = {
        all: 'All Emails',
        pending: 'All Pending Emails',
        sent: 'All Sent Emails',
        opened: 'Opened Emails'
    };

    const statusTitle = statusTitleMap[statusFilter] || 'Email Queue';

    return (
        <Container fluid style={{ backgroundColor: 'white' }}>
            <Row>
                <Col>
                    <h3 style={{ textAlign: 'center', color: 'rgb(255, 112, 67)' }}>{statusTitle}</h3>
                </Col>
            </Row>

            {!guestMode && !subscribedToText && (
                <Row className="mb-4 justify-content-center">
                    <Button variant="warning" onClick={handleSubscribeToText}>
                        Subscribe to Text Queue for $40
                    </Button>
                </Row>
            )}

            <Row className="justify-content-center mb-3">
                <Col xs={12} sm={8} md={6}>
                    <Dropdown onSelect={handleStatusChange}>
                        <Dropdown.Toggle variant="secondary" className="w-100">
                            {statusTitle}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item eventKey="all">All Emails</Dropdown.Item>
                            <Dropdown.Item eventKey="pending">All Pending Emails</Dropdown.Item>
                            <Dropdown.Item eventKey="sent">All Sent Emails</Dropdown.Item>
                            <Dropdown.Item eventKey="opened">Opened Emails</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </Col>
            </Row>

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
                                <td>{email.subscriber_name}<br /><small>{email.subscriber_email}</small></td>
                                <td>{new Date(email.send_time || email.sent_at || email.opened_at).toLocaleString()}</td>
                                <td>
                                    <span className={`badge bg-${email.status === 'pending' ? 'warning' : 'success'}`}>
                                        {email.status || 'sent'}
                                    </span>
                                </td>
                                <td>
                                    <Button variant="primary" size="sm" onClick={() => handlePreview(email.template_preview)}>
                                        Preview
                                    </Button>
                                    {email.status === 'pending' && (
                                        <Button variant="danger" size="sm" onClick={() => handleRemove(email.id)} className="ms-2">
                                            Remove
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>

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

                    {statusFilter === 'all' && recentEvents.length > 0 && (
                        <>
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
                        </>
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
