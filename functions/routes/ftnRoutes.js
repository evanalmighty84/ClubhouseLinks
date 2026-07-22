const express = require("express");
const router = express.Router();
const ftnController = require("../controllers/ftnController");

router.post("/enrichment", ftnController.enrichGeneralContracting);

module.exports = router;