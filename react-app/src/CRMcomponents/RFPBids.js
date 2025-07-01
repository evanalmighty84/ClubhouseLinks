import React, { useEffect, useState } from 'react';

const RFPBids = () => {
    const [bidHtml, setBidHtml] = useState('');
    const [loading, setLoading] = useState(true);

    const staticHtml = `
        <div style="background:#fff; border:1px solid #ccc; border-radius:8px; padding:1rem;">
            <h4 style="margin-bottom:1rem;">RFP Bids</h4>
            <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                <div style="flex:1; min-width:200px; background:#ffdddd; padding:1rem; border-radius:6px;">
                    <strong style="color:#d80028;">Bids Closing Soon</strong>
                    <p style="margin:.25rem 0;"><strong>9</strong> active bids</p>
                    <a href="#" target="_blank" style="color:#d80028;">View &gt;</a>
                </div>
                <div style="flex:1; min-width:200px; background:#aaa; padding:1rem; border-radius:6px; color:white;">
                    <strong>My Bid Invitations</strong>
                    <p style="margin:.25rem 0;"><strong>24</strong> invitations</p>
                    <a href="#" target="_blank" style="color:white;">View &gt;</a>
                </div>
                <div style="flex:1; min-width:200px; background:#aaa; padding:1rem; border-radius:6px; color:white;">
                    <strong>Recent Responses</strong>
                    <p style="margin:.25rem 0;"><strong>1</strong> submitted</p>
                    <a href="#" target="_blank" style="color:white;">View &gt;</a>
                </div>
            </div>
        </div>
    `;

    useEffect(() => {
        const fetchBids = async () => {
            try {
                const res = await fetch('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/ionwave/bids');
                const data = await res.json();
                setBidHtml(data.html || staticHtml);
            } catch (err) {
                console.warn('Fetch failed, using fallback HTML.');
                setBidHtml(staticHtml);
            } finally {
                setLoading(false);
            }
        };

        fetchBids();
    }, []);

    if (loading) return <p>Loading bid invitations...</p>;

    return (
        <div style={{ padding: '1rem' }}>
            <h2>IonWave Bids</h2>
            <div
                dangerouslySetInnerHTML={{ __html: bidHtml }}
            />
        </div>
    );
};

export default RFPBids;
