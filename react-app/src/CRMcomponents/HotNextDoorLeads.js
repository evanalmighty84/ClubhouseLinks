import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Card, Table, Form, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';

const NextDoorLeads = () => {
    const [userId, setUserId] = useState(null);
    const [leads, setLeads] = useState([]);
    const [selectedCity, setSelectedCity] = useState('All');
    const [selectedLeadType, setSelectedLeadType] = useState('All');
    const [onlyWithPhone, setOnlyWithPhone] = useState(false); // NEW

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            const { id } = JSON.parse(user);
            setUserId(id);
            fetchIndustryLeads(id);
        }
    }, []);

    const fetchIndustryLeads = async (id) => {
        try {
            const res = await axios.get(
                `https://upbeat-spontaneity-production.up.railway.app/server/crm_function/api/nextdoor/leads/${id}`
            );
            const payload = res.data;
            const hot = Array.isArray(payload) ? payload : payload?.hot || [];
            setLeads(hot);
        } catch (err) {
            console.error('Error fetching industry leads:', err);
            toast.error('Failed to load leads by industry.');
        }
    };

    const formatAddress = (s) => (s || '').replace(/\s*\n\s*/g, ', ').trim();

    // Unique lists
    const cities = useMemo(
        () => ['All', ...Array.from(new Set(leads.map((l) => l.city).filter(Boolean)))],
        [leads]
    );
    const leadTypes = useMemo(
        () => ['All', ...Array.from(new Set(leads.map((l) => l.lead_type).filter(Boolean)))],
        [leads]
    );

    // Combined filter (adds phone filter)
    const filteredLeads = useMemo(() => {
        return leads.filter((l) => {
            const cityOk = selectedCity === 'All' || l.city === selectedCity;
            const typeOk = selectedLeadType === 'All' || l.lead_type === selectedLeadType;
            const phoneOk = !onlyWithPhone || Boolean(l.phone && l.phone.trim());
            return cityOk && typeOk && phoneOk;
        });
    }, [leads, selectedCity, selectedLeadType, onlyWithPhone]);

    return (
        <Card className="p-4 my-4">
            <h3 style={{ textAlign: 'center', color: 'teal' }}>Hot Leads</h3>
            <p>
                These are people who have inquired about your industry in the last 7 days.
                You may have the phone number and address of these individuals which will give you
                a step ahead the competition. These Leads are time sensitive. Generally after 1 week, they will be
                put in the warm lead category.
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
                                        <option key={idx} value={city}>{city}</option>
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
                                        <option key={idx} value={lt}>{lt}</option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </Col>
                    )}

                    {/* NEW: Has Phone Number checkbox */}
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

            {filteredLeads.length === 0 ? (
                <p style={{ textAlign: 'center' }}>No leads found for selected filters.</p>
            ) : (
                <Table striped bordered hover responsive>
                    <thead>
                    <tr>
                        <th>Author</th>
                        <th>Location</th>
                        <th>City</th>
                        <th>Lead Type</th>
                        <th>Phone</th>
                        <th>Address</th>
                        <th>Post URL</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredLeads.map((lead, idx) => (
                        <tr key={idx}>
                            <td>{lead.author}</td>
                            <td>{lead.location}</td>
                            <td>{lead.city}</td>
                            <td>{lead.lead_type}</td>
                            <td>{lead.phone || '-'}</td>
                            <td>{formatAddress(lead.physical_address) || '-'}</td>
                            <td>
                                <a href={lead.post_url} target="_blank" rel="noreferrer">
                                    View Post
                                </a>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )}
        </Card>
    );
};

export default NextDoorLeads;
