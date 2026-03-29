import React, { useEffect, useState } from "react";
import { Button, Alert } from "react-bootstrap";

const CalendarSync = () => {
    const [icalUrl, setIcalUrl] = useState("");

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user?.id) {
            setIcalUrl(
                `https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/calendar/${user.id}.ics`
            );
        }
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(icalUrl);
        alert("Calendar link copied!");
    };

    return (
        <div style={{ marginBottom: 20 }}>
            <h5 style={{ color: "#ff7043" }}>📅 Sync to Your Phone Calendar</h5>

            <Alert variant="info">
                Subscribe to this calendar to see all scheduled emails, calls, meetings, and texts directly in your phone calendar.
            </Alert>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button variant="primary" onClick={copyToClipboard}>
                    Copy iCal Link
                </Button>

                <Button
                    variant="success"
                    onClick={() => window.open(icalUrl, "_blank")}
                >
                    Open Calendar Feed
                </Button>
            </div>

            <p style={{ marginTop: 10, fontSize: "0.9rem" }}>
                Paste this into your calendar app subscription settings.
            </p>
        </div>
    );
};

export default CalendarSync;