const express = require("express");
const router = express.Router();
const calendarController = require("../controllers/calendarController");

// GET iCal feed
router.get("/:userId.ics", calendarController.getCalendarICS);

module.exports = router;