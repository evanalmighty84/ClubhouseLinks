const express = require("express");
const router = express.Router();
const demoController = require("../controllers/demoController");
const leadsController = require("../controllers/leadsController");


router.post("/sent", demoController.sendDemoLead);
router.post(
    "/hoaboard-demo",
    demoController.sendHOABoardDemo
);

module.exports = router;