const express = require("express");
const router = express.Router();
const smsMobileController = require("../controllers/smsMobileController");
router.post(
    "/sms/mobile",
    smsMobileController.twilioMobileInbound
);

module.exports = router
