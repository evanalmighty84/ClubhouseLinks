const express = require('express');
const router = express.Router();
const emailQueuedController = require('../controllers/emailQueuedController');

// get Email Queued for user
router.post('/showEmails', emailQueuedController.getEmailQueued);
router.post('/pendingEmails', emailQueuedController.getPendingEmailQueued);
router.post('/campaignsandtemplates/all', emailQueuedController.getAllEmails);










module.exports = router;