const express = require('express');
const router = express.Router();
const emailQueuedController = require('../controllers/emailQueuedController');

// get Email Queued for user
router.post('/showEmails', emailQueuedController.getEmailQueued);










module.exports = router;