const express = require('express');
const router = express.Router();
const smtpController = require('../controllers/smtpController');

// Create or update SMTP settings
router.post('/smtp-settings', smtpController.createOrUpdateSMTPSettings);

// Get SMTP settings for a user
router.get('/smtp-settings/:userId', smtpController.getSMTPSettingsByUserId);

module.exports = router;
