import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Card, Table, Form, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import moment from 'moment';

const NextDoorLeads = () => {
    const [userId, setUserId] = useState(null);
    const [leads, setLeads] = useState([]);
    const [userIndustries, setUserIndustries] = useState([]);
    const [selectedCity, setSelectedCity] = useState('All');
    const [selectedLeadType, setSelectedLeadType] = useState('All');
    const [subscribedCities, setSubscribedCities] = useState([]);
    const [onlyWithPhone, setOnlyWithPhone] = useState(true);




    // 🚀 APIs
    const LOCAL_API = 'http://localhost:5000/server/crm_function/api';
    const HEROKU_API = 'https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api';

    // 1️⃣ On mount, get user ID and fetch leads + industries
    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            const { id } = JSON.parse(user);

            if (id !== 8) {
                setOnlyWithPhone(true);
            }
            setUserId(id);
            fetchIndustryLeads(id);
            fetchUserIndustries(id);
            fetchSubscribedCities(id);
        }
    }, []);



    const fetchSubscribedCities = async (id) => {
        try {
            const res = await axios.get(`${HEROKU_API}/users/${id}/subscribed-areas`);
            const list =
                Array.isArray(res.data?.subscribed_areas)
                    ? res.data.subscribed_areas
                    : (res.data?.subscribed_areas || "")
                        .split(",")
                        .map((c) => c.trim())
                        .filter(Boolean);

            setSubscribedCities(list);
            console.log("📍 Loaded subscribed cities:", list);
        } catch (err) {
            console.error("Error fetching subscribed cities:", err);
        }
    };

    // 2️⃣ Fetch Nextdoor leads (local API)
    const fetchIndustryLeads = async (id) => {
        try {
            const res = await axios.get(
                `https://upbeat-spontaneity-production.up.railway.app/server/crm_function/api/nextdoor/leads/${id}`
            );
            const payload = res.data;
            setLeads(Array.isArray(payload) ? payload : []);
        } catch (err) {
            console.error('Error fetching industry leads:', err);
            toast.error('Failed to load leads by industry.');
        }
    };



    // 3️⃣ Fetch saved user industries (Heroku API)
    const fetchUserIndustries = async (id) => {
        try {
            const res = await axios.get(`${HEROKU_API}/users/${id}/industries`);
            const saved =
                res.data?.userIndustriesArrayNormalized ||
                res.data?.userIndustriesArrayRaw ||
                [];
            setUserIndustries(saved);
            console.log('✅ Loaded user industries:', saved);
        } catch (err) {
            console.error('Error fetching user industries:', err);
            // Only warn, don’t break UI
        }
    };

    // Time range
    const now = moment();
    const sevenDaysAgo = now.clone().subtract(7, 'days');

    // 🔥 Split Hot/Warm by timestamp
    const hotLeads = useMemo(
        () => leads.filter((l) => l.timestamp && moment(l.timestamp).isAfter(sevenDaysAgo)),
        [leads]
    );

    const warmLeads = useMemo(
        () => leads.filter((l) => !l.timestamp || moment(l.timestamp).isSameOrBefore(sevenDaysAgo)),
        [leads]
    );

    // 🏙️ City dropdown options
    const cities = useMemo(() => {
        const norm = (c) => c.trim();
        const list = [...new Set(subscribedCities.map(norm))];
        return ['All', ...list];
    }, [subscribedCities]);


    // 🏷️ Lead Type dropdown options — now driven by saved industries
    const leadTypes = useMemo(() => {
        if (userIndustries?.length > 0) return ['All', ...userIndustries];
        // fallback if industries not loaded
        return ['All', ...Array.from(new Set(leads.map((l) => l.lead_type).filter(Boolean)))];
    }, [userIndustries, leads]);

    // ✅ Filtering logic
    const filterLeads = (data) => {
        const normalize = (str) => (str || '').trim().toLowerCase();

        return data.filter((l) => {
            const cityNorm = normalize(l.city);

            const cityOk =
                (selectedCity === 'All' &&
                    subscribedCities.map(normalize).includes(cityNorm)) ||
                cityNorm === normalize(selectedCity);

            const typeOk =
                selectedLeadType === 'All' ||
                (l.lead_type &&
                    selectedLeadType &&
                    l.lead_type.toLowerCase().includes(selectedLeadType.toLowerCase()));

            const phoneOk = !onlyWithPhone || Boolean(l.phone && l.phone.trim());

            return cityOk && typeOk && phoneOk;
        });
    };


    const filteredHot = filterLeads(hotLeads);
    const filteredWarm = filterLeads(warmLeads);

    // 📝 Open description in new window
    const openDescription = (desc) => {
        const newWindow = window.open('', '_blank', 'width=600,height=400,scrollbars=yes');
        newWindow.document.write(
            `<pre style="font-family:Arial;padding:20px;white-space:pre-wrap;">${desc}</pre>`
        );
    };

    // 🧱 Table Renderer
    const renderTable = (data, label) => (
        <Card className="p-4 my-4" style={{ border: "none" }}>

            {/* LABEL ABOVE */}


            {/* BIG GRADIENT HEADER */}
            <div
                style={{
                    width: "100%",
                    padding: "25px 0",
                    background: label.includes("Hot")
                        ? "linear-gradient(to right, #ff0080, orange, steelblue)"
                        : "linear-gradient(to right, steelblue, #ff0080)",


                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: "20px",
                    borderRadius: "6px"
                }}
            >
                <h2
                    style={{
                        fontWeight: 900,
                        fontSize: "46px",
                        margin: 0,
                        color: "white",
                        textShadow: "0px 2px 4px rgba(0,0,0,0.3)",
                        textAlign: "center"
                    }}
                >
                    {label}
                </h2>
            </div>


            <p style={{ textAlign: 'center' }}>
                {label.includes('Hot')
                    ? 'These are people who have inquired about your industry within the past 7 days. Leads older than one week automatically move to the warm lead category.'
                    : 'These are leads older than 7 days.'}
            </p>

            {(cities.length > 1 || leadTypes.length > 1) && (
                <Row className="mb-3">
                    {cities.length > 1 && (
                        <Col xs={12} md={4} className="mb-2">
                            <Form.Group controlId="citySelect">
                                <Form.Label><strong>Filter by City:</strong></Form.Label>
                                <Form.Control
                                    as="select"
                                    value={selectedCity}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                >
                                    {cities.map((city, idx) => (
                                        <option key={idx} value={city}>
                                            {city}
                                        </option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </Col>
                    )}

                    {leadTypes.length > 1 && (
                        <Col xs={12} md={4} className="mb-2">
                            <Form.Group controlId="leadTypeSelect">
                                <Form.Label><strong>Filter by Lead Type:</strong></Form.Label>
                                <Form.Control
                                    as="select"
                                    value={selectedLeadType}
                                    onChange={(e) => setSelectedLeadType(e.target.value)}
                                >
                                    {leadTypes.map((lt, idx) => (
                                        <option key={idx} value={lt}>
                                            {lt}
                                        </option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </Col>
                    )}

                    {userId === 8 && (
                        <Col xs={12} md={4} className="d-flex align-items-end mb-2">
                            <Form.Check
                                type="checkbox"
                                id="hotHasPhoneCheck"
                                label="Has Phone Number"
                                checked={onlyWithPhone}
                                onChange={(e) => setOnlyWithPhone(e.target.checked)}
                            />
                        </Col>
                    )}

                </Row>
            )}
            <style>
                {`
  /* Remove Bootstrap's default table borders (outer + inner) */
  .table-bordered > :not(caption) > * {
      border-width: 0 !important;
  }
  .table-bordered > :not(caption) > * > * {
      border-width: 0 !important;
  }
`}
            </style>

            {data.length === 0 ? (
                <p style={{ textAlign: 'center' }}>No {label.toLowerCase()} found.</p>
            ) : (
                <Table
                    striped
                    bordered
                    hover
                    responsive
                    style={{
                        border: "1px solid rgba(255, 105, 180, 0.35)",
                        borderRadius: "8px",
                        overflow: "hidden",
                    }}
                >
                    <thead>
                    <tr
                        style={{
                            background: "linear-gradient(to right, black, steelblue, #ff0080)",
                            color: "white",
                            fontWeight: 700,
                            textAlign: "center",
                        }}
                    >
                        <th style={{ padding: "12px",color:'white' }}>Author</th>
                        <th style={{ padding: "12px",color:'white' }}>Location</th>
                        <th style={{ padding: "12px",color:'white' }}>City</th>
                        <th style={{ padding: "12px",color:'white' }}>Lead Type</th>
                        <th style={{ padding: "12px",color:'white' }}>Phone</th>
                        <th style={{ padding: "12px",color:'white' }}>Description</th>
                        <th style={{ padding: "12px",color:'white' }}>Date</th>
                    </tr>
                    </thead>

                    <tbody>
                    {data.map((lead, idx) => (
                        <tr
                            key={idx}
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
                            <td>{lead.author}</td>
                            <td>{lead.location}</td>
                            <td>{lead.city}</td>
                            <td>{lead.lead_type}</td>
                            <td>{lead.phone || "-"}</td>
                            <td
                                style={{
                                    maxWidth: 400,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    color: "steelblue",
                                    fontWeight: 500,
                                    cursor: lead.description ? "pointer" : "default",
                                    textDecoration: lead.description ? "underline" : "none"
                                }}
                                onClick={() =>
                                    lead.description && openDescription(lead.description)
                                }
                            >
                                {lead.description
                                    ? lead.description.length > 100
                                        ? lead.description.slice(0, 100) + "..."
                                        : lead.description
                                    : "-"}
                            </td>
                            <td>
                                {lead.timestamp
                                    ? moment(lead.timestamp).format("M/D/YYYY")
                                    : "-"}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )}
        </Card>
    );

    // 🧩 Render both sections
    return (
        <>
            {renderTable(filteredHot, 'Hot Leads (Last 7 Days)')}
            {renderTable(filteredWarm, 'Warm Leads')}
        </>
    );
};

export default NextDoorLeads;
