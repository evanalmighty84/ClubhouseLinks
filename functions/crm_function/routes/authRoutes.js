const express = require('express');
const router = express.Router();
const db = require('../db/db');  // Assuming this file contains your PostgreSQL db connection
const { signup, signin } = require('../controllers/authController');
const { createListsForNewUser } = require('../utils/createAutoLists');
const path = require("path");


// Route for user sign-up
router.post('/signup', signup);

// Route for user sign-in
router.post('/signin', signin);


router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;

    try {
        // Find the user with the matching verification token
        const userResult = await db.query('SELECT * FROM users WHERE verification_token = $1', [token]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid token' });
        }

        const user = userResult.rows[0];

        // Mark the user as verified
        await db.query('UPDATE users SET verified = TRUE, verification_token = NULL WHERE id = $1', [user.id]);

        // Create default lists for the user
        await createListsForNewUser(user.id);
        // Send success response and redirect
        res.redirect('https://www.clubhouselinks.com/verify-email-success');
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;



