import { useEffect, useState } from "react";
import axios from "axios";

/**
 * API base (local + production)
 */
const API_BASE =
    process.env.NODE_ENV === "production"
        ? "https://upbeat-spontaneity-production.up.railway.app/server/lead_function/api"
        : "http://localhost:5000/server/lead_function/api";

/**
 * IndustryReports
 *
 * Props:
 * - userId (number) → example: 8
 */
export default function IndustryReports({ userId }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [industryReports, setIndustryReports] = useState({});
    const [possibleLeads, setPossibleLeads] = useState([]);

    // Industries you support
    const INDUSTRIES = ["plumber", "electrician", "hvac"];

    useEffect(() => {
        if (!userId) return;

        async function fetchReports() {
            setLoading(true);
            setError(null);

            try {
                /**
                 * 1️⃣ Leads Sent — per industry
                 */
                const industryRequests = INDUSTRIES.map(industry =>
                    axios.get(
                        `${API_BASE}/reports/leads-sent`,
                        {
                            params: {
                                userId,
                                industry,
                            },
                        }
                    )
                );

                const industryResponses = await Promise.all(industryRequests);

                const industryData = {};
                industryResponses.forEach((res, idx) => {
                    industryData[INDUSTRIES[idx]] = res.data;
                });

                setIndustryReports(industryData);

                /**
                 * 2️⃣ Possible Leads — Nextdoor
                 */
                const possibleLeadsRes = await axios.get(
                    `${API_BASE}/reports/possible-leads`,
                    {
                        params: {
                            industries: INDUSTRIES.join(","),
                        },
                    }
                );

                setPossibleLeads(possibleLeadsRes.data);
            } catch (err) {
                console.error("IndustryReports error:", err);
                setError("Failed to load industry reports");
            } finally {
                setLoading(false);
            }
        }

        fetchReports();
    }, [userId]);

    if (!userId) return null;



    // Count sent leads per industry
    const sentCounts = {};
    Object.entries(industryReports).forEach(([industry, leads]) => {
        sentCounts[industry] = leads.length;
    });

// Count possible leads per industry
    const possibleCounts = {};
    possibleLeads.forEach(lead => {
        const type = lead.lead_type?.toLowerCase();
        if (!type) return;

        INDUSTRIES.forEach(industry => {
            if (type.includes(industry)) {
                possibleCounts[industry] = (possibleCounts[industry] || 0) + 1;
            }
        });
    });


    return (
        <div>
            <h2>Industry Reports</h2>
            <div style={{ marginBottom: "2rem" }}>
                <h3>Industry Opportunity Summary (Last 30 Days)</h3>

                <table border="1" cellPadding="8" width="100%">
                    <thead style={{ backgroundColor: "#f2f2f2" }}>
                    <tr>
                        <th>Industry</th>
                        <th>Leads Sent</th>
                        <th>Potential Leads</th>
                        <th>Opportunity Insight</th>
                    </tr>
                    </thead>
                    <tbody>
                    {INDUSTRIES.map(industry => {
                        const sent = sentCounts[industry] || 0;
                        const possible = possibleCounts[industry] || 0;

                        return (
                            <tr key={industry}>
                                <td style={{ fontWeight: "bold" }}>
                                    {industry.toUpperCase()}
                                </td>
                                <td>{sent}</td>
                                <td>{possible}</td>
                                <td>
                                    {sent > 0 || possible > 0
                                        ? `Delivered ${sent} lead${sent !== 1 ? "s" : ""} and identified ${possible} additional opportunity${possible !== 1 ? "ies" : "y"}`
                                        : "No activity detected"}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>


            {loading && <p>Loading reports…</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {!loading && !error && (
                <>
                    {/* LEADS SENT */}
                    {Object.entries(industryReports).map(([industry, leads]) => (
                        <div key={industry} style={{ marginBottom: "2rem" }}>
                            <h3>{industry.toUpperCase()} — Leads Sent</h3>

                            {leads.length === 0 ? (
                                <p>No leads sent.</p>
                            ) : (
                                <table border="1" cellPadding="6">
                                    <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>City</th>
                                        <th>Phone</th>
                                        <th>Source</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {leads.map(lead => (
                                        <tr key={lead.id}>
                                            <td>{new Date(lead.sent_at).toLocaleDateString()}</td>
                                            <td>{lead.city}</td>
                                            <td>{lead.phone}</td>
                                            <td>{lead.source}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ))}

                    {/* POSSIBLE LEADS */}
                    <div>
                        <h3>Possible Leads (Nextdoor)</h3>

                        {possibleLeads.length === 0 ? (
                            <p>No possible leads found.</p>
                        ) : (
                            <table border="1" cellPadding="6">
                                <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>City</th>
                                    <th>Industry</th>
                                    <th>Description</th>
                                </tr>
                                </thead>
                                <tbody>
                                {possibleLeads.map(lead => (
                                    <tr key={lead.id}>
                                        <td>{new Date(lead.timestamp).toLocaleDateString()}</td>
                                        <td>{lead.city}</td>
                                        <td>{lead.lead_type}</td>
                                        <td>{lead.description}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
