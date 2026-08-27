const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/db');  // Assuming this file contains your PostgreSQL db connection
const crypto = require('crypto'); // For generating random tokens
const sendEmail = require('../utils/sendEmail'); // Utility to send emails
const { decryptPassword } = require('../utils/authEncryption');
const { createListsForNewUser } = require('../utils/createAutoLists');
const { encryptPassword } = require('../utils/authEncryption');

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

async function verifyTurnstile(token, ip) {
    if (!TURNSTILE_SECRET_KEY) {
        console.error("TURNSTILE_SECRET_KEY is not configured");
        return false;
    }

    if (!token) {
        return false;
    }

    try {
        const body = new URLSearchParams({
            secret: TURNSTILE_SECRET_KEY,
            response: token,
        });

        if (ip) {
            body.append("remoteip", ip);
        }

        const response = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                body,
            }
        );

        const result = await response.json();

        if (!result.success) {
            console.warn(
                "Turnstile verification failed:",
                result["error-codes"]
            );
        }

        return result.success === true;
    } catch (error) {
        console.error("Turnstile verification error:", error);
        return false;
    }
}

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

exports.signup = async (req, res) => {
    const {
        name,
        email,
        password,

        // Spam protection fields
        turnstileToken,
        companyWebsite,
    } = req.body;

    try {
        /*
         * =====================================================
         * 1. HONEYPOT
         * =====================================================
         *
         * Real users never see this field.
         * Bots frequently populate every input.
         *
         * Return a fake success so the bot does not learn
         * that it was detected.
         */
        if (companyWebsite) {
            console.warn(
                `[SIGNUP SPAM] Honeypot triggered from IP ${req.ip}`
            );

            return res.status(201).json({
                message:
                    "Sign-up successful! Please check your email to verify your account.",
            });
        }


        /*
         * =====================================================
         * 2. CLOUDFLARE TURNSTILE
         * =====================================================
         *
         * This happens BEFORE:
         *
         * - database lookup
         * - password encryption
         * - database INSERT
         * - verification email
         */
        const humanVerified = await verifyTurnstile(
            turnstileToken,
            req.ip
        );

        if (!humanVerified) {
            console.warn(
                `[SIGNUP SPAM] Turnstile failed from IP ${req.ip}`
            );

            return res.status(403).json({
                error:
                    "Human verification failed. Please try again.",
            });
        }


        /*
         * =====================================================
         * 3. BASIC INPUT VALIDATION
         * =====================================================
         */
        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Name, email, and password are required",
            });
        }


        const cleanName = String(name).trim();
        const cleanEmail = String(email)
            .trim()
            .toLowerCase();


        /*
         * Keep ridiculous bot payloads out.
         */
        if (
            cleanName.length < 2 ||
            cleanName.length > 100 ||
            cleanEmail.length > 254 ||
            String(password).length < 6 ||
            String(password).length > 200
        ) {
            return res.status(400).json({
                error: "Invalid signup information",
            });
        }


        /*
         * Basic email format validation.
         */
        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                error: "Invalid email address",
            });
        }


        /*
         * =====================================================
         * 4. CHECK IF USER ALREADY EXISTS
         * =====================================================
         */
        const userExists = await db.query(
            `
            SELECT id
            FROM users
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
            `,
            [cleanEmail]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({
                error: "User already exists",
            });
        }


        /*
         * =====================================================
         * 5. ENCRYPT PASSWORD
         * =====================================================
         *
         * Keeping your existing encryption system for now.
         */
        const encryptedPassword =
            encryptPassword(password);


        /*
         * =====================================================
         * 6. CREATE SINGLE-USE VERIFICATION TOKEN
         * =====================================================
         */
        const verificationToken =
            crypto.randomBytes(32).toString("hex");


        /*
         * =====================================================
         * 7. INSERT USER
         * =====================================================
         *
         * IMPORTANT:
         *
         * verified is explicitly FALSE.
         *
         * Nothing sent from React can control this value.
         */
        const newUser = await db.query(
            `
            INSERT INTO users (
                name,
                email,
                password_hash,
                verification_token,
                verified
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                FALSE
            )
            RETURNING
                id,
                name,
                email,
                verified
            `,
            [
                cleanName,
                cleanEmail,
                encryptedPassword,
                verificationToken,
            ]
        );


        const user = newUser.rows[0];


        /*
         * =====================================================
         * 8. VERIFICATION LINK
         * =====================================================
         */
        const verificationLink =
            `https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/auth/verify-email/${verificationToken}`;


        /*
         * Prevent user-controlled HTML inside the email.
         */
        const safeName = escapeHtml(cleanName);


        /*
         * =====================================================
         * 9. VERIFICATION EMAIL
         * =====================================================
         */
        const emailContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">

                <div style="
                    background-color: steelblue;
                    padding: 20px;
                    text-align: center;
                    color: white;
                ">
                    <h1 style="margin: 0;">
                        Click below to verify your account
                    </h1>
                </div>

                <div style="padding: 20px;">

                    <p style="font-size: 16px;">
                        Hello ${safeName},
                    </p>

                    <p style="font-size: 16px;">
                        Thank you for signing up for Clubhouse Links!
                        Please verify your email by clicking the button below:
                    </p>

                    <p style="text-align: center;">
                        <a
                            href="${verificationLink}"
                            style="
                                display: inline-block;
                                padding: 10px 20px;
                                background-color: steelblue;
                                color: white;
                                text-decoration: none;
                                border-radius: 5px;
                            "
                        >
                            Verify My Email
                        </a>
                    </p>

                    <p
                        style="
                            font-size: 16px;
                            text-align: center;
                        "
                    >
                        Clubhouse Links CRM:
                        The best way to convert customers into sales using A.I.
                    </p>

                    <div style="text-align: center;">
                        <a
                            href="https://res.cloudinary.com/duz4vhtcn/video/upload/f_auto:video,q_auto/v1735451516/invideo-ai-1080_Boost_Your_Email_Campaigns_with_A.I._Mag_2024-12-29_1_online-video-cutter.com_1_xmw3lb.mp4"
                        >
                            <img
                                src="https://res.cloudinary.com/duz4vhtcn/image/upload/f_auto,q_auto/v1735514979/ezgif.com-video-to-gif-converter_xlykvc.gif"
                                alt="Watch Video"
                                style="
                                    width: 100%;
                                    max-width: 600px;
                                    border: none;
                                    cursor: pointer;
                                "
                            >
                        </a>
                    </div>

                </div>

                <div style="
                    background-color: #f9f9f9;
                    padding: 10px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                ">
                    <p>
                        If you did not sign up for this account,
                        please ignore this email.
                    </p>
                </div>

            </div>
        `;


        await sendEmail(
            user.email,
            "Email Verification from Clubhouse Links",
            emailContent
        );


        /*
         * =====================================================
         * 10. SUCCESS
         * =====================================================
         */
        return res.status(201).json({
            message:
                "Sign-up successful! Please check your email to verify your account.",
        });

    } catch (error) {
        console.error("Error signing up:", error);

        return res.status(500).json({
            error: "Server error",
        });
    }
};


exports.signin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        if (!user.verified) {
            return res.status(403).json({ error: 'Please verify your email before signing in.' });
        }

        // Decrypt the AES-encrypted password stored in the database
        const decryptedPassword = decryptPassword(user.password_hash);

        // Compare the decrypted password with the provided password
        if (decryptedPassword !== password) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        // Generate a JWT token with a fallback for JWT_SECRET
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'default_secret_key',  // Fallback if JWT_SECRET is not set
            { expiresIn: '1h' }
        );

        // Respond with user data and token
        res.status(200).json({ user, token });
    } catch (error) {
        console.error('Error signing in:', error);
        res.status(500).json({ error: 'Server error' });
    }
};





