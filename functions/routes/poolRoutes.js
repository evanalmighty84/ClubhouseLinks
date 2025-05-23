const express = require('express');
const router = express.Router();
const poolController = require('../controllers/poolController');

// Post to Db pool referral
router.post('/poolreferrals', poolController.createReferral);








module.exports = router;
