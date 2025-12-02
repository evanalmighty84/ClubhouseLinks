const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Existing
router.post('/send', smsController.sendSMS);
router.post('/texas', smsController.testTexasNumber);
router.post('/test-send-texas', smsController.testTexasSmsSend);


// ✅ NEW route
router.get('/scheduled/:userId', smsController.getScheduledSMS);

router.get('/all/:userId', smsController.getAllSMS);

// smsRoutes.js (add this to the bottom)

router.post('/status-callback', smsController.twilioStatusCallback);

router.post('/alert-lead', smsController.notifyUsersForLead);

router.post('/message-lead', smsController.messageLead);

// NEW — get new inbound messages for a user
router.get('/new-messages/:userId', smsController.getNewMessages);

// NEW — mark inbound messages as seen
router.post('/messages/mark-seen', smsController.markMessagesSeen);


router.post(
    '/incoming',
    express.urlencoded({ extended: false }), // only this route needs form support
    smsController.twilioHandleIncomingSMS
);

router.post('/lead/send-reply', smsController.sendLeadReply);
router.get('/lead/conversation/:leadId', smsController.getLeadConversation);


module.exports = router;



