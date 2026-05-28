import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import "./Marketing.css";

const API_BASE =
    process.env.REACT_APP_API_BASE_URL ||
    "https://crm-function-app-5d4de511071d.herokuapp.com";

const REPORTS_URL = `${API_BASE}/server/lead_function/api/marketing/reports/leads`;

const USA_PATH =
    "M121 221 C149 145 224 103 318 116 C406 128 446 86 525 98 C618 113 689 149 748 222 C804 290 776 366 699 403 C614 444 543 393 462 420 C366 452 294 432 217 392 C145 355 91 301 121 221 Z";

// Placeholder for Texas-specific SVG path. Replace this later with the real Texas path.
const TX_PATH = "M260 130 L520 130 L590 250 L520 390 L330 360 L240 250 Z";

const STATE_PATHS = {
    ALL: USA_PATH,
    TX: TX_PATH,
};

const hotspots = [
    { city: "Dallas", state: "TX", x: "34.5%", y: "63.5%", size: 1.2 },
    { city: "Atlanta", state: "GA", x: "52.5%", y: "59.5%", size: 1.05 },
    { city: "Maryland", state: "MD", x: "58.8%", y: "38.5%", size: 0.95 },
    { city: "Virginia", state: "VA", x: "57.2%", y: "45.5%", size: 0.95 },
];

const stateOptions = ["ALL", "TX", "GA", "MD", "VA"];
const monthOptions = [3, 6, 8, 12, 18, 24];

const formatLeadType = (value = "") =>
    String(value)
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

const formatMonth = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value || "");
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    });
};

export default function Marketing() {
    const [selectedState, setSelectedState] = useState("ALL");
    const [selectedMonths, setSelectedMonths] = useState(8);
    const [reportData, setReportData] = useState({
        monthlyByLeadType: [],
        nextdoorLeadTypeCounts: [],
        cityCounts: [],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const mapPath = STATE_PATHS[selectedState] || USA_PATH;

    const visibleHotspots = useMemo(() => {
        if (selectedState === "ALL") return hotspots;
        return hotspots.filter((spot) => spot.state === selectedState);
    }, [selectedState]);

    useEffect(() => {
        let mounted = true;

        async function fetchReports() {
            try {
                setLoading(true);
                setError("");

                const { data } = await axios.get(REPORTS_URL, {
                    params: {
                        state: selectedState,
                        months: selectedMonths,
                    },
                });

                if (!mounted) return;

                setReportData({
                    monthlyByLeadType: Array.isArray(data.monthlyByLeadType)
                        ? data.monthlyByLeadType
                        : [],
                    nextdoorLeadTypeCounts: Array.isArray(data.nextdoorLeadTypeCounts)
                        ? data.nextdoorLeadTypeCounts
                        : [],
                    cityCounts: Array.isArray(data.cityCounts)
                        ? data.cityCounts
                        : [],
                });
            } catch (err) {
                console.error("Failed loading reports:", err);

                if (mounted) {
                    setError("Could not load reports right now.");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchReports();

        return () => {
            mounted = false;
        };
    }, [selectedState, selectedMonths]);

    const totalFamilyTreeLeads = useMemo(() => {
        return reportData.monthlyByLeadType.reduce(
            (sum, row) => sum + Number(row.leads_sent || 0),
            0
        );
    }, [reportData.monthlyByLeadType]);

    const totalNextdoorLeads = useMemo(() => {
        return reportData.nextdoorLeadTypeCounts.reduce(
            (sum, row) => sum + Number(row.lead_count || 0),
            0
        );
    }, [reportData.nextdoorLeadTypeCounts]);

    const topLeadTypes = reportData.nextdoorLeadTypeCounts.slice(0, 8);
    const topCities = reportData.cityCounts.slice(0, 8);
    const recentMonthlyRows = reportData.monthlyByLeadType.slice(0, 12);

    return (
        <section className="reports-map-shell">
            <div className="reports-map-grid-bg" />
            <div className="reports-map-glow" />

            <div className="reports-map-stage" aria-hidden="true">
                <motion.div
                    className="reports-map-stage-inner"
                    initial={{
                        opacity: 0,
                        x: -18,
                        y: 10,
                        scale: 0.985,
                        filter: "blur(2px)",
                    }}
                    animate={{
                        opacity: 1,
                        x: 0,
                        y: 0,
                        scale: 1,
                        filter: "blur(0px)",
                    }}
                    transition={{
                        duration: 0.9,
                        delay: 0.15,
                        ease: "easeOut",
                    }}
                >
                    <div className="reports-map-outline">
                        <svg viewBox="0 0 900 520" preserveAspectRatio="none">
                            <path d={mapPath} />
                        </svg>
                    </div>

                    {visibleHotspots.map((spot) => (
                        <div
                            key={`${spot.city}-${spot.state}`}
                            className="reports-hotspot"
                            style={{
                                left: spot.x,
                                top: spot.y,
                                transform: `translate(-50%, -50%) scale(${spot.size})`,
                            }}
                        >
                            <span className="reports-hotspot-pulse" />
                            <span className="reports-hotspot-dot" />
                            <span className="reports-hotspot-label">
                                {spot.city}, {spot.state}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>

            <div className="reports-map-content">
                <motion.div
                    className="reports-filter-panel"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.75, delay: 0.25, ease: "easeOut" }}
                >
                    <select
                        className="reports-filter"
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                    >
                        {stateOptions.map((state) => (
                            <option key={state} value={state}>
                                {state === "ALL" ? "All States" : state}
                            </option>
                        ))}
                    </select>

                    <select
                        className="reports-filter"
                        value={selectedMonths}
                        onChange={(e) => setSelectedMonths(Number(e.target.value))}
                    >
                        {monthOptions.map((months) => (
                            <option key={months} value={months}>
                                Last {months} Months
                            </option>
                        ))}
                    </select>
                </motion.div>

                <motion.div
                    className="reports-hero"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
                >
                    <div className="reports-eyebrow">LIVE LEAD REPORTING</div>

                    <h1>Lead Reports</h1>

                    <p>
                        Track sent leads, lead categories, cities, and monthly performance
                        across your active markets.
                    </p>

                    {loading && (
                        <div className="reports-status-pill">
                            Loading report data...
                        </div>
                    )}

                    {error && (
                        <div className="reports-status-pill reports-status-error">
                            {error}
                        </div>
                    )}
                </motion.div>

                <div className="reports-counter-grid">
                    <motion.div
                        className="reports-counter-card"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                    >
                        <div className="reports-counter-label">
                            Leads Sent to Users
                        </div>
                        <div className="reports-counter-value">
                            {totalFamilyTreeLeads.toLocaleString()}
                        </div>
                    </motion.div>

                    <motion.div
                        className="reports-counter-card"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                    >
                        <div className="reports-counter-label">
                           Nextdoor/Social Media Leads Generated
                        </div>
                        <div className="reports-counter-value">
                            {totalNextdoorLeads.toLocaleString()}
                        </div>
                    </motion.div>

                    <motion.div
                        className="reports-counter-card"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 }}
                    >
                        <div className="reports-counter-label">Selected Market</div>
                        <div className="reports-counter-value reports-counter-state">
                            {selectedState === "ALL" ? "All" : selectedState}
                        </div>
                    </motion.div>
                </div>

                <div className="reports-card-grid">
                    <ReportCard title="Nextdoor Lead Types">
                        {topLeadTypes.length > 0 ? (
                            topLeadTypes.map((row) => (
                                <ReportRow
                                    key={row.lead_type}
                                    label={formatLeadType(row.lead_type)}
                                    value={row.lead_count}
                                />
                            ))
                        ) : (
                            <EmptyReportText />
                        )}
                    </ReportCard>

                    <ReportCard title="Top Cities">
                        {topCities.length > 0 ? (
                            topCities.map((row) => (
                                <ReportRow
                                    key={row.city}
                                    label={row.city}
                                    value={row.lead_count}
                                />
                            ))
                        ) : (
                            <EmptyReportText />
                        )}
                    </ReportCard>

                    <ReportCard title="Monthly Sent Leads by Type" wide>
                        {recentMonthlyRows.length > 0 ? (
                            recentMonthlyRows.map((row, index) => (
                                <ReportRow
                                    key={`${row.month}-${row.lead_type}-${index}`}
                                    label={`${formatMonth(row.month)} · ${formatLeadType(row.lead_type)}`}
                                    value={row.leads_sent}
                                />
                            ))
                        ) : (
                            <EmptyReportText />
                        )}
                    </ReportCard>
                </div>
            </div>
        </section>
    );
}

function ReportCard({ title, children, wide = false }) {
    return (
        <motion.div
            className={`reports-data-card ${wide ? "reports-data-card-wide" : ""}`}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
        >
            <div className="reports-card-title">{title}</div>
            <div className="reports-card-body">{children}</div>
        </motion.div>
    );
}

function ReportRow({ label, value }) {
    return (
        <div className="reports-row">
            <span>{label}</span>
            <strong>{Number(value || 0).toLocaleString()}</strong>
        </div>
    );
}

function EmptyReportText() {
    return (
        <p className="reports-empty-text">
            No report data found for this filter.
        </p>
    );
}
