import React, { useState, useEffect } from 'react';
import {Form, Button, ListGroup, Col, Card, Pagination, Spinner} from 'react-bootstrap';
import {FaUsers} from 'react-icons/fa';
import AnimatedWorkFlowIcon from "../icons/WorkflowIcon";
import logo from "../logo.png";
import axios from "axios";
import { toast } from 'react-toastify';


const API_BASE = 'https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api';
const placeholderImage = 'https://res.cloudinary.com/drna15e8q/image/upload/v1764358549/envelope-clipart-envelope_a8ld9s.svg';

// ⭐ ADDED onContinueToTemplate
const CreateWorkflowForm = ({
                                onCreateWorkflow,
                                onContinueToTemplate,
                                onRequestAiDesign,
                                templates,
                                editorComponent
                            }) => {

    const [workflowData, setWorkflowData] = useState({
        name: '',
        activity: '',
    });

    const [templateContent, setTemplateContent] = useState("");
    const [recentEvents, setRecentEvents] = useState([]);
    const [scheduledEvents, setScheduledEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [localUserId, setLocalUserId] = useState({ user_id: '' });

    const eventsPerPage = 15;
    const indexOfLastEvent = currentPage * eventsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
    const currentEvents = scheduledEvents.slice(indexOfFirstEvent, indexOfLastEvent);

    // Clears saved template & activity when user picks a new email type
    const resetFields = () => {
        setWorkflowData({ name: '', activity: '' });
        setTemplateContent('');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'name') {
            resetFields(); // ensures preview resets
            setWorkflowData({ name: value, activity: '' });

            // ⭐ IMPORTANT: When category changes, editor must hide
            if (typeof onContinueToTemplate === "function") {
                onContinueToTemplate({ resetOnly: true });
            }

        } else {
            setWorkflowData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };
    const requireStepOne = () => {
        toast.error("Please complete Step 1: Choose an email type.");
    };


    // Load user + recent events + scheduled events
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setLocalUserId({ user_id: user.id });
            fetchRecentEvents(user.id);
            fetchScheduledWorkflows(user.id);
        }
    }, []);

    const fetchRecentEvents = async (userId) => {
        try {
            const response = await axios.get(`${API_BASE}/dashboard/${userId}`);
            setRecentEvents(response.data.recentEvents || {});
        } catch (err) {
            console.error(err);
            setRecentEvents({});
        }
    };

    const fetchScheduledWorkflows = async (userId) => {
        try {
            const response = await axios.get(`${API_BASE}/workflow/scheduled-workflows`, {
                params: { user_id: userId }
            });
            setScheduledEvents(response.data || []);
        } catch (err) {
            console.error(err);
            setScheduledEvents([]);
        }
    };

    // Load previously saved template when workflow category changes
    useEffect(() => {
        const loadTemplate = async () => {
            if (!workflowData.name) {
                setTemplateContent('');
                return;
            }

            try {
                const response = await axios.get(`${API_BASE}/templates`, {
                    params: {
                        category: workflowData.name,
                        user_id: localUserId.user_id
                    }
                });

                if (response.data?.template?.content) {
                    setTemplateContent(response.data.template.content);
                } else {
                    setTemplateContent('');
                }
            } catch (err) {
                console.error("Error loading saved template:", err);
                setTemplateContent('');
            }
        };

        loadTemplate();
    }, [workflowData.name, localUserId.user_id]);

    // Handle submit → call parent’s beginTemplateDesign()
    const handleSubmit = (e) => {
        e.preventDefault();

        if (typeof onContinueToTemplate === "function") {
            onContinueToTemplate({
                name: workflowData.name,
                activity: workflowData.activity
            });
        }
    };

    return (
        <Col>
            <Card className="recent-campaign-card mb-3" style={{ background: 'white' }}>
                {/* BIG GRADIENT HEADER */}
                <div
                    style={{
                        width: "100%",
                        padding: "25px 0",
                        background: "linear-gradient(to right, #ff0080, orange, steelblue)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: "20px",
                        borderRadius: "6px"
                    }}
                >
                    <h2
                        className="big-header-text"
                        style={{
                            fontWeight: 900,
                            margin: 0,
                            color: "white",
                            textShadow: "0px 2px 4px rgba(0,0,0,0.3)",
                            textAlign: "center"
                        }}
                    >
                        Step 1: Create a new Email Campaign
                    </h2>

                </div>
                <div>
                <img src={logo} style={{ width: 80, margin:"0 auto", display:"block" }} alt="logo" />
                </div>
                <img
                    src={placeholderImage}
                    alt="Placeholder"
                    style={{
                        width: '150px',
                        margin: '0 auto',
                        height: '150px',
                        transition: 'opacity 1s ease-in',
                        filter: 'drop-shadow(0 0 10px orange)drop-shadow(0 0 20px #ff4da6)'
                    }}
                />


                <small style={{ color: 'gray', textAlign: 'center', display: 'block' }}>
                    Create A.I. generated emails for your leads and customers.
                </small>

                <div className="workflow-create-container p-4">

                    {/* FORM */}
                    <Form onSubmit={handleSubmit}>

                        {/* Workflow Category */}
                        <Form.Group className="mb-3">
                            <div style={{ textAlign: 'center' }}>
                                <Form.Label style={{ marginTop: 10, color: 'steelblue' }}>
                                    Choose which type of Email you want AI to send<br/>
                                    Choose Google Review/ Thank you Email if you would like to say thank you to a customer <br/>
                                    Choose Automated Email if you want to send a recurring email to stay top of mind. <br/>
                                    Choose Advertisement or Sale Email if you would like to send a one time email to a lead<br/>
                                    <span style={{ fontWeight: 800, color: 'orangered' }}>
    ⭐ (New) Choose Send after Opening Email if you would like to send a one time only automatic email to a lead after they've opened a previous email.
</span>




                                </Form.Label>
                            </div>
                            <Form.Control
                                as="select"
                                name="name"
                                value={workflowData.name}
                                onChange={handleInputChange}
                                style={{ borderColor: 'orangered', color: 'steelblue' }}
                            >
                                <option value="">Choose a category</option>
                                <option value="Thank you for your business">Thank You / Review Email</option>
                                <option value="Advertisement">Advertisement Email</option>
                                <option value="Sale">Sale Email</option>
                                <option value="Top of Mind">Automated Monthly Email Campaign</option>
                                <option value="Opened Email Hot List">Automated Weekly Email Campaign</option>
                                <option value="Opened Email List">Send after Opening Email Campaign</option>
                            </Form.Control>
                        </Form.Group>
                        <div
                            style={{
                                width: "100%",
                                padding: "25px 0",
                                background: "linear-gradient(to right, #ff0080, orange, steelblue)",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                marginBottom: "20px",
                                borderRadius: "6px"
                            }}
                        >
                            <h2
                                className="big-header-text"
                                style={{
                                    fontWeight: 900,
                                    margin: 0,
                                    color: "white",
                                    textShadow: "0px 2px 4px rgba(0,0,0,0.3)",
                                    textAlign: "center"
                                }}
                            >
                               Step 2: Design your Email
                            </h2>

                        </div>
                        <AnimatedWorkFlowIcon/>
                        {/* AI Button */}
                        {/* AI Button */}
                        <div className="d-flex justify-content-center py-2">
                            <Button
                                type="button"
                                variant="danger"
                                style={{
                                    backgroundColor: 'red',
                                    border: 'none',
                                    opacity: workflowData.name ? 1 : 0.5,
                                }}
                                onClick={() => {
                                    if (!workflowData.name) return requireStepOne();
                                    onRequestAiDesign(workflowData.name);
                                }}
                            >
                                Click here to Have A.I. Design your Email
                            </Button>
                        </div>

                        <h3 style={{ textAlign: 'center' }}>or</h3>

                        {/* CONTINUE BUTTON */}
                        <div className="d-flex justify-content-center">
                            <Button
                                type="button"
                                variant="primary"
                                style={{
                                    background: 'steelblue',
                                    opacity: workflowData.name ? 1 : 0.5,
                                }}
                                onClick={() => {
                                    if (!workflowData.name) return requireStepOne();
                                    document.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                                }}
                            >
                                Click here to Continue to Manual Template Design
                            </Button>
                        </div>

                    </Form>

                    {/* EDITOR OR PREVIEW */}
                    {editorComponent ? (
                        <div className="mt-4">{editorComponent}</div>
                    ) : workflowData.name && (
                        <>
                            <h4 className="mt-4" style={{ textAlign: "center", color: "#FF7043" }}>
                                Your current {workflowData.name} Email
                            </h4>
                            <div className="template-preview mt-2 p-3" style={{ background: "white", borderRadius: 8 }}>
                                {templateContent ? (
                                    <div dangerouslySetInnerHTML={{ __html: templateContent }} />
                                ) : (
                                    <p style={{ color: "gray" }}>No existing template saved.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Card>
        </Col>
    );
};

export default CreateWorkflowForm;
