import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Card, Table, Form, Row, Col, Pagination } from 'react-bootstrap';
import { toast } from 'react-toastify';

const PAGE_SIZE = 20;

const NextDoorLeads = () => {
    const [userId, setUserId] = useState(null);
    const [leads, setLeads] = useState([]);
    const [selectedCity, setSelectedCity] = useState('All');
    const [selectedLeadType, setSelectedLeadType] = useState('All');
    const [onlyWithPhone, setOnlyWithPhone] = useState(false);
    const [page, setPage] = useState(1);

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
            const warm = Array.isArray(payload) ? payload : (payload?.warm || []);
            setLeads(warm);
        } catch (err) {
            console.error('Error fetching industry leads:', err);
            toast.error('Failed to load leads by industry.');
        }
    };

    const formatAddress = (s) => (s || '').replace(/\s*\n\s*/g, ', ').trim();

    // Unique lists
    const cities = useMemo(
        () => ['All', ...new Set(leads.map((l) => l.city).filter(Boolean))],
        [leads]
    );
    const leadTypes = useMemo(
        () => ['All', ...new Set(leads.map((l) => l.lead_type).filter(Boolean))],
        [leads]
    );

    // Filtered list
    const filteredLeads = useMemo(() => {
        return leads.filter((l) => {
            const cityMatch = selectedCity === 'All' || l.city === selectedCity;
            const typeMatch = selectedLeadType === 'All' || l.lead_type === selectedLeadType;
            const phoneMatch = !onlyWithPhone || Boolean(l.phone && l.phone.trim());
            return cityMatch && typeMatch && phoneMatch;
        });
    }, [leads, selectedCity, selectedLeadType, onlyWithPhone]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [selectedCity, selectedLeadType, onlyWithPhone]);

    // Pagination
    const total = filteredLeads.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const startIdx = (page - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, total);
    const pageLeads = filteredLeads.slice(startIdx, endIdx);

    const renderPagination = () => {
        if (pageCount <= 1) return null;
        const items = [];

        items.push(
            <Pagination.Prev key="prev" disabled={page === 1} onClick={() => setPage((p) => p - 1)} />
        );

        const pagesToShow = new Set([1, page - 1, page, page + 1, pageCount]);
        const ordered = [...pagesToShow].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

        ordered.forEach((p, idx) => {
            if (idx > 0 && p - ordered[idx - 1] > 1) {
                items.push(<Pagination.Ellipsis key={`el-${p}`} disabled />);
            }
            items.push(
                <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>
                    {p}
                </Pagination.Item>
            );
        });

        items.push(
            <Pagination.Next key="next" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)} />
        );

        return <Pagination className="mt-2">{items}</Pagination>;
    };

    return (
        <Card className="p-4 my-4">
            <h3 style={{ textAlign: 'center', color: 'teal' }}>Warm Leads</h3>
            <p>
                These are people who have inquired about your industry in social media forums and have most
                likely bought services from someone like you. It's always good to check up on these leads…
            </p>

            {(cities.length > 1 || leadTypes.length > 1) && (
                <Row className="mb-3">
                    {cities.length > 1 && (
                        <Col xs={12} md={4} className="mb-2">
                            <Form.Group controlId="citySelect">
                                <Form.Label>
                                    <strong>Filter by City:</strong>
                                </Form.Label>
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
                                <Form.Label>
                                    <strong>Filter by Lead Type:</strong>
                                </Form.Label>
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
                            id="hasPhoneCheck"
                            label="Has Phone Number"
                            checked={onlyWithPhone}
                            onChange={(e) => setOnlyWithPhone(e.target.checked)}
                        />
                    </Col>
                </Row>
            )}

            {pageLeads.length === 0 ? (
                <p style={{ textAlign: 'center' }}>No leads found for selected filters.</p>
            ) : (
                <>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <small>
                            Showing <strong>{total === 0 ? 0 : startIdx + 1}</strong>–<strong>{endIdx}</strong> of{' '}
                            <strong>{total}</strong>
                        </small>
                        {renderPagination()}
                    </div>

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
                        {pageLeads.map((lead, idx) => (
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

                    <div className="d-flex justify-content-end">{renderPagination()}</div>
                </>
            )}
        </Card>
    );
};

export default NextDoorLeads;
