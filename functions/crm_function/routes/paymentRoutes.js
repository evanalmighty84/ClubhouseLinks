const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// ✅ Apply express.raw ONLY here
router.post('/text-subscription-webhook', express.raw({ type: 'application/json' }), paymentController.textSignup);

module.exports = router;
