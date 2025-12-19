// routes/agentPipelineEmailRoutes.js
const express = require("express");
const router = express.Router();
const sendEmail = require("../utils/sendEmail");

router.post("/send", async (req, res) => {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({
            error: "Missing required email fields",
        });
    }

    try {
        await sendEmail(to, subject, html);
        return res.json({ ok: true });
    } catch (err) {
        console.error("AgentPipeline email send failed:", err);
        return res.status(500).json({ error: "Email send failed" });
    }
});

module.exports = router;
