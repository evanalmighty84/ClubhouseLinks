const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Existing
router.post('/send', smsController.sendSMS);

// ✅ NEW route
router.get('/scheduled/:userId', smsController.getScheduledSMS);

router.get('/all/:userId', smsController.getAllSMS);

// smsRoutes.js (add this to the bottom)

router.post('/status-callback', smsController.twilioStatusCallback);

router.post('/alert-lead', smsController.notifyUsersForLead);

router.post(
    '/incoming',
    express.urlencoded({ extended: false }), // only this route needs form support
    smsController.twilioHandleIncomingSMS
);


module.exports = router;


