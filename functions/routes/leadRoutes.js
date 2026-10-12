const express = require("express");
const router = express.Router();
const leadsController = require("../controllers/leadsController");

// Get all leads sent, with optional date filter
router.get("/sent", leadsController.getLeadsSent);

// Send summary reports to all enabled companies
router.post("/send-summaries", leadsController.sendLeadSummaries);

// Trigger FamilyTreeNow APNs, SMS, and email alerts
router.post(
    "/send-familytree-alerts",
    leadsController.sendFamilyTreeAlerts
);

router.get(
    "/company/:company_name",
    leadsController.getCompanyLeads
);

router.post(
    "/send-chamber-lead-digest",
    leadsController.sendChamberLeadDigest
);

router.get(
    "/chamber-unsubscribe/:token",
    leadsController.unsubscribeChamberEmail
);

router.post(
    "/chamber-unsubscribe/:token",
    leadsController.unsubscribeChamberEmail
);
router.get(
    "/chamber-signup-sms",
    leadsController.openChamberSignupSms
);

// Send tutorial email to one company
/* router.post(
    "/send-tutorial/:userId",
    leadsController.sendLeadTutorial
); */

module.exports = router;