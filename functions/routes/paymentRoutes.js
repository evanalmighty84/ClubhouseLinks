const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// ✅ Stripe webhook — RAW BODY ONLY HERE
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    paymentController.stripeWebhook
);

// ✅ Start subscription (Stripe Checkout)
router.post(
    '/checkout',
    express.json(), // normal JSON body
    paymentController.createCheckoutSession
);

// ✅ Cancel subscription (never delete customer)
router.post(
    '/cancel-subscription',
    express.json(), // normal JSON body
    paymentController.cancelSubscription
);

// ✅ Get subscription status for UI
router.get(
    '/subscription/:userId',
    paymentController.getSubscription
);

router.get(
    '`/sync/${userId}`',
    paymentController.getSubscription
);

module.exports = router;
