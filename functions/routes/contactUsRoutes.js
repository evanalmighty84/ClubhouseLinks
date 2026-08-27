const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const contactUsController = require("../controllers/contactUsController");

/*
 * Contact form spam protection
 *
 * Maximum:
 * 5 submissions per IP address every 15 minutes.
 *
 * This runs BEFORE createContactRequest, so excessive
 * requests never reach Zoho or the controller.
 */
const contactFormLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    message: {
        success: false,
        error: "Too many contact requests. Please try again in a few minutes.",
    },
});

/*
 * POST /contact
 */
router.post(
    "/",
    contactFormLimiter,
    contactUsController.createContactRequest
);

module.exports = router;