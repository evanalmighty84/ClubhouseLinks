import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Card, Table, Form, Row, Col, Spinner } from 'react-bootstrap';
import moment from 'moment';

const SentLeads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedCity, setSelectedCity] = useState('All');
    const [selectedLeadType, setSelectedLeadType] = useState('All');

    // ✅ USE LOCAL OR PROD
    const API =
        process.env.NODE_ENV === "production"
            ? "https://crm-function-app-5d4de511071d.herokuapp.com/server/lead_function/api"
            : "http://localhost:5000/server/lead_function/api";

    useEffect(() => {
        console.log("🚀 SentLeads mounted");

        const user = JSON.parse(localStorage.getItem('user'));
        console.log("👤 USER:", user);

        if (!user?.company_name) {
            setError("User missing company_name");
            setLoading(false);
            return;
        }

        fetchLeads(user.company_name);
    }, []);

    const fetchLeads = async (company) => {
        try {
            setLoading(true);
            setError(null);

            const encodedCompany = encodeURIComponent(company);

            // ✅ CORRECT ENDPOINT
            const url = `${API}/leads/company/${encodedCompany}`;

            console.log("🔥 CALLING API:", url);

            const res = await axios.get(url);

            console.log("🔥 LEADS FROM API:", res.data);

            setLeads(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("❌ FETCH ERROR:", err);
            setError("Failed to load leads");
        } finally {
            setLoading(false);
        }
    };

    // 🔥 Normalize helper (fixes filtering bugs)
    const normalize = (str) => (str || '').trim().toLowerCase();

    // ⏱️ Hot/Warm split
    const now = moment();
    const sevenDaysAgo = now.clone().subtract(7, 'days');

    const hotLeads = useMemo(() => {
        return leads.filter((l) =>
            l.post_date &&
            moment(l.post_date).isValid() &&
            moment(l.post_date).isAfter(sevenDaysAgo)
        );
    }, [leads]);

    const warmLeads = useMemo(() => {
        return leads.filter((l) =>
            !l.post_date ||
            !moment(l.post_date).isAfter(sevenDaysAgo)
        );
    }, [leads]);

    // 🏙️ Cities
    const cities = useMemo(() => {
        const list = [...new Set(leads.map((l) => l.city).filter(Boolean))];
        return ['All', ...list];
    }, [leads]);

    // 🏷️ Lead Types
    const leadTypes = useMemo(() => {
        const list = [...new Set(leads.map((l) => l.lead_type).filter(Boolean))];
        return ['All', ...list];
    }, [leads]);

    // 🔍 Filtering (FIXED)
    const filterLeads = (data) => {
        return data.filter((l) => {
            const cityOk =
                selectedCity === 'All' ||
                normalize(l.city) === normalize(selectedCity);

            const typeOk =
                selectedLeadType === 'All' ||
                normalize(l.lead_type).includes(normalize(selectedLeadType));

            return cityOk && typeOk;
        });
    };

    const filteredHot = filterLeads(hotLeads);
    const filteredWarm = filterLeads(warmLeads);

    // 🧱 Table Renderer
    const renderTable = (data, label) => (
        <Card className="p-4 my-4" style={{ border: "none" }}>

            <div
                style={{
                    padding: "25px 0",
                    background: label.includes("Hot")
                        ? "linear-gradient(to right, #ff0080, orange, steelblue)"
                        : "linear-gradient(to right, steelblue, #ff0080)",
                    textAlign: "center",
                    borderRadius: "6px",
                    marginBottom: "20px"
                }}
            >
                <h2 style={{ color: "white", fontWeight: 900 }}>{label}</h2>
            </div>

            <Row className="mb-3">
                <Col md={4}>
                    <Form.Control
                        as="select"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                    >
                        {cities.map((c, i) => (
                            <option key={i}>{c}</option>
                        ))}
                    </Form.Control>
                </Col>

                <Col md={4}>
                    <Form.Control
                        as="select"
                        value={selectedLeadType}
                        onChange={(e) => setSelectedLeadType(e.target.value)}
                    >
                        {leadTypes.map((lt, i) => (
                            <option key={i}>{lt}</option>
                        ))}
                    </Form.Control>
                </Col>
            </Row>

            {data.length === 0 ? (
                <p className="text-center">No leads found.</p>
            ) : (
                <Table striped bordered hover responsive>
                    <thead>
                    <tr>
                        <th>Author</th>
                        <th>City</th>
                        <th>Lead Type</th>
                        <th>Phone</th>
                        <th>Description</th>
                        <th>Posted</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((lead, idx) => (
                        <tr key={idx}>
                            <td>{lead.author}</td>
                            <td>{lead.city}</td>
                            <td>{lead.lead_type}</td>
                            <td>{lead.phone || '-'}</td>
                            <td>{lead.description}</td>
                            <td>
                                {lead.post_date
                                    ? moment(lead.post_date).format("M/D/YYYY")
                                    : '-'}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )}
        </Card>
    );

    if (loading) {
        return <Spinner className="mt-5 d-block mx-auto" />;
    }

    if (error) {
        return <div className="text-danger text-center mt-5">{error}</div>;
    }

    return (
        <>
            {renderTable(filteredHot, "🔥 Hot Leads")}
            {renderTable(filteredWarm, "Warm Leads")}
        </>
    );
};

export default SentLeads;