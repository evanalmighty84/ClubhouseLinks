const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/db');  // Assuming this file contains your PostgreSQL db connection
const crypto = require('crypto'); // For generating random tokens
const sendEmail = require('../utils/sendEmail'); // Utility to send emails
const { decryptPassword } = require('../utils/authEncryption');
const { createListsForNewUser } = require('../utils/createAutoLists');
const { encryptPassword } = require('../utils/authEncryption');



exports.signup = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if the user already exists
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Encrypt the password using AES
        const encryptedPassword = encryptPassword(password);

        // Generate a verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Insert the user into the database with verification token and encrypted password
        const newUser = await db.query(
            'INSERT INTO users (name, email, password_hash, verification_token) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, email, encryptedPassword, verificationToken]
        );

        const user = newUser.rows[0];

        // Send verification email with inline styling and video
        const verificationLink = `https://homepage-809404625.development.catalystserverless.com/server/crm_function/api/auth/verify-email/${verificationToken}`;
        const emailContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="background-color: steelblue; padding: 20px; text-align: center; color: white;">
                    <h1 style="margin: 0;">Click below to verify your account</h1>
                </div>
                <div style="padding: 20px;">
                    <p style="font-size: 16px;">Hello ${name},</p>
                    <p style="font-size: 16px;">Thank you for signing up for Clubhouse Links! Please verify your email by clicking the button below:</p>
                    <p style="text-align: center;">
                        <a href="${verificationLink}" 
                           style="display: inline-block; padding: 10px 20px; background-color: steelblue; color: white; text-decoration: none; border-radius: 5px;">
                            Verify My Email
                        </a>
                    </p>
          
                    <p style="font-size: 16px; text-align: center;">Clubhouse Links CRM: The best way to make convert customers into Sales using A.I.</p>
                    <div style="text-align: center;">
                        <a href="hhttps://res.cloudinary.com/duz4vhtcn/video/upload/f_auto:video,q_auto/v1735451516/invideo-ai-1080_Boost_Your_Email_Campaigns_with_A.I._Mag_2024-12-29_1_online-video-cutter.com_1_xmw3lb.mp4
">
                <img src="https://res.cloudinary.com/duz4vhtcn/video/upload/f_auto,q_auto/v1735514979/ezgif.com-video-to-gif-converter_xlykvc.gif
" 
                     alt="Watch Video" 
                     style="width: 100%; max-width: 600px; border: none; cursor: pointer;">
            </a>
                    </div>
                </div>
                <div style="background-color: #f9f9f9; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                    <p>If you did not sign up for this account, please ignore this email.</p>
                </div>
            </div>
        `;

        await sendEmail(
            user.email,
            'Email Verification from Clubhouse Links',
            emailContent
        );

        res.status(201).json({ message: 'Sign-up successful! Please check your email to verify your account.' });
    } catch (error) {
        console.error('Error signing up:', error);
        res.status(500).json({ error: 'Server error' });
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





