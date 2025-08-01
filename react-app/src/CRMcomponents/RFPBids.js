import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const RFPBids = () => {
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fallback, setFallback] = useState(false);

    const fallbackBid = {
        title: "Annual Contract for Voter Registration Certificate Cards",
        agency: "Tarrant County, TX",
        bidNumber: "F2025197",
        issueDate: "7/3/2025",
        closeDate: "7/31/2025 02:00 PM (CT)",
        timeLeft: "5 Mins",
        status: "Issued",
        response: "No Response"
    };

    useEffect(() => {
        const fetchBids = async () => {
            try {
                const res = await fetch('http://localhost:5000/server/crm_function/api/ionwave/bids'); // ✅ LOCAL
                const data = await res.json();

                if (data.success && data.bids.length > 0) {
                    setBids(data.bids);
                } else {
                    setBids([fallbackBid]);
                    setFallback(true);
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setBids([fallbackBid]);
                setFallback(true);
            } finally {
                setLoading(false);
            }
        };

        fetchBids();
    }, []);

    if (loading) return <div className="text-center my-4">Loading bid invitations...</div>;

    return (
        <div className="container my-4">
            <h2 className="mb-4">IonWave Bids</h2>

            {fallback && (
                <div className="alert alert-warning" role="alert">
                    ⚠️ Displaying fallback data. Live data could not be fetched.
                </div>
            )}

            <div className="row">
                {bids.map((bid, index) => (
                    <div key={index} className="col-md-6 col-lg-4 mb-4">
                        <div className="card shadow-sm h-100">
                            <div className="card-body">
                                <h5 className="card-title">{bid.title}</h5>
                                <ul className="list-unstyled small mb-0">
                                    <li><strong>Agency:</strong> {bid.agency}</li>
                                    <li><strong>Bid #:</strong> {bid.bidNumber}</li>
                                    <li><strong>Project Name:</strong> {bid.projectName || '—'}</li>
                                    <li><strong>Issue Date:</strong> {bid.issueDate}</li>
                                    <li><strong>Close Date:</strong> {bid.closeDate}</li>
                                    <li><strong>Time Left:</strong> {bid.timeLeft}</li>
                                    <li><strong>Status:</strong> {bid.status}</li>
                                    <li><strong>Response:</strong> {bid.response}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RFPBids;
