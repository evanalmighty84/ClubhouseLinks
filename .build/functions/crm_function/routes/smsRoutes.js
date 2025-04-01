const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Existing
router.post('/send', smsController.sendSMS);

// ✅ NEW route
router.get('/scheduled/:userId', smsController.getScheduledSMS);

module.exports = router;
