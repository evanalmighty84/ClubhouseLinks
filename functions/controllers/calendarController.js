const ical = require("ical-generator");
const pool = require("../db");

exports.getCalendarICS = async (req, res) => {
    const { userId } = req.params;

    try {
        const { rows } = await pool.query(`
            SELECT *
            FROM subscribers
            WHERE user_id = $1
        `, [userId]);

        const cal = ical({
            name: "Clubhouse Links Calendar",
        });

        const createEvent = (sub, date, type) => {
            if (!date) return;

            cal.createEvent({
                start: new Date(date),
                end: new Date(date),
                summary: `${type.toUpperCase()} - ${sub.name}`,
                description: sub.notes || "",
            });
        };

        rows.forEach((sub) => {
            createEvent(sub, sub.scheduled_email, "email");
            createEvent(sub, sub.scheduled_phone_call, "call");
            createEvent(sub, sub.scheduled_meeting, "meeting");
            createEvent(sub, sub.scheduled_other, "other");
        });

        res.setHeader("Content-Type", "text/calendar");
        res.send(cal.toString());

    } catch (err) {
        console.error("Calendar ICS Error:", err);
        res.status(500).json({ error: "Failed to generate calendar" });
    }
};