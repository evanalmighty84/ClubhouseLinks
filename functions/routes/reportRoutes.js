const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reportsController");

// Leads sent (by user + industry)
router.get(
    "/leads-sent",
    reportsController.getLeadsSentByIndustry
);

// Possible leads (Nextdoor)
router.get(
    "/possible-leads",
    reportsController.getPossibleLeads
);

router.post(
    "/send-industry-report",
    reportsController.sendIndustryReportsEmail
);

module.exports = router;
