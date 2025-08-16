import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';

const NextDoorLeads = () => {
    const [userId, setUserId] = useState(null);
    const [leads, setLeads] = useState([]);

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
            const res = await axios.get(`https://upbeat-spontaneity-production.up.railway.app/server/crm_function/api/nextdoor/leads/${id}`);
            setLeads(res.data);
        } catch (err) {
            console.error('Error fetching industry leads:', err);
            toast.error('Failed to load leads by industry.');
        }
    };

    return (
        <Card className="p-4 my-4">
            <h3 style={{ textAlign: 'center', color: 'teal' }}>Matched Industry Leads</h3>
            {leads.length === 0 ? (
                <p style={{ textAlign: 'center' }}>No leads found for your industries.</p>
            ) : (
                <Table striped bordered hover responsive>
                    <thead>
                    <tr>
                        <th>Author</th>
                        <th>Location</th>
                        <th>City</th>
                        <th>Lead Type</th>
                        <th>Post URL</th>
                    </tr>
                    </thead>
                    <tbody>
                    {leads.map((lead, idx) => (
                        <tr key={idx}>
                            <td>{lead.author}</td>
                            <td>{lead.location}</td>
                            <td>{lead.city}</td>
                            <td>{lead.lead_type}</td>
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
