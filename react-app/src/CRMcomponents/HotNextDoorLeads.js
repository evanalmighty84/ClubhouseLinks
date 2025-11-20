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
    const [onlyWithPhone, setOnlyWithPhone] = useState(false);
    const [subscribedCities, setSubscribedCities] = useState([]);



    // 🚀 APIs
    const LOCAL_API = 'http://localhost:5000/server/crm_function/api';
    const HEROKU_API = 'https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api';

    // 1️⃣ On mount, get user ID and fetch leads + industries
    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            const { id } = JSON.parse(user);
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
        <Card className="p-4 my-4">
            <h3 style={{ textAlign: 'center', color: 'teal' }}>{label}</h3>
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

                    <Col xs={12} md={4} className="d-flex align-items-end mb-2">
                        <Form.Check
                            type="checkbox"
                            id="hotHasPhoneCheck"
                            label="Has Phone Number"
                            checked={onlyWithPhone}
                            onChange={(e) => setOnlyWithPhone(e.target.checked)}
                        />
                    </Col>
                </Row>
            )}

            {data.length === 0 ? (
                <p style={{ textAlign: 'center' }}>No {label.toLowerCase()} found.</p>
            ) : (
                <Table striped bordered hover responsive>
                    <thead>
                    <tr>
                        <th>Author</th>
                        <th>Location</th>
                        <th>City</th>
                        <th>Lead Type</th>
                        <th>Phone</th>
                        <th>Description</th>
                        <th>Date</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((lead, idx) => (
                        <tr key={idx}>
                            <td>{lead.author}</td>
                            <td>{lead.location}</td>
                            <td>{lead.city}</td>
                            <td>{lead.lead_type}</td>
                            <td>{lead.phone || '-'}</td>
                            <td
                                style={{
                                    maxWidth: 400,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {lead.description ? (
                                    <span
                                        style={{
                                            color: 'teal',
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => openDescription(lead.description)}
                                    >
                                            {lead.description.length > 100
                                                ? lead.description.slice(0, 100) + '...'
                                                : lead.description}
                                        </span>
                                ) : (
                                    '-'
                                )}
                            </td>
                            <td>
                                {lead.timestamp
                                    ? moment(lead.timestamp).format('M/D/YYYY')
                                    : '-'}
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
