const express = require('express');
const router = express.Router();
const emailQueuedController = require('../controllers/emailQueuedController');

// get Email Queued for user
router.post('/showEmails', emailQueuedController.getEmailQueued);
router.post('/pendingEmails', emailQueuedController.getPendingEmailQueued);
router.post('/campaignsandtemplates', emailQueuedController.getAllEmails);
router.delete('/delete/:id', emailQueuedController.deleteEmailById);










module.exports = router;