//Leadsentdashboard
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    Container,
    Row,
    Col,
    Button,
    Card,
    Form,
    Table,
    Spinner,
    Modal,
} from "react-bootstrap";
import logo from "../logo.png";
import { toast } from 'react-toastify';
import { useNavigate } from "react-router-dom";
import IndustryReports from "./IndustryReports";





// ✅ Localhost backend (for development)
// OLD:
// ✅ NEW:
// ✅ Railway for fetching leads (works fine)
const API_BASE =
    process.env.NODE_ENV === "production"
        ? "https://upbeat-spontaneity-production.up.railway.app/server/lead_function/api"
        : "http://localhost:5000/server/lead_function/api";

// ✅ Heroku for sending emails (SMTP allowed)
const SMS_LEAD_BASE =
    process.env.NODE_ENV === "production"
        ? "https://crm-function-app-5d4de511071d.herokuapp.com/server/lead_function/api"
        : "http://localhost:5000/server/lead_function/api";

const EMAIL_LEAD_BASE=
    process.env.NODE_ENV === "production"
        ? "https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api"
        : "http://localhost:5000/server/crm_function/api";




export default function LeadsSentDashboard({ forceSingleCompany = null }) {

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtering, setFiltering] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [autoEmailEnabled, setAutoEmailEnabled] = useState(false);
    const [autoEmailType, setAutoEmailType] = useState("");
    const [autoEmailTemplate, setAutoEmailTemplate] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState([]);

    const handleFileChange = (e) => {
        setFiles([...files, ...Array.from(e.target.files)]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setFiles([...files, ...Array.from(e.dataTransfer.files)]);
    };

    const handleRemoveFile = (index) => {
        const updated = [...files];
        updated.splice(index, 1);
        setFiles(updated);
    };




    // Modal state
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyLeads, setCompanyLeads] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
// 💬 Chat modal state
    const [showChat, setShowChat] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailCompanyLeads, setEmailCompanyLeads] = useState([]);
    const [selectedEmailLead, setSelectedEmailLead] = useState(null);
    const [emailViewMode, setEmailViewMode] = useState("list"); // "list" or "detail"
    const [emailMessage, setEmailMessage] = useState("");
    const [emailCompanyName, setEmailCompanyName] = useState("");
    const [selectedLead, setSelectedLead] = useState(null);
    const [conversation, setConversation] = useState([]);
    const [chatMessage, setChatMessage] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [companyName, setCompanyName] = useState("");
    const [showTemplateSendModal, setShowTemplateSendModal] = useState(false);
    const [templateHTML, setTemplateHTML] = useState("");
    const [templateCategory, setTemplateCategory] = useState("");
    const [sendToLead, setSendToLead] = useState(null);
    const [archivedCampaigns, setArchivedCampaigns] = useState([]);
    const [currentArchiveIndex, setCurrentArchiveIndex] = useState(0);


    const navigate = useNavigate();
    const currentCampaign = archivedCampaigns[currentArchiveIndex];








    useEffect(() => {
        const user = localStorage.getItem("user");
        if (user) {
            const parsed = JSON.parse(user);
            setCurrentUserId(parsed.id);
            setCompanyName(parsed.company_name || "");
        }
    }, []);



    useEffect(() => {
        const interval = setInterval(fetchNewMessages, 10000);
        fetchNewMessages(); // initial check
        return () => clearInterval(interval);
    }, []);

    async function fetchNewMessages() {
        try {
            const res = await axios.get(`${SMS_LEAD_BASE}/smsqueue/new-messages/79`);
            setNotifications(res.data || []);
        } catch (err) {
            console.error("Error checking new messages:", err);
        }
    }


    useEffect(() => {
        fetchLeadsSent();
    }, []);


    async function loadArchivedCampaigns() {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            const res = await axios.get(`${EMAIL_LEAD_BASE}/campaigns/user/${user.id}`);

            const sorted = res.data.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );

            setArchivedCampaigns(sorted);
        } catch (err) {
            console.error("Error loading campaigns:", err);
        }
    }
    async function sendArchivedCampaign(lead, campaign) {
        if (!lead || !campaign) return alert("No lead or campaign selected");

        if (!lead.email) {
            console.error("No email on this lead:", lead);
            return alert("This lead does not have an email address.");
        }

        const confirmSend = window.confirm(
            `Send the "${campaign.name}" campaign to ${lead.email}?`
        );

        if (!confirmSend) return;

        try {
            const currentUser = JSON.parse(localStorage.getItem("user"));
            const currentUserId = currentUser?.id;

            if (!currentUserId) {
                return alert("Could not determine current user.");
            }

            await axios.post(
                `${EMAIL_LEAD_BASE}/campaigns/send-to-lead/${campaign.id}`,
                {
                    userId: currentUserId,
                    leadId: lead.id,
                    email: lead.email,   // 👈 send directly to this lead's email
                    name: lead.author || lead.name || "Lead"
                }
            );

            alert("Campaign sent to lead successfully!");
        } catch (err) {
            console.error(
                "Error sending campaign to lead:",
                err.response?.data || err.message
            );
            alert("Failed to send campaign to this lead.");
        }
    }





    async function viewEmailLeads(company) {
        try {
            setEmailCompanyName(company.company_name);
            setShowEmailModal(true);
            setModalLoading(true);

            // ⭐ Load leads first
            const res = await axios.get(
                `${API_BASE}/leads/company/${encodeURIComponent(company.company_name)}`
            );

            setEmailCompanyLeads(
                (res.data || []).map((lead) => ({
                    ...lead,
                    company_name: company.company_name
                }))
            );

            setEmailViewMode("list");
            setSelectedEmailLead(null);
            setEmailMessage("");



        } catch (err) {
            console.error("Error loading email leads:", err);
            alert("Failed to load leads for email.");
        } finally {
            setModalLoading(false);
        }
    }


    async function loadAutoEmailTemplate(emailType) {
        try {
            const user = JSON.parse(localStorage.getItem("user"));

            const response = await axios.get(
                `${API_BASE}/templates`,
                {
                    params: {
                        category: emailType,
                        user_id: user.id
                    }
                }
            );

            if (response.data?.template?.content) {
                setAutoEmailTemplate(response.data.template.content);
                return true;
            } else {
                setAutoEmailTemplate(null);
                return false;
            }
        } catch (err) {
            console.error("Error loading auto-email template:", err);
            return false;
        }
    }


    async function fetchLeadsSent() {
        try {
            setLoading(true);
            const params = {};
            if (startDate && endDate) {
                params.start_date = startDate;
                params.end_date = endDate;
            }
            const res = await axios.get(`${API_BASE}/leads/sent`, { params });
            setLeads(res.data || []);
        } catch (err) {
            console.error("Error fetching leads:", err);
            alert("Failed to fetch leads.");
        } finally {
            setLoading(false);
        }
    }

    async function sendReportEmail(company) {
        if (!window.confirm(`Email yourself all your leads ${company.company_name}?`)) return;
        try {
            await axios.post(`${SMS_LEAD_BASE}/leads/send-summaries`, {
                company_name: company.company_name,
            });
            alert(`Report email sent for ${company.company_name}`);
        } catch (err) {
            console.error("Error sending report email:", err);
            alert("Failed to send report email.");
        }
    }


    async function sendTutorialEmail(company) {
        if (!window.confirm(`Send “How to Curate Leads” tutorial to ${company.company_name}?`)) return;
        try {
            await axios.post(`${SMS_LEAD_BASE}/leads/send-tutorial/${company.id}`);
            alert("Tutorial email sent!");
        } catch (err) {
            console.error("Error sending tutorial email:", err);
            alert("Failed to send tutorial email.");
        }
    }


    async function viewLeads(company) {
        try {
            setSelectedCompany(company.company_name);
            setShowModal(true);
            setModalLoading(true);
            const res = await axios.get(
                `${API_BASE}/leads/company/${encodeURIComponent(company.company_name)}`
            );
            setCompanyLeads(
                (res.data || []).map((lead) => ({
                    ...lead,
                    company_name: company.company_name   // ⬅ inject it into every lead
                }))
            );

        } catch (err) {
            console.error("Error loading company leads:", err);
            alert("Failed to load company leads.");
        } finally {
            setModalLoading(false);
        }
    }
    async function sendLeadMessage(lead) {
        console.log("Sending payload lead:", lead);

        if (!window.confirm(`Message ${lead.author} about their post?`)) return;

        try {
            const res = await axios.post(
                `${SMS_LEAD_BASE}/smsqueue/message-lead`,
                {
                    lead_id: lead.id,                   // ✅ FIXED
                    phone: lead.phone,
                    description: lead.description,
                    user_id: 79,
                    company_name: lead.company_name
                }
            );

            alert(`✅ Message sent to ${lead.author}!`);
        } catch (err) {
            console.error("Error messaging lead:", err);
            alert("❌ Failed to send message.");
        }
    }


    // 🧠 Fetch entire conversation thread for this lead
    async function openConversation(lead) {
        try {
            setSelectedLead(lead);
            setShowChat(true);
            setChatLoading(true);
            const res = await axios.get(`${SMS_LEAD_BASE}/smsqueue/lead/conversation/${lead.id}`)
            ;
            setConversation(res.data || []);
        } catch (err) {
            console.error("Error loading conversation:", err);
            alert("Failed to load conversation.");
        } finally {
            setChatLoading(false);
            if (notifications.length > 0) {
                await axios.post(`${SMS_LEAD_BASE}/smsqueue/messages/mark-seen`, {
                    messageIds: notifications.map(n => n.id),
                });

                setNotifications([]); // clear frontend
            }

        }
    }

// 📨 Send new reply from dashboard to lead
/*    async function sendReply() {
        if (!chatMessage.trim()) return;
        try {
            await axios.post(`${SMS_LEAD_BASE}/smsqueue/lead/send-reply`, {
                lead_id: selectedLead.id,
                message: chatMessage,
                user_id: 79, // ← REQUIRED
            });

            setChatMessage("");
            await openConversation(selectedLead); // refresh messages
        } catch (err) {
            console.error("Error sending reply:", err);
            alert("Failed to send message.");
        }
    }*/

    async function sendReply() {
        if (!chatMessage.trim() && files.length === 0) return;

        try {
            const formData = new FormData();

            formData.append("lead_id", selectedLead.id);
            formData.append("message", chatMessage);
            formData.append("user_id", 79);

            files.forEach((file) => {
                formData.append("media", file);
            });

            await axios.post(
                `${SMS_LEAD_BASE}/smsqueue/lead/send-reply`,
                formData
            );

            setChatMessage("");
            setFiles([]);

            await openConversation(selectedLead);
        } catch (err) {
            console.error("Error sending reply:", err);
            alert("Failed to send message.");
        }
    }
    return (

        <Container className="mt-5">
            {notifications.length > 0 && (
                <div className="notification-bubble">
                    {notifications.length}
                </div>
            )}

            <h1
                className="mb-4 text-center"
                style={{
                    background: "linear-gradient(to right, black, steelblue, #ff0080, black)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    fontWeight: 800,
                    textShadow: "0px 2px 4px rgba(0,0.1,0,0.1)"

                }}
            >
                {companyName} Dashboard
            </h1>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" role="status" />
                    <p className="mt-2">Loading lead data...</p>
                </div>
            ) : leads.length === 0 ? (
                <p className="text-muted fst-italic text-center">
                    No leads found for this period.
                </p>
            ) : (
                <Row xs={1} md={2} lg={9} className="g-4">
                    {leads
                        .filter((company) => {
                            // admin users 8 & 79 see ALL companies
                            if (currentUserId === 8 || currentUserId === 79) return true;

                            // if forced from parent, show only that company
                            if (forceSingleCompany) {
                                return company.company_name === forceSingleCompany;
                            }

                            // default: normal users only see THEIR company (matching their own company_name)
                            const user = localStorage.getItem("user");
                            if (!user) return false;

                            const { company_name } = JSON.parse(user);
                            return company.company_name === company_name;
                        })
                        .map((company) => (
                            <Col
                                key={company.company_name}
                                style={{
                                    display: currentUserId === 8 ? "flex" : "block"
                                }}
                            >

                            <div
                                    style={{
                                        borderRadius: "20px",
                                        border: "1px solid #ddd",
                                    }}
                                >
                                <Card className="h-100 shadow-sm" style={{border:'none'}}>
                                    <div
                                        style={{
                                            width: "100%",
                                            padding: "25px 0",
                                            background: "linear-gradient(to right, black, steelblue, #ff0080, black)",
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            borderRadius: "0px"
                                        }}
                                    >
                                        <img src={logo} style={{ width: 80 }} alt="logo" />
                                        <h2
                                            style={{
                                                fontWeight: 900,
                                                fontSize: "1.5em",
                                                margin: 0,
                                                color: "white",
                                                textShadow: "0px 2px 4px rgba(0,0,0,0.3)",
                                                textAlign:"center"
                                            }}
                                        >
                                            Message Center
                                        </h2>
                                    </div>
                                    <Card.Body>

                                        <div style={{ textAlign: 'center' }}>


                                            <Form.Label style={{ marginTop: 10, color: 'steelblue' }}>
                                                Send Automated Emails or
                                                just text your leads directly from here!
                                            </Form.Label>
                                        </div>



                                        <Card.Text>
                                            <strong
                                                style={{
                                                    background: "linear-gradient(to right, black, steelblue, #ff0080, black)",
                                                    WebkitBackgroundClip: "text",
                                                    WebkitTextFillColor: "transparent",
                                                    backgroundClip: "text",
                                                    fontWeight: 800
                                                }}
                                            >
                                                {company.company_name} Total Leads: {company.total_leads}
                                            </strong>


                                            <br />

                                            <strong
                                                style={{
                                                    background: "linear-gradient(to right, black, steelblue, #ff0080, black)",
                                                    WebkitBackgroundClip: "text",
                                                    WebkitTextFillColor: "transparent",
                                                    backgroundClip: "text",
                                                    fontWeight: 800
                                                }}
                                            >
                                                Last Lead Generated: {" "}
                                                {new Date(company.last_sent).toLocaleString()}
                                            </strong>


                                        </Card.Text>

                                        <div className="d-grid gap-2">

                                            {/* 1. Text Message Button (old #4 gradient) */}
                                            <Button
                                                onClick={() => viewLeads(company)}
                                                style={{
                                                    background: "linear-gradient(to right, #ff0080, orange)",
                                                    border: "none",
                                                    color: "white",
                                                    fontWeight: 600,
                                                    transition: "all 0.25s ease"
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.transform = "scale(1.04)";
                                                    e.target.style.boxShadow = "0 4px 12px rgba(255, 128, 0, 0.45)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = "scale(1)";
                                                    e.target.style.boxShadow = "none";
                                                }}
                                            >
                                                💬 Text Message Your Leads
                                            </Button>

                                            {/* 2. Email Button (old #3 gradient) */}
                                            <Button
                                                onClick={() => viewEmailLeads(company)}
                                                style={{
                                                    background: "linear-gradient(to right, steelblue, #ff0080)",
                                                    border: "none",
                                                    color: "white",
                                                    fontWeight: 600,
                                                    transition: "all 0.25s ease"
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.transform = "scale(1.04)";
                                                    e.target.style.boxShadow = "0 4px 12px rgba(255, 0, 128, 0.45)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = "scale(1)";
                                                    e.target.style.boxShadow = "none";
                                                }}
                                            >
                                                💬 Email Your Leads
                                            </Button>

                                            {/* 3. Tutorial Button (old #2 gradient) */}
                                            <Button
                                                onClick={() => sendTutorialEmail(company)}
                                                style={{
                                                    background: "linear-gradient(to right, purple, steelblue)",
                                                    border: "none",
                                                    color: "white",
                                                    fontWeight: 600,
                                                    transition: "all 0.25s ease"
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.transform = "scale(1.04)";
                                                    e.target.style.boxShadow = "0 4px 12px rgba(128, 0, 255, 0.45)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = "scale(1)";
                                                    e.target.style.boxShadow = "none";
                                                }}
                                            >
                                                🎓 View Tutorial on how to convert leads into sales
                                            </Button>

                                            {/* 4. Email Report Button (old #1 gradient) */}
                                            <Button
                                                onClick={() => sendReportEmail(company)}
                                                style={{
                                                    background: "linear-gradient(to right, black, steelblue)",
                                                    border: "none",
                                                    color: "white",
                                                    fontWeight: 600,
                                                    transition: "all 0.25s ease"
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.transform = "scale(1.04)";
                                                    e.target.style.boxShadow = "0 4px 12px rgba(0, 128, 255, 0.45)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = "scale(1)";
                                                    e.target.style.boxShadow = "none";
                                                }}
                                            >
                                                📧 Generate Email Report
                                            </Button>

                                        </div>



                                    </Card.Body>
                                </Card>
                                </div>
                            </Col>
                        ))}

                </Row>
            )}

            <Form style={{display:'none'}} className="mb-4">
                <Row className="align-items-end justify-content-center">
                    <Col xs={12} md={3}>
                        <Form.Group controlId="startDate">
                            <Form.Label>Start Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </Form.Group>
                    </Col>

                    <Col xs={12} md={3}>
                        <Form.Group controlId="endDate">
                            <Form.Label>End Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </Form.Group>
                    </Col>

                    <Col xs="auto" className="mt-3 mt-md-0">
                        <Button
                            variant="primary"
                            onClick={() => {
                                setFiltering(true);
                                fetchLeadsSent().then(() => setFiltering(false));
                            }}
                        >
                            {filtering ? "Filtering..." : "Filter"}
                        </Button>
                    </Col>
                </Row>
            </Form>



            {/* 🔍 Modal for viewing company-specific leads */}
            <Modal
                show={showModal}
                onHide={() => setShowModal(false)}
                size="xl"
                centered
                style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    maxWidth: "90vw"
                }}
            >
                {/* 🔥 Gradient Modal Header */}
                <Modal.Header
                    closeButton
                    style={{
                        background: "linear-gradient(to right, black, steelblue, #ff0080, orange)",
                        color: "white",
                        borderBottom: "none",
                    }}
                >
                    <Modal.Title style={{ fontWeight: 800 }}>
                     Text Message Leads for {selectedCompany || "Company"}
                    </Modal.Title>
                </Modal.Header>

                {/* MODAL BODY */}
                <Modal.Body
                    style={{
                        maxHeight: "70vh",
                        overflowY: "auto",
                        background: "#fafafa"
                    }}
                >

                {modalLoading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" />
                        </div>
                    ) : companyLeads.length === 0 ? (
                        <p>No leads found for this company.</p>
                    ) : (

                        <Table
                            striped
                            bordered
                            hover
                            responsive
                            style={{
                                border: "1px solid rgba(255, 105, 180, 0.35)",
                                borderRadius: "8px",
                                overflow: "hidden"
                            }}

                        >
                            <thead>
                            <tr
                                style={{
                                    background: "linear-gradient(to right, black, steelblue, #ff0080)",
                                    color: "white",        // ← ensures column names are white
                                    fontWeight: 700,
                                    textAlign: "center"
                                }}
                            >
                                <th style={{ padding: "12px", color: "white" }}>Actions</th>
                                <th style={{ padding: "12px", color: "white" }}>Name</th>
                                <th style={{ padding: "12px", color: "white" }}>Type</th>
                                <th style={{ padding: "12px", color: "white" }}>City</th>
                                <th style={{ padding: "12px", color: "white" }}>State</th>
                                <th style={{ padding: "12px", color: "white" }}>Phone</th>
                                <th style={{ padding: "12px", color: "white" }}>Description</th>
                                <th style={{ padding: "12px", color: "white" }}>Date</th>
                            </tr>
                            </thead>


                            <tbody>
                            {companyLeads.map((lead, i) => (
                                <tr
                                    key={i}
                                    style={{
                                        borderLeft: "6px solid",
                                        borderImage:
                                            "linear-gradient(to bottom, #ff0080, orange, steelblue) 1",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background =
                                            "linear-gradient(to right, rgba(255,0,128,0.05), rgba(30,144,255,0.05))";
                                        e.currentTarget.style.boxShadow =
                                            "0 0 10px rgba(255,0,128,0.25)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    <td>
                                        <div className="d-flex gap-2">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => sendLeadMessage(lead)}
                                            >
                                                💬Send A.I. Generated Message
                                            </Button>
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={() => openConversation(lead)}
                                            >
                                                🗨️ Open Chat
                                            </Button>
                                        </div>
                                    </td>

                                    <td>{lead.author}</td>
                                    <td>{lead.lead_type}</td>
                                    <td>{lead.city}</td>
                                    <td>{lead.state}</td>
                                    <td>{lead.phone || "—"}</td>
                                    <td>{lead.description || "—"}</td>
                                    <td>{new Date(lead.post_date).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                    )}
                </Modal.Body>

                {/* SECOND MODAL (CHAT) */}
                <Modal
                    show={showChat}
                    onHide={() => setShowChat(false)}
                    size="lg"
                    centered
                >
                    <Modal.Header
                        closeButton
                        style={{
                            background: "linear-gradient(to right, #ff0080, steelblue)",
                            color: "white",
                        }}
                    >
                        <Modal.Title>
                            Conversation with {selectedLead?.author || "Lead"}
                        </Modal.Title>
                    </Modal.Header>

                    <Modal.Body style={{ maxHeight: "60vh", overflowY: "auto" }}>
                        {chatLoading ? (
                            <div className="text-center py-4">
                                <Spinner animation="border" />
                            </div>
                        ) : conversation.length === 0 ? (
                            <p className="text-muted text-center">No messages yet.</p>
                        ) : (
                            conversation.map((msg) => {
                                console.log("msg:", msg); // ✅ works

                                return (
                                    <div
                                        key={msg.id}
                                        className={`p-2 my-2 rounded ${
                                            msg.direction === "outbound"
                                                ? "bg-primary text-white ms-auto"
                                                : "bg-light me-auto"
                                        }`}
                                        style={{ maxWidth: "75%" }}
                                    >
                                        {/* ⏰ Timestamp */}
                                        <small
                                            className="d-block text-muted"
                                            style={{ fontSize: "0.7rem" }}
                                        >
                                            {new Date(msg.created_at).toLocaleTimeString()}
                                        </small>

                                        {/* 💬 Text */}
                                        {msg.message_body && (
                                            <div style={{ marginBottom: msg.media_urls?.length ? "6px" : "0" }}>
                                                {msg.message_body}
                                            </div>
                                        )}

                                        {/* 📸 Images */}
                                        {msg.media_urls && msg.media_urls.length > 0 && (
                                            <div>
                                                {msg.media_urls.map((url, idx) => (
                                                    <img key={idx} src={url} style={{ maxWidth: "200px" }} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </Modal.Body>


                    <Modal.Footer
                        as="form"
                        onSubmit={(e) => {
                            e.preventDefault();
                            sendReply();
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        style={{ flexDirection: "column", gap: "10px" }}
                    >
                        {/* 🟦 Drag + Upload Area */}
                        <div
                            style={{
                                width: "100%",
                                border: "2px dashed #ff0080",
                                background: "#fff",
                                fontWeight: "600",
                                borderRadius: "10px",
                                padding: "10px",
                                textAlign: "center",
                                cursor: "pointer"
                            }}
                            onClick={() => document.getElementById("fileInput").click()}
                        >
                            📎 Drag & drop images or click to upload
                            <input
                                id="fileInput"
                                type="file"
                                multiple
                                accept="image/*"
                                hidden
                                onChange={handleFileChange}
                            />
                        </div>

                        {/* 🖼️ Preview Files */}
                        {files.length > 0 && (
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                {files.map((file, index) => (
                                    <div key={index} style={{ position: "relative" }}>
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="preview"
                                            style={{
                                                width: "80px",
                                                height: "80px",
                                                objectFit: "cover",
                                                borderRadius: "8px"
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(index)}
                                            style={{
                                                position: "absolute",
                                                top: "-5px",
                                                right: "-5px",
                                                background: "red",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "50%",
                                                width: "20px",
                                                height: "20px",
                                                cursor: "pointer"
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ✉️ Message Input */}
                        <div style={{ display: "flex", width: "100%", gap: "10px" }}>
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Type your message..."
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid #ccc"
                                }}
                            />


                            <button type="submit" className="btn btn-primary">
                                Send
                            </button>
                        </div>
                    </Modal.Footer>
                </Modal>
            </Modal>

            <Modal
                show={showEmailModal}
                onHide={() => setShowEmailModal(false)}
                size="xl"
                centered
                dialogClassName="email-modal-width"
            >
                {/* Gradient header */}
                <Modal.Header
                    closeButton
                    style={{
                        background: "linear-gradient(to right, steelblue, #ff0080, orange)",
                        color: "white",
                        borderBottom: "none",
                    }}
                >
                    <Modal.Title style={{ fontWeight: 800 }}>
                        Email Leads for {emailCompanyName || "Company"}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body
                    style={{
                        maxHeight: "70vh",
                        overflowY: "auto",
                        background: "#fafafa"
                    }}
                >
                    <>{/* ⚡ AUTOMATED EMAIL SETTINGS */}
                        <div
                            style={{
                                padding: "15px",
                                marginBottom: "15px",
                                background: "linear-gradient(to right, steelblue, #ff0080)",
                                borderRadius: "8px",
                                color: "white",
                                boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                            }}
                        >
                            <Form.Check
                                type="checkbox"
                                id="autoEmailsToggle"
                                label="Turn Automated Emails On For All Leads"
                                checked={autoEmailEnabled}
                                onChange={(e) => setAutoEmailEnabled(e.target.checked)}
                                style={{
                                    fontWeight: 700,
                                    marginBottom: autoEmailEnabled ? "10px" : "0"
                                }}
                            />

                            {autoEmailEnabled && (
                                <div style={{ marginLeft: "20px" }}>
                                    {/* Monthly */}
                                    <Form.Check
                                        type="radio"
                                        name="autoEmailType"
                                        id="autoMonthly"
                                        label="Automated Monthly"
                                        value="Top of Mind"
                                        checked={autoEmailType === "Top of Mind"}
                                        onChange={async (e) => {
                                            setAutoEmailType(e.target.value);
                                            await loadAutoEmailTemplate(e.target.value);
                                        }}
                                    />

                                    {/* Weekly */}
                                    <Form.Check
                                        type="radio"
                                        name="autoEmailType"
                                        id="autoWeekly"
                                        label="Automated Weekly"
                                        value="Opened Email Hot List"
                                        checked={autoEmailType === "Opened Email Hot List"}
                                        onChange={async (e) => {
                                            setAutoEmailType(e.target.value);
                                            await loadAutoEmailTemplate(e.target.value);
                                        }}
                                    />

                                    {/* Opened Email */}
                                    <Form.Check
                                        type="radio"
                                        name="autoEmailType"
                                        id="autoOpened"
                                        label="Automated Opened Email"
                                        value="Opened Email List"
                                        checked={autoEmailType === "Opened Email List"}
                                        onChange={async (e) => {
                                            setAutoEmailType(e.target.value);
                                            await loadAutoEmailTemplate(e.target.value);
                                        }}
                                    />

                                    {/* Preview Button */}
                                    <Button
                                        className="mt-3"
                                        variant="light"
                                        style={{ fontWeight: 700 }}
                                        onClick={() => {
                                            if (!autoEmailType) {
                                                toast.error("Please choose an automated email type first.");
                                                return;
                                            }

                                            if (!autoEmailTemplate) {
                                                // No template exists → offer redirect to campaign creator
                                                if (window.confirm(
                                                    "No template exists yet. Would you like to create one?"
                                                )) {
                                                    navigate("/campaigns", { state: { selectWorkflow: autoEmailType } });
                                                }
                                            } else {
                                                setShowPreviewModal(true);
                                            }
                                        }}
                                    >
                                        Preview Current Automated Email
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                    {/* MODE: LIST – show table of leads */}
                    {emailViewMode === "list" && (
                        <>
                            {modalLoading ? (
                                <div className="text-center py-4">
                                    <Spinner animation="border" />
                                </div>
                            ) : emailCompanyLeads.length === 0 ? (
                                <p>No leads found for this company.</p>
                            ) : (

                                <Table
                                    striped
                                    bordered
                                    hover
                                    responsive
                                    style={{
                                        border: "1px solid rgba(255, 105, 180, 0.35)",
                                        borderRadius: "8px",
                                        overflow: "hidden"
                                    }}
                                >
                                    <thead>
                                    <tr
                                        style={{
                                            background:
                                                "linear-gradient(to right, black, steelblue, #ff0080)",
                                            color: "white",
                                            fontWeight: 700,
                                            textAlign: "center"
                                        }}
                                    >
                                        <th style={{ padding: "12px", color: "white" }}>Actions</th>
                                        <th style={{ padding: "12px", color: "white" }}>Name</th>
                                        <th style={{ padding: "12px", color: "white" }}>Type</th>
                                        <th style={{ padding: "12px", color: "white" }}>City</th>
                                        <th style={{ padding: "12px", color: "white" }}>State</th>
                                        <th style={{ padding: "12px", color: "white" }}>Phone</th>
                                        <th style={{ padding: "12px", color: "white" }}>Description</th>
                                        <th style={{ padding: "12px", color: "white" }}>Date</th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {emailCompanyLeads.map((lead, i) => (
                                        <tr
                                            key={i}
                                            style={{
                                                borderLeft: "6px solid",
                                                borderImage:
                                                    "linear-gradient(to bottom, #ff0080, orange, steelblue) 1",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease"
                                            }}
                                            // ⬇ click row switches into DETAIL mode
                                            onClick={() => {
                                                setSelectedEmailLead(lead);
                                                setEmailViewMode("detail");
                                                setEmailMessage("");
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background =
                                                    "linear-gradient(to right, rgba(255,0,128,0.05), rgba(30,144,255,0.05))";
                                                e.currentTarget.style.boxShadow =
                                                    "0 0 10px rgba(255,0,128,0.25)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "transparent";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        >
                                            <td>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEmailLead(lead);
                                                        setEmailViewMode("detail");
                                                        setEmailMessage("");
                                                        loadArchivedCampaigns()
                                                    }}
                                                >
                                                    ✉️ Email
                                                </Button>
                                            </td>
                                            <td>{lead.author}</td>
                                            <td>{lead.lead_type}</td>
                                            <td>{lead.city}</td>
                                            <td>{lead.state}</td>
                                            <td>{lead.phone || "—"}</td>
                                            <td>{lead.description || "—"}</td>
                                            <td>{new Date(lead.post_date).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    )}

                    {/* MODE: DETAIL – show a single "email this lead" view, replacing table */}
                    {emailViewMode === "detail" && selectedEmailLead && (
                        <div>
                            <Button
                                variant="secondary"
                                className="mb-3"
                                onClick={() => setEmailViewMode("list")}
                            >
                                ← Back to All Leads
                            </Button>

                            <Card className="" style={{ border: "none",paddingTop:0,paddingBottom:0 }}>
                                <h1
                                    style={{
                                        textAlign: "center",
                                        fontWeight: 900,
                                        background:
                                            "linear-gradient(to right, steelblue, #ff0080, orange)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent"
                                    }}
                                >
                                     {selectedEmailLead.author}
                                </h1>
<hr/>
                                <Row className="mt-3">

                                    <Col md={6}>

                                        {/* 🟪 Previous Campaigns Section */}
                                        <div style={{ marginTop: "0px" }}>

                                            {archivedCampaigns.length > 0 && currentCampaign && (
                                                <div
                                                    style={{
                                                        border: "1px solid #ddd",
                                                        padding: "20px",
                                                        margin: "20px auto",
                                                        borderRadius: "12px",
                                                        background: "white",
                                                        maxWidth: "700px",
                                                        boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
                                                    }}
                                                >
                                                    <h3 style={{
                                                        textAlign: "center",
                                                        fontWeight: 900,
                                                        fontSize: "32px",
                                                        background: "linear-gradient(to right, steelblue, #ff0080, orange)",
                                                        WebkitBackgroundClip: "text",
                                                        WebkitTextFillColor: "transparent",
                                                    }}>Send a current campaign template OR write a personal email below</h3>
<hr/>
                                                {/*    <h3 style={{
                                                        textAlign: "center",
                                                        marginBottom: "15px",
                                                        background: "linear-gradient(to right, steelblue, #ff0080, orange)",
                                                        WebkitBackgroundClip: "text",
                                                        WebkitTextFillColor: "transparent",
                                                        fontWeight: 900
                                                    }}>
                                                        {currentCampaign.name}
                                                    </h3>*/}

                                                    {/* HTML PREVIEW ALWAYS OPEN */}
                                                    <div
                                                        style={{
                                                            border: "1px solid #eee",
                                                            padding: "15px",
                                                            borderRadius: "8px",
                                                            background: "#fafafa",
                                                            maxHeight: "400px",
                                                            overflowY: "auto",
                                                            marginBottom: "15px"
                                                        }}
                                                        dangerouslySetInnerHTML={{ __html: currentCampaign.content }}
                                                    />

                                                    {/* Send Button */}
                                                    <Button
                                                        variant="primary"
                                                        style={{
                                                            width: "100%",
                                                            padding: "12px",
                                                            fontWeight: 700,
                                                            background: "linear-gradient(to right, #ff0080, steelblue)",
                                                            border: "none"
                                                        }}
                                                        onClick={() => sendArchivedCampaign(selectedEmailLead, currentCampaign)}
                                                    >
                                                        Send to {selectedEmailLead?.author}
                                                    </Button>

                                                    {/* PAGINATION CONTROLS */}
                                                    <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                                                        <Button
                                                            variant="light"
                                                            disabled={currentArchiveIndex === 0}
                                                            onClick={() => setCurrentArchiveIndex((i) => i - 1)}
                                                            style={{ marginRight: 10 }}
                                                        >
                                                            ← Previous
                                                        </Button>

                                                        {archivedCampaigns.map((_, idx) => (
                                                            <Button
                                                                key={idx}
                                                                variant={idx === currentArchiveIndex ? "primary" : "outline-primary"}
                                                                onClick={() => setCurrentArchiveIndex(idx)}
                                                                style={{ margin: "0 4px" }}
                                                            >
                                                                {idx + 1}
                                                            </Button>
                                                        ))}

                                                        <Button
                                                            variant="light"
                                                            disabled={currentArchiveIndex === archivedCampaigns.length - 1}
                                                            onClick={() => setCurrentArchiveIndex((i) => i + 1)}
                                                            style={{ marginLeft: 10 }}
                                                        >
                                                            Next →
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}



                                        </div>

{/*
                                        <p><strong>Lead Type:</strong> {selectedEmailLead.lead_type}</p>
*/}







                                    </Col>
                                    <Col md={6}>
                                        <p>
                                            <strong>Date:</strong>{" "}
                                            {new Date(selectedEmailLead.post_date).toLocaleDateString()}
                                        </p>
                                        <p><strong>Description:</strong> {selectedEmailLead.description}</p>
                                        <p><strong>Phone:</strong> {selectedEmailLead.phone || "—"}</p>
                                        <p><strong>City:</strong> {selectedEmailLead.city}</p>
                                        <p><strong>State:</strong> {selectedEmailLead.state}</p>

                                    </Col>
                                </Row>

                                <Form className="mt-4">
                                    <Form.Group controlId="emailMessage">
                                        <Form.Label><strong>Compose a pesronalized Email Message</strong></Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={8}
                                            placeholder="Write your email to this lead..."
                                            value={emailMessage}
                                            onChange={(e) => setEmailMessage(e.target.value)}
                                        />
                                    </Form.Group>

                                    <Button
                                        className="mt-3"
                                        variant="primary"
                                        onClick={() => {
                                            // TODO: wire this to your actual email API
                                            console.log("Send email to lead:", selectedEmailLead.id, emailMessage);
                                            alert("This is where your send-email API call will go.");
                                        }}
                                    >
                                        Send Email
                                    </Button>
                                </Form>
                            </Card>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            <Modal
                show={showPreviewModal}
                onHide={() => setShowPreviewModal(false)}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Preview: {autoEmailType}</Modal.Title>
                </Modal.Header>

                <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    {autoEmailTemplate ? (
                        <div
                            className="p-3"
                            style={{ background: "white", borderRadius: "8px" }}
                            dangerouslySetInnerHTML={{ __html: autoEmailTemplate }}
                        />
                    ) : (
                        <p className="text-muted">No template found.</p>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
            <Modal
                show={showTemplateSendModal}
                onHide={() => setShowTemplateSendModal(false)}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        Send {templateCategory} Email to {sendToLead?.author}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    {templateHTML ? (
                        <div
                            className="p-3"
                            style={{
                                background: "white",
                                borderRadius: "8px",
                                boxShadow: "0 0 10px rgba(0,0,0,0.15)"
                            }}
                            dangerouslySetInnerHTML={{ __html: templateHTML }}
                        />
                    ) : (
                        <p className="text-center text-muted">Loading template...</p>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTemplateSendModal(false)}>
                        Cancel
                    </Button>

                    <Button
                        variant="primary"
                        onClick={async () => {
                            await axios.post(`${EMAIL_LEAD_BASE}/email/send-template-lead`, {
                                lead: sendToLead,
                                category: templateCategory
                            });

                            toast.success("Email sent successfully!");
                            setShowTemplateSendModal(false);
                        }}
                    >
                        Send Email
                    </Button>
                </Modal.Footer>
            </Modal>

            {(currentUserId === 8 || currentUserId === 79) && (
                <IndustryReports userId={currentUserId} />
            )}


        </Container>
    );
}

