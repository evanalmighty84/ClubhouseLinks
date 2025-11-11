const express = require("express");
const router = express.Router();
const leadsController = require("../controllers/leadsController");

// ✅ Get all leads sent (with optional date filter)
router.get("/sent", leadsController.getLeadsSent);

// ✅ Send summary reports to all companies (text_queue_enabled = true)
router.post("/send-summaries", leadsController.sendLeadSummaries);

router.get("/company/:company_name", leadsController.getCompanyLeads);


// ✅ Send tutorial email to one company
/*router.post("/send-tutorial/:userId", leadsController.sendLeadTutorial);*/

module.exports = router;
