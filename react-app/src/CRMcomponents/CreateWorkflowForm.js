import React, { useState, useEffect } from 'react';
import {Form, Button, ListGroup, Col, Card, Pagination, Spinner, ProgressBar} from 'react-bootstrap';
import {FaPlus, FaTag, FaUsers} from 'react-icons/fa';
import axios from 'axios';
import AnimatedWorkFlowIcon from "../icons/WorkflowIcon";

const CreateWorkflowForm = ({ onCreateWorkflow }) => {
    const [workflowData, setWorkflowData] = useState({
        name: '',
        industryTag: '',
        activity: '',
    });
    const [recentEvents, setRecentEvents] = useState([]);
    const [scheduledEvents, setScheduledEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);


    const [localUserId, setLocalUserId] = useState({
        user_id: '',
    });
    const [templateContent, setTemplateContent] = useState(''); // State for live template preview
    const eventsPerPage = 15;

    const resetFields = () => {
        setWorkflowData({
            name: '',
            industryTag: '',
            activity: '',
        });
        setTemplateContent(''); // Clear preview when category changes
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'name') {
            resetFields();
            setWorkflowData({ name: value, industryTag: '', activity: '' });
        } else {
            setWorkflowData(prevData => ({ ...prevData,  [name]: name === 'activity' ? Number(value) : value,  }));
        }
    };



    const indexOfLastEvent = currentPage * eventsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
    const currentEvents = scheduledEvents.slice(indexOfFirstEvent, indexOfLastEvent);


    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setLocalUserId(prevData => ({ ...prevData, user_id: user.id }));
            fetchRecentEvents(user.id); //
            fetchScheduledWorkflows(user.id);
        }
    }, []);
    const fetchRecentEvents = async (userId) => {
        try {
            const response = await axios.get(`/server/crm_function/api/dashboard/${userId}`);

            const data = response.data.recentEvents || {}; // Ensure the default is an empty object
            setRecentEvents(data);
        } catch (error) {
            console.error('Error fetching recent events:', error);
            setRecentEvents({});
        }
    };

    const fetchScheduledWorkflows = async (userId) => {
        try {
            const response = await axios.get(`/server/crm_function/api/workflow/scheduled-workflows`, {
                params: { user_id: userId },
            });
            setScheduledEvents(response.data || []);
        } catch (error) {
            console.error('Error fetching scheduled workflows:', error);
            setScheduledEvents([]);
        }
    };
    // Filter recentEvents based on selected activity (workflow contact frequency)
    useEffect(() => {
        if (workflowData.activity) {
            const activityMapping = {
                '7': 'Last Week',
                '14': 'Last 2 Weeks',
                '21': 'Last 3 Weeks',
                '28': 'Last 4 Weeks',
            };

            const timePeriod = activityMapping[workflowData.activity];
            const filtered = recentEvents[timePeriod] || [];

            // Add next_send_time to matching recent events
            const combinedEvents = filtered.map(event => {
                const matchingScheduled = scheduledEvents.find(
                    (sched) => sched.subscriber_id === event.subscriber_id
                );
                return {
                    ...event,
                    next_send_time: matchingScheduled ? matchingScheduled.next_send_time : 'N/A',
                };
            });

            setFilteredEvents(combinedEvents);
            setCurrentPage(1); // Reset to first page on filter change
            setLoading(false);
        } else {
            setFilteredEvents([]);
        }
    }, [workflowData.activity, recentEvents, scheduledEvents]);

    // Fetch template content when category (workflow name) changes
    useEffect(() => {
        const fetchTemplateContent = async () => {
            if (!workflowData.name) {
                setTemplateContent(''); // Clear if no category selected
                return;
            }

            try {
                // Replace user_id with the actual user ID
                const user_id = localUserId.user_id; // Example user ID, adjust accordingly
                const response = await axios.get(`/server/crm_function/api/templates`, {
                    params: {
                        category: workflowData.name,
                        user_id: user_id
                    }
                });

                if (response.data && response.data.template) {
                    setTemplateContent(response.data.template.content || '');
                } else {
                    setTemplateContent(''); // Clear if no template found
                }
            } catch (error) {
                console.error('Error fetching template content:', error);
                setTemplateContent(''); // Clear on error
            }
        };

        fetchTemplateContent();
    }, [workflowData.name]); // Trigger when category (workflow name) changes

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreateWorkflow(workflowData);
    };

    const renderPagination = () => {
        const totalPages = Math.ceil(scheduledEvents.length / eventsPerPage);
        return (
            <Pagination className="justify-content-center mt-3">
                <Pagination.Prev
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                />
                {[...Array(totalPages)].map((_, index) => (
                    <Pagination.Item
                        key={index}
                        active={index + 1 === currentPage}
                        onClick={() => handlePageChange(index + 1)}
                    >
                        {index + 1}
                    </Pagination.Item>
                ))}
                <Pagination.Next
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                />
            </Pagination>
        );
    };

    const fetchScheduledSubscribers = async (userId, interval) => {
        try {
            const response = await axios.get(`/server/crm_function/api/lists/scheduled-subscribers`, {
                params: { user_id: userId, interval: interval },
            });
            setScheduledEvents(response.data || []);
            setCurrentPage(1); // Reset pagination to the first page
        } catch (error) {
            console.error('Error fetching scheduled events:', error);
            setScheduledEvents([]);
        }
    };

// Trigger fetch when activity changes
    useEffect(() => {
        if (workflowData.activity) {
            fetchScheduledSubscribers(localUserId.user_id, workflowData.activity);
        }
    }, [workflowData.activity, localUserId.user_id]);


    useEffect(() => {
        if (workflowData.activity) {
            fetchScheduledSubscribers(localUserId.user_id, workflowData.activity);
        }
    }, [workflowData.activity, localUserId.user_id]);


    return (

        <Col>

            <Card className="recent-campaign-card mb-3" style={{ height: '100%' , backgroundColor:'white', marginBottom:'0px'}}>
                <AnimatedWorkFlowIcon/>
                <h4 style={{ textAlign: 'center' }}>Create a New Campaign</h4>
                <small style={{ color: "gray", textAlign: 'center' }}>Create templates for your campaigns and automated emails</small>

                <div className="workflow-create-container p-4" style={{ position: 'relative', background:'white', borderRadius: '8px' }}>
                    <div className="d-flex align-items-center mb-4">
                    </div>

                    <Form onSubmit={handleSubmit}>
                        {/* Workflow Name Dropdown */}
                        <Form.Group className="mb-3">
                            <div className="d-flex align-items-center mb-2">
                                <FaTag size={20} style={{ color: 'steelblue', marginRight: '10px' }} />
                                <Form.Label style={{ color: 'steelblue' }}>Template Type</Form.Label>
                            </div>
                            <Form.Control
                                as="select"
                                name="name"
                                value={workflowData.name}
                                onChange={handleInputChange}
                                style={{ borderColor: 'rgb(255, 112, 67)',color:'steelblue',backgroundColor:'white' }}
                            >
                                <option value="">Select Campaign Template</option>
                                <option value="Top of Mind">Top of Mind</option>
                                <option value="Advertisement">Advertisement</option>
                                <option value="Sale">Sale</option>
                                <option value="Opened Email List">Opened Email List</option>
                                <option value="Opened Email Hot List">Repeated Opened Email Hot List</option>
                                <option value="Thank you for your business">Thank you / Google Review </option>
                            </Form.Control>
                        </Form.Group>

                        {/* Conditionally Render Industry Tag Dropdown */}
                        {(workflowData.name === 'Advertisement' || workflowData.name === 'Sale') && (
                            <Form.Group className="mb-3">
                                <div className="d-flex align-items-center mb-2">
                                    <FaTag size={20} style={{ color: '#42A5F5', marginRight: '10px' }} />
                                    <Form.Label style={{ color: '#42A5F5' }}>Industry Tag (Optional)</Form.Label>
                                </div>
                                <Form.Control
                                    as="select"
                                    name="industryTag"
                                    value={workflowData.industryTag}
                                    onChange={handleInputChange}
                                    style={{ borderColor: '#42A5F5' }}
                                >
                                    <option value="">Select Industry</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Healthcare">Healthcare</option>
                                </Form.Control>
                            </Form.Group>
                        )}

                        {/* Conditionally Render Workflow Contact Frequency */}
                        {(workflowData.name === 'Opened Email List') && (
                            <Form.Group className="mb-3">
                                <div className="d-flex align-items-center mb-2">
                                    <FaUsers size={20} style={{ color: '#FF7043', marginRight: '10px' }} />
                                    <Form.Label style={{ color: '#FF7043' }}>Workflow Contact Frequency</Form.Label>
                                </div>
                                <Form.Control
                                    as="select"
                                    name="activity"
                                    value={workflowData.activity}
                                    onChange={handleInputChange}
                                    style={{ borderColor: '#FF7043' }}
                                >
                                    <option value="">Select contact frequency</option>
                                    <option value="14">Once every two weeks</option>
                                    <option value="21">Once every three weeks</option>
                                    <option value="28">Once every four weeks</option>
                                </Form.Control>
                            </Form.Group>
                        )}

                        {(workflowData.name === 'Opened Email Hot List') && (
                            <Form.Group className="mb-3">
                                <div className="d-flex align-items-center mb-2">
                                    <FaUsers size={20} style={{ color: '#FF7043', marginRight: '10px' }} />
                                    <Form.Label style={{ color: '#FF7043' }}>Workflow Contact Frequency</Form.Label>
                                </div>
                                <Form.Control
                                    as="select"
                                    name="activity"
                                    value={workflowData.activity}
                                    onChange={handleInputChange}
                                    style={{ borderColor: '#FF7043' }}
                                >
                                    <option value="">Select contact frequency</option>
                                    <option value="7">Once every week</option>
                                    <option value="14">Once every two weeks</option>
                                    <option value="21">Once every three weeks</option>
                                    <option value="28">Once every four weeks</option>
                                </Form.Control>
                            </Form.Group>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Button
                                type="submit"
                                variant="primary"
                                style={{ background: 'steelblue', border: 'none' }}
                            >
                                Continue to Template Design
                            </Button>
                        </div>

                    </Form>

                    {/* Live Template Preview Section */}
                    {workflowData.name && (
                        <h4 className="mt-4" style={{ color: '#FF7043',textAlign:"center" }}>
                            Your current {workflowData.name}
                        </h4>
                    )}

                    <div className="template-preview" style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
                        {templateContent ? (
                            <div dangerouslySetInnerHTML={{ __html: templateContent }} />
                        ) : (
                            <p style={{ color: 'gray' }}>To see a preview select a workflow</p>
                        )}
                    </div>

                    {/* Filtered Subscribers Section */}

                    <p style={{ color: 'white' }}>Showing subscribers filtered by workflow:</p>

                    {/* Conditionally Render Recent Events */}
                    {workflowData.activity && (
                        <div>
                            <h4 style={{ textAlign: 'center', color: 'steelblue' }}>
                                Recent Email Opens
                            </h4>
                            {loading ? (
                                <Spinner animation="border" className="d-block mx-auto" />
                            ) : (
                                <>
                                    <ListGroup>
                                        {currentEvents.length > 0 ? (
                                            currentEvents.map((event) => (
                                                <ListGroup.Item
                                                    key={event.subscriber_id}
                                                    className="d-flex justify-content-between align-items-center"
                                                >
                                                    <div>
                                                        <strong>{event.email}</strong> <br />
                                                        <span>
                        Scheduled Send Date:{' '}
                                                            {event.next_send_time
                                                                ? new Date(event.next_send_time).toLocaleString()
                                                                : 'N/A'}
                    </span>
                                                    </div>
                                                </ListGroup.Item>
                                            ))
                                        ) : (
                                            <ListGroup.Item>No scheduled events for this interval.</ListGroup.Item>
                                        )}
                                    </ListGroup>

                                    {renderPagination()}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </Col>


    );
};

export default CreateWorkflowForm;
