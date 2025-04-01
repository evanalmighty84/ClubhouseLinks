const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Existing
router.post('/send', smsController.sendSMS);

// ✅ NEW route
router.get('/scheduled/:userId', smsController.getScheduledSMS);

// smsRoutes.js (add this to the bottom)

router.post('/status-callback', smsController.twilioStatusCallback);


module.exports = router;


