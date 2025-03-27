const express = require('express');
const router = express.Router();
const unsubscribeController = require('../controllers/unsubscribesController');

// Middleware for validating subscriberId
const validateSubscriberId = (req, res, next) => {
    const { subscriberId } = req.params;
    if (!subscriberId || isNaN(subscriberId)) {
        return res.status(400).json({ error: 'Invalid or missing subscriberId' });
    }
    next(); // Pass control to the route handler
};

// DELETE route for programmatic API-based unsubscribe
router.delete('/:subscriberId', validateSubscriberId, unsubscribeController.unsubscribe);

// GET route for unsubscribe confirmation page
router.get('/:subscriberId', (req, res) => {
    const { subscriberId } = req.params;

    // Use the root domain as the form action
    const rootApiUrl = 'https://homepage-809404625.development.catalystserverless.com/server/crm_function';

    res.send(`
        <html>
            <body>
                <h1>Are you sure you want to unsubscribe?</h1>
                <form action="${rootApiUrl}/api/unsubscribe/${subscriberId}" method="POST">
                    <button type="submit">Confirm Unsubscribe</button>
                </form>
            </body>
        </html>
    `);
});

// POST route for handling the unsubscribe confirmation
router.post('/:subscriberId', validateSubscriberId, unsubscribeController.unsubscribe);

module.exports = router;
