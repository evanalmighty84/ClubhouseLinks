import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Form, Row, Col, Card } from "react-bootstrap";

/**
 * API base
 */
const API_BASE =
    process.env.NODE_ENV === "production"
        ? "https://upbeat-spontaneity-production.up.railway.app/server/lead_function/api"
        : "http://localhost:5000/server/lead_function/api";

export default function IndustryReports({ userId }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [industryReports, setIndustryReports] = useState({});
    const [possibleLeads, setPossibleLeads] = useState([]);

    const [selectedCity, setSelectedCity] = useState("All");
    const [selectedIndustry, setSelectedIndustry] = useState("All");

    /**
     * 🚀 FETCH DATA
     */
    useEffect(() => {
        if (!userId) return;

        async function fetchReports() {
            setLoading(true);
            setError(null);

            try {
                // TEMP base industries (still needed for API)
                const baseIndustries = ["plumber", "electrician", "hvac"];

                const requests = baseIndustries.map((industry) =>
                    axios.get(`${API_BASE}/reports/leads-sent`, {
                        params: { userId, industry },
                    })
                );

                const responses = await Promise.all(requests);

                const data = {};
                responses.forEach((res, idx) => {
                    data[baseIndustries[idx]] = res.data;
                });

                setIndustryReports(data);

                const possibleRes = await axios.get(
                    `${API_BASE}/reports/possible-leads`,
                    {
                        params: {
                            industries: baseIndustries.join(","),
                        },
                    }
                );

                setPossibleLeads(possibleRes.data);
            } catch (err) {
                console.error(err);
                setError("Failed to load reports");
            } finally {
                setLoading(false);
            }
        }

        fetchReports();
    }, [userId]);

    /**
     * 🔥 DYNAMIC INDUSTRIES (HOOK — MUST BE TOP LEVEL)
     */
    const INDUSTRIES = useMemo(() => {
        const fromPossible = possibleLeads
            .map((l) => l.lead_type)
            .filter(Boolean)
            .flatMap((t) =>
                t.split(",").map((x) => x.trim().toLowerCase())
            );

        const fromReports = Object.keys(industryReports);

        return Array.from(new Set([...fromPossible, ...fromReports]));
    }, [possibleLeads, industryReports]);

    /**
     * 🏙️ CITIES (HOOK — MUST BE TOP LEVEL)
     */
    const cities = useMemo(() => {
        return [
            "All",
            ...Array.from(
                new Set(
                    [
                        ...possibleLeads.map((l) => l.city),
                        ...Object.values(industryReports)
                            .flat()
                            .map((l) => l.city),
                    ].filter(Boolean)
                )
            ),
        ];
    }, [possibleLeads, industryReports]);

    /**
     * ⛔ IMPORTANT: AFTER hooks
     */
    if (!userId) return null;

    /**
     * 📊 COUNTS
     */
    const sentCounts = {};
    Object.entries(industryReports).forEach(([industry, leads]) => {
        sentCounts[industry] = leads.length;
    });

    const possibleCounts = {};
    possibleLeads.forEach((lead) => {
        const type = lead.lead_type?.toLowerCase();
        if (!type) return;

        INDUSTRIES.forEach((industry) => {
            if (type.includes(industry)) {
                possibleCounts[industry] =
                    (possibleCounts[industry] || 0) + 1;
            }
        });
    });

    /**
     * 🔍 FILTER FUNCTION
     */
    const filter = (data, industryKey = null) =>
        data.filter((item) => {
            const cityOk =
                selectedCity === "All" || item.city === selectedCity;

            const industryOk =
                selectedIndustry === "All" ||
                industryKey === selectedIndustry ||
                item.lead_type
                    ?.toLowerCase()
                    .includes(selectedIndustry);

            return cityOk && industryOk;
        });

    return (
        <Card className="p-4 my-4" style={{ border: "none" }}>
            {/* 🔥 HEADER */}
            <div
                style={{
                    width: "100%",
                    padding: "25px 0",
                    background:
                        "linear-gradient(to right, #ff0080, orange, steelblue)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: "20px",
                    borderRadius: "6px",
                }}
            >
                <h2
                    style={{
                        fontWeight: 900,
                        color: "white",
                        margin: 0,
                    }}
                >
                    Industry Reports
                </h2>
            </div>

            {/* 🔽 FILTERS */}
            <Row className="mb-3">
                <Col md={4}>
                    <Form.Group>
                        <Form.Label>
                            <strong>City</strong>
                        </Form.Label>
                        <Form.Control
                            as="select"
                            value={selectedCity}
                            onChange={(e) =>
                                setSelectedCity(e.target.value)
                            }
                        >
                            {cities.map((c, i) => (
                                <option key={i}>{c}</option>
                            ))}
                        </Form.Control>
                    </Form.Group>
                </Col>

                <Col md={4}>
                    <Form.Group>
                        <Form.Label>
                            <strong>Industry</strong>
                        </Form.Label>
                        <Form.Control
                            as="select"
                            value={selectedIndustry}
                            onChange={(e) =>
                                setSelectedIndustry(e.target.value)
                            }
                        >
                            <option>All</option>
                            {INDUSTRIES.map((i, idx) => (
                                <option key={idx}>{i}</option>
                            ))}
                        </Form.Control>
                    </Form.Group>
                </Col>
            </Row>

            {/* 📊 SUMMARY */}
            <h4>Opportunity Summary</h4>
            <table border="1" width="100%" cellPadding="8">
                <thead style={{ background: "#f2f2f2" }}>
                <tr>
                    <th>Industry</th>
                    <th>Sent</th>
                    <th>Possible</th>
                </tr>
                </thead>
                <tbody>
                {INDUSTRIES.map((i) => (
                    <tr key={i}>
                        <td>
                            <strong>{i.toUpperCase()}</strong>
                        </td>
                        <td>{sentCounts[i] || 0}</td>
                        <td>{possibleCounts[i] || 0}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {/* 🔥 LEADS SENT */}
            {Object.entries(industryReports).map(
                ([industry, leads]) => {
                    const filtered = filter(leads, industry);

                    return (
                        <div key={industry} style={{ marginTop: "2rem" }}>
                            <h4>
                                {industry.toUpperCase()} — Leads Sent
                            </h4>

                            {filtered.length === 0 ? (
                                <p>No leads</p>
                            ) : (
                                <table border="1" cellPadding="6">
                                    <tbody>
                                    {filtered.map((l) => (
                                        <tr key={l.id}>
                                            <td>{l.city}</td>
                                            <td>{l.phone}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    );
                }
            )}

            {/* 🔥 POSSIBLE LEADS */}
            <div style={{ marginTop: "2rem" }}>
                <h4>Possible Leads</h4>

                {filter(possibleLeads).length === 0 ? (
                    <p>No leads</p>
                ) : (
                    filter(possibleLeads).map((l) => (
                        <div key={l.id}>
                            {l.city} — {l.lead_type}
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}