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

// ✅ Localhost backend (for development)
// OLD:
// ✅ NEW:
// ✅ Railway for fetching leads (works fine)
const API_BASE =
    process.env.NODE_ENV === "production"
        ? "https://upbeat-spontaneity-production.up.railway.app/server/lead_function/api"
        : "http://localhost:5000/server/lead_function/api";

// ✅ Heroku for sending emails (SMTP allowed)
const EMAIL_API_BASE =
    process.env.NODE_ENV === "production"
        ? "https://crm-function-app-5d4de511071d.herokuapp.com/server/lead_function/api"
        : "http://localhost:5000/server/lead_function/api";




export default function LeadsSentDashboard() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtering, setFiltering] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Modal state
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyLeads, setCompanyLeads] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchLeadsSent();
    }, []);

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
        if (!window.confirm(`Send report email for ${company.company_name}?`)) return;
        try {
            await axios.post(`${API_BASE}/leads/send-summaries`, {
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
            await axios.post(`${EMAIL_API_BASE}/leads/send-tutorial/${company.id}`);
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
            setCompanyLeads(res.data || []);
        } catch (err) {
            console.error("Error loading company leads:", err);
            alert("Failed to load company leads.");
        } finally {
            setModalLoading(false);
        }
    }

    return (
        <Container className="mt-5">
            <h1 className="mb-4 text-center">📊 Leads Sent Dashboard</h1>

            <Form className="mb-4">
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
                <Row xs={1} md={2} lg={3} className="g-4">
                    {leads.map((company) => (
                        <Col key={company.company_name}>
                            <Card className="h-100 shadow-sm">
                                <Card.Body>
                                    <Card.Title>{company.company_name}</Card.Title>
                                    <Card.Text>
                                        <strong>Total Leads:</strong> {company.total_leads}
                                        <br />
                                        <strong>Cities:</strong> {company.cities}
                                        <br />
                                        <strong>Last Sent:</strong>{" "}
                                        {new Date(company.last_sent).toLocaleString()}
                                    </Card.Text>

                                    <div className="d-grid gap-2">
                                        <Button
                                            variant="outline-primary"
                                            onClick={() => sendReportEmail(company)}
                                        >
                                            📧 Send Report
                                        </Button>
                                        <Button
                                            variant="outline-success"
                                            onClick={() => sendTutorialEmail(company)}
                                        >
                                            🎓 Send Tutorial
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={() => viewLeads(company)}
                                        >
                                            🔍 View Leads
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* 🔍 Modal for viewing company-specific leads */}
            <Modal
                show={showModal}
                onHide={() => setShowModal(false)}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        Leads for {selectedCompany || "Company"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {modalLoading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" />
                        </div>
                    ) : companyLeads.length === 0 ? (
                        <p>No leads found for this company.</p>
                    ) : (
                        <Table striped bordered hover>
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>City</th>
                                <th>State</th>
                                <th>Phone</th>
                                <th>Date</th>
                            </tr>
                            </thead>
                            <tbody>
                            {companyLeads.map((lead, i) => (
                                <tr key={i}>
                                    <td>{lead.author}</td>
                                    <td>{lead.lead_type}</td>
                                    <td>{lead.city}</td>
                                    <td>{lead.state}</td>
                                    <td>{lead.phone || "—"}</td>
                                    <td>
                                        {new Date(lead.scraped_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
}
