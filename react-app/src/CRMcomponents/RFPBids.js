import React, { useEffect, useState } from 'react';

const RFPBids= () => {
    const [bidHtml, setBidHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBids = async () => {
            try {
                const res = await fetch('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/ionwave/bids');
                const data = await res.json();
                setBidHtml(data.html);
            } catch (err) {
                console.error('Error fetching bid data:', err);
                setError('Failed to load bids');
            } finally {
                setLoading(false);
            }
        };

        fetchBids();
    }, []);

    if (loading) return <p>Loading bid invitations...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div>
            <h2>IonWave Bids</h2>
            <div
                dangerouslySetInnerHTML={{ __html: bidHtml }}
                style={{ border: '1px solid #ccc', padding: '1rem', background: '#fafafa' }}
            />
        </div>
    );
};

export default RFPBids;
