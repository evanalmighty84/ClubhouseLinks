const express = require("express");
const router = express.Router();
const marketingController = require("../controllers/marketingController");

// ✅ Reports page endpoint
router.get("/reports/leads", marketingController.getLeadReports);

// ✅ Filters / summary
router.get("/filters", marketingController.getMarketingFilters);
router.get("/summary", marketingController.getMarketingSummary);

// ✅ Get all leads by industry from nextdoor
router.get("/potential-leads", marketingController.getPotentialLeads);

// ✅ Get leads by industry from nextdoor
router.post("/lead-count-by-industry", marketingController.getLeadsByIndustry);

// ✅ Extra marketing report routes
router.get("/lead-count-by-industry", marketingController.getLeadCountByIndustry);
router.get("/lead-count-by-state", marketingController.getLeadCountByState);
router.get("/lead-count-by-city", marketingController.getLeadCountByCity);
router.get("/markets", marketingController.getMarkets);

router.get("/familytreenow/monthly-leads-by-type", marketingController.getMonthlySentLeadsByType);
router.get("/familytreenow/recent-sent-leads", marketingController.getRecentFamilyTreeNowSentLeads);
router.get("/familytreenow/sent-by-company", marketingController.getSentLeadsByCompany);

module.exports = router;