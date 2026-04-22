import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Form, Row, Col, Card, Table, Spinner } from "react-bootstrap";
import moment from "moment";

const API_BASE =
    process.env.NODE_ENV === "production"
        ? "https://upbeat-spontaneity-production.up.railway.app/server/lead_function/api"
        : "http://localhost:5000/server/lead_function/api";

const ALLOWED_INDUSTRIES = new Set([
    "plumber","electrician","hvac","pool","handyman","lawn_care","painter","roofer",
    "pest_control","general_contractor","junk_removal","house_cleaner","pet_sitter",
    "realtor","mover","interior_designer","christmas_lights","lighting","security",
    "windows","power_washing","fencing","lawyer"
]);

export default function IndustryReports({ userId }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [industryReports, setIndustryReports] = useState({});
    const [possibleLeads, setPossibleLeads] = useState([]);

    const [selectedCity, setSelectedCity] = useState("All");
    const [activeIndustry, setActiveIndustry] = useState(null);

    /**
     * 🚀 FETCH DATA
     */
    useEffect(() => {
        if (!userId) return;

        async function fetchReports() {
            setLoading(true);
            setError(null);

            try {
                const baseIndustries = Array.from(ALLOWED_INDUSTRIES);

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
     * 🔥 INDUSTRIES
     */
    const INDUSTRIES = useMemo(() => {
        const fromPossible = possibleLeads
            .map((l) => l.lead_type)
            .filter(Boolean)
            .flatMap((t) =>
                t.split(",").map((x) => x.trim().toLowerCase())
            )
            .filter((i) => ALLOWED_INDUSTRIES.has(i));

        const fromReports = Object.keys(industryReports)
            .map((i) => i.toLowerCase())
            .filter((i) => ALLOWED_INDUSTRIES.has(i));

        return Array.from(new Set([...fromPossible, ...fromReports]));
    }, [possibleLeads, industryReports]);

    /**
     * 🏙️ CITIES
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

        const categories = type.split(",").map(x => x.trim());

        categories.forEach((cat) => {
            if (ALLOWED_INDUSTRIES.has(cat)) {
                possibleCounts[cat] = (possibleCounts[cat] || 0) + 1;
            }
        });
    });

    /**
     * 🔥 SELECTED LEADS
     */
    const selectedLeads = useMemo(() => {
        if (!activeIndustry) return [];

        const normalizedKey = activeIndustry.toLowerCase();

        const sent =
            Object.entries(industryReports).find(
                ([key]) => key.toLowerCase() === normalizedKey
            )?.[1] || [];

        const possible = possibleLeads.filter((l) => {
            const cats =
                l.lead_type?.toLowerCase().split(",").map(x => x.trim()) || [];

            return cats.includes(normalizedKey);
        });

        return [...sent, ...possible];
    }, [activeIndustry, industryReports, possibleLeads]);

    /**
     * 🧠 FILTER + SORT
     */
    const filteredLeads = useMemo(() => {
        return selectedLeads
            .filter((l) => {
                const cityOk =
                    selectedCity === "All" || l.city === selectedCity;
                return cityOk;
            })
            .sort((a, b) => {
                const aDate = a.post_date ? new Date(a.post_date) : 0;
                const bDate = b.post_date ? new Date(b.post_date) : 0;
                return bDate - aDate; // 🔥 newest first
            });
    }, [selectedLeads, selectedCity]);

    /**
     * 🧱 TABLE
     */
    const renderLeadTable = (data) => {
        if (!data.length) return <p className="text-center">No leads found.</p>;

        return (
            <Table striped bordered hover responsive>
                <thead>
                <tr>
                    <th>Author</th>
                    <th>City</th>
                    <th>Type</th>
                    <th>Phone</th>
                    <th>Description</th>
                    <th>Posted</th>
                </tr>
                </thead>
                <tbody>
                {data.map((l, idx) => (
                    <tr key={idx}>
                        <td>{l.author}</td>
                        <td>{l.city}</td>
                        <td>{l.lead_type}</td>
                        <td>{l.phone || "-"}</td>
                        <td>{l.description}</td>
                        <td>
                            {l.post_date
                                ? moment(l.post_date).format("M/D/YYYY")
                                : "-"}
                        </td>
                    </tr>
                ))}
                </tbody>
            </Table>
        );
    };

    /**
     * 🔥 LOADING / ERROR
     */
    if (loading) {
        return <Spinner className="mt-5 d-block mx-auto" />;
    }

    if (error) {
        return <div className="text-danger text-center mt-5">{error}</div>;
    }

    /**
     * 🚀 RENDER
     */
    return (
        <>
            <Card className="p-4 my-4" style={{ border: "none" }}>
                <h2>Industry Reports</h2>

                <Row className="mb-3">
                    <Col md={4}>
                        <Form.Control
                            as="select"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                        >
                            {cities.map((c, i) => (
                                <option key={i}>{c}</option>
                            ))}
                        </Form.Control>
                    </Col>

                    <Col md={4}>
                        <Form.Control
                            as="select"
                            value={activeIndustry || "All"}
                            onChange={(e) =>
                                setActiveIndustry(
                                    e.target.value === "All" ? null : e.target.value
                                )
                            }
                        >
                            <option value="All">Select Industry</option>
                            {INDUSTRIES.map((i) => (
                                <option key={i} value={i}>
                                    {i.toUpperCase()}
                                </option>
                            ))}
                        </Form.Control>
                    </Col>
                </Row>

                <table border="1" width="100%">
                    <thead>
                    <tr>
                        <th>Industry</th>
                        <th>Sent</th>
                        <th>Possible</th>
                    </tr>
                    </thead>
                    <tbody>
                    {INDUSTRIES.map((i) => (
                        <tr
                            key={i}
                            style={{
                                cursor: "pointer",
                                background: activeIndustry === i ? "#eef5ff" : "white"
                            }}
                            onClick={() => setActiveIndustry(i)}
                        >
                            <td><strong>{i.toUpperCase()}</strong></td>
                            <td>{sentCounts[i] || 0}</td>
                            <td>{possibleCounts[i] || 0}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </Card>

            {activeIndustry && (
                <Card className="p-4 mt-3">
                    <h4>{activeIndustry.toUpperCase()} Leads</h4>
                    {renderLeadTable(filteredLeads)}
                </Card>
            )}
        </>
    );
}