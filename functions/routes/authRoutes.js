const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const db = require("../db/db");
const { signup, signin } = require("../controllers/authController");
const { createListsForNewUser } = require("../utils/createAutoLists");


/*
 * =========================================================
 * SIGNUP RATE LIMITER
 * =========================================================
 *
 * Prevent one IP address from creating large numbers
 * of accounts.
 *
 * Maximum: 5 signup attempts per hour per IP.
 */
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    message: {
        error: "Too many signup attempts. Please try again later.",
    },
});


/*
 * =========================================================
 * EMAIL VERIFICATION RATE LIMITER
 * =========================================================
 *
 * Helps prevent bots from hammering random verification
 * tokens against the endpoint.
 */
const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    message: {
        error: "Too many verification attempts. Please try again later.",
    },
});


/*
 * =========================================================
 * SIGN UP
 * =========================================================
 */
router.post(
    "/signup",
    signupLimiter,
    signup
);


/*
 * =========================================================
 * SIGN IN
 * =========================================================
 */
router.post(
    "/signin",
    signin
);


/*
 * =========================================================
 * VERIFY EMAIL
 * =========================================================
 *
 * The client cannot set verified=true.
 *
 * A user is verified ONLY if a valid verification token
 * exists in the database.
 */
router.get(
    "/verify-email/:token",
    verificationLimiter,
    async (req, res) => {
        const { token } = req.params;

        try {
            /*
             * Basic token sanity check.
             *
             * Don't even query PostgreSQL if someone sends
             * an obviously bogus token.
             */
            if (
                !token ||
                typeof token !== "string" ||
                token.length < 20 ||
                token.length > 500
            ) {
                return res.status(400).json({
                    error: "Invalid verification token",
                });
            }


            /*
             * Verify the account in ONE database operation.
             *
             * This is safer than:
             *
             * SELECT user
             * UPDATE user
             *
             * because two simultaneous requests cannot both
             * successfully verify the same token.
             *
             * Once used, verification_token becomes NULL.
             */
            const userResult = await db.query(
                `
                UPDATE users
                SET
                    verified = TRUE,
                    verification_token = NULL
                WHERE verification_token = $1
                  AND verified = FALSE
                RETURNING id
                `,
                [token]
            );


            /*
             * No matching unused verification token.
             */
            if (userResult.rows.length === 0) {
                return res.status(400).json({
                    error:
                        "Invalid, expired, or already-used verification token",
                });
            }


            const userId = userResult.rows[0].id;


            /*
             * Only now that verification succeeded do we
             * create the user's default CRM lists.
             */
            await createListsForNewUser(userId);


            /*
             * Verification succeeded.
             */
            return res.redirect(
                "https://www.clubhouselinks.com/verify-email-success"
            );

        } catch (error) {
            console.error("Error verifying email:", error);

            return res.status(500).json({
                error: "Server error",
            });
        }
    }
);


module.exports = router;