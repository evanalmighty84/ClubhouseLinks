const pool = require('../db/db');
const { getUserSMTPSettings } = require('./../utils/smtp');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { decryptPassword } = require('../utils/encryption');

dotenv.config(); // Load environment variables from .env

exports.sendThankYouTemplate = async (req, res) => {
    const { name, userId, subscriberId } = req.body;

    try {
        console.log('Preparing to send Thank You email...');

        // Step 1: Fetch the template content and template ID
        const templateResult = await pool.query(
            `SELECT id AS template_id, content 
             FROM templates 
             WHERE user_id = $1 AND workflow = $2`,
            [parseInt(userId, 10), 6] // Workflow 6 for thank-you emails
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ error: 'No thank-you template found for this user' });
        }

        const { template_id: templateId, content: templateContent } = templateResult.rows[0];

        // Step 2: Fetch subscriber details
        const subscriberResult = await pool.query(
            `SELECT email 
             FROM subscribers 
             WHERE id = $1 AND user_id = $2`,
            [parseInt(subscriberId, 10), parseInt(userId, 10)]
        );

        if (subscriberResult.rows.length === 0) {
            return res.status(404).json({ error: 'Subscriber not found' });
        }

        const subscriberEmail = subscriberResult.rows[0].email;

        // Step 3: Configure SMTP settings
        let transporter;
        const smtpSettings = await getUserSMTPSettings(userId);

        if (smtpSettings) {
            console.log('Using user-specific SMTP settings...');
            const decryptedPassword = decryptPassword(smtpSettings.smtp_password);

            if (!decryptedPassword) {
                throw new Error('Decrypted SMTP password is invalid');
            }

            transporter = nodemailer.createTransport({
                host: smtpSettings.smtp_host,
                port: smtpSettings.smtp_port,
                secure: false, // Use TLS
                auth: {
                    user: smtpSettings.smtp_username,
                    pass: decryptedPassword,
                },
                tls: { rejectUnauthorized: false },
            });
        } else {
            console.log('Fallback: Using default Zoho SMTP settings...');
            transporter = nodemailer.createTransport({
                host: 'smtp.zoho.com',
                port: 587,
                secure: false, // Use STARTTLS
                auth: {
                    user: process.env.EMAIL_USER, // Zoho email
                    pass: process.env.EMAIL_PASS, // Zoho app-specific password
                },
            });
        }

        // Step 4: Generate tracking links
         const appUrl = 'https://homepage-809404625.catalystserverless.com/server/crm_function'

        const trackingPixelUrl = `<img src="${appUrl}/api/track/template/open/${templateId}/${subscriberId}?rand=${Math.random()}" width="1" height="1" style="display:none;" alt=""/>`;
        const unsubscribeLink = `<p style="text-align: center; font-size: small"> <a style="color: red" href="${appUrl}/api/unsubscribe/${subscriberId}">Unsubscribe</a></p>`;

        // Combine the template content with tracking pixel and unsubscribe link
        const htmlWithTracking = `${templateContent} ${trackingPixelUrl} ${unsubscribeLink}`;

        // Wrap all links for click tracking
        const htmlWithLinkTracking = htmlWithTracking.replace(
            /<a href="(.*?)"/g,
            (match, p1) =>
                `<a href="${appUrl}/api/track/template/click/${templateId}/${subscriberId}?redirect=${encodeURIComponent(p1)}"`
        );

        // Step 5: Send the email
        const mailOptions = {
            from: smtpSettings ? smtpSettings.smtp_username : process.env.EMAIL_USER,
            to: subscriberEmail,
            subject: `Thank you, ${name}!`,
            html: htmlWithLinkTracking,
        };

        await transporter.sendMail(mailOptions);

        console.log(`Thank-you email sent successfully to ${subscriberEmail}`);
        res.status(200).json({ message: 'Thank-you email sent successfully' });
    } catch (error) {
        console.error('Error sending thank-you email:', error);
        res.status(500).json({ error: 'Failed to send thank-you email' });
    }
};

exports.sendHardcodedFormThankYou = async (req, res) => {
    const { name, email } = req.body;
    const userId = 440; // Hardcoded for this flow

    try {
        console.log('Sending hardcoded thank-you email...');

        // Step 1: Get thank-you template
        const templateResult = await pool.query(
            `SELECT id AS template_id, content 
             FROM templates 
             WHERE user_id = $1 AND workflow = $2`,
            [userId, 6]
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Thank-you template not found' });
        }

        const { template_id: templateId, content: templateContent } = templateResult.rows[0];

        // Step 2: Check or create subscriber
        let subscriberResult = await pool.query(
            `SELECT id FROM subscribers WHERE email = $1 AND user_id = $2`,
            [email, userId]
        );

        let subscriberId;
        if (subscriberResult.rows.length === 0) {
            const insertResult = await pool.query(
                `INSERT INTO subscribers (name, email, user_id) VALUES ($1, $2, $3) RETURNING id`,
                [name, email, userId]
            );
            subscriberId = insertResult.rows[0].id;
        } else {
            subscriberId = subscriberResult.rows[0].id;
        }

        // Step 3: Setup SMTP
        let transporter;
        const smtpSettings = await getUserSMTPSettings(userId);

        if (smtpSettings) {
            const decryptedPassword = decryptPassword(smtpSettings.smtp_password);
            if (!decryptedPassword) throw new Error('SMTP password invalid');
            transporter = nodemailer.createTransport({
                host: smtpSettings.smtp_host,
                port: smtpSettings.smtp_port,
                secure: false,
                auth: {
                    user: smtpSettings.smtp_username,
                    pass: decryptedPassword,
                },
                tls: { rejectUnauthorized: false },
            });
        } else {
            transporter = nodemailer.createTransport({
                host: 'smtp.zoho.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        }

        // Step 4: Inject tracking
        const appUrl = 'https://homepage-809404625.catalystserverless.com/server/crm_function';

        const trackingPixel = `<img src="${appUrl}/api/track/template/open/${templateId}/${subscriberId}?rand=${Math.random()}" width="1" height="1" style="display:none;" alt=""/>`;
        const unsubscribeLink = `<p style="text-align: center; font-size: small"> <a style="color: red" href="${appUrl}/api/unsubscribe/${subscriberId}">Unsubscribe</a></p>`;

        let htmlWithTracking = `${templateContent} ${trackingPixel} ${unsubscribeLink}`;

        htmlWithTracking = htmlWithTracking.replace(
            /<a href="(.*?)"/g,
            (_, link) => `<a href="${appUrl}/api/track/template/click/${templateId}/${subscriberId}?redirect=${encodeURIComponent(link)}"`
        );

        // Step 5: Send the email
        await transporter.sendMail({
            from: smtpSettings ? smtpSettings.smtp_username : process.env.EMAIL_USER,
            to: email,
            subject: `Thank you, ${name}!`,
            html: htmlWithTracking,
        });

        console.log(`Email sent to ${email}`);
        return res.status(200).json({ message: 'Thank-you email sent successfully' });

    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Internal error while sending email' });
    }
};
exports.sendGoogleFormTerri = async (req, res) => {
    const { name, email } = req.body;
    const userId = 440; // Hardcoded for this flow

    try {
        console.log('Sending hardcoded thank-you email...');

        // Step 1: Get thank-you template
        const templateResult = await pool.query(
            `SELECT id AS template_id, content 
             FROM templates 
             WHERE user_id = $1 AND workflow = $2`,
            [userId, 6]
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Thank-you template not found' });
        }

        const { template_id: templateId, content: templateContent } = templateResult.rows[0];

        // Step 2: Check or create subscriber
        let subscriberResult = await pool.query(
            `SELECT id FROM subscribers WHERE email = $1 AND user_id = $2`,
            [email, userId]
        );

        let subscriberId;
        if (subscriberResult.rows.length === 0) {
            const insertResult = await pool.query(
                `INSERT INTO subscribers (name, email, user_id) VALUES ($1, $2, $3) RETURNING id`,
                [name, email, userId]
            );
            subscriberId = insertResult.rows[0].id;
        } else {
            subscriberId = subscriberResult.rows[0].id;
        }

        // Step 3: Setup SMTP
        let transporter;
        const smtpSettings = await getUserSMTPSettings(userId);

        if (smtpSettings) {
            const decryptedPassword = decryptPassword(smtpSettings.smtp_password);
            if (!decryptedPassword) throw new Error('SMTP password invalid');
            transporter = nodemailer.createTransport({
                host: smtpSettings.smtp_host,
                port: smtpSettings.smtp_port,
                secure: false,
                auth: {
                    user: smtpSettings.smtp_username,
                    pass: decryptedPassword,
                },
                tls: { rejectUnauthorized: false },
            });
        } else {
            transporter = nodemailer.createTransport({
                host: 'smtp.zoho.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        }

        // Step 4: Inject tracking
        const appUrl = 'https://homepage-809404625.catalystserverless.com/server/crm_function';

        const trackingPixel = `<img src="${appUrl}/api/track/template/open/${templateId}/${subscriberId}?rand=${Math.random()}" width="1" height="1" style="display:none;" alt=""/>`;
        const unsubscribeLink = `<p style="text-align: center; font-size: small"> <a style="color: red" href="${appUrl}/api/unsubscribe/${subscriberId}">Unsubscribe</a></p>`;

        let htmlWithTracking = `${templateContent} ${trackingPixel} ${unsubscribeLink}`;

        htmlWithTracking = htmlWithTracking.replace(
            /<a href="(.*?)"/g,
            (_, link) => `<a href="${appUrl}/api/track/template/click/${templateId}/${subscriberId}?redirect=${encodeURIComponent(link)}"`
        );

        // Step 5: Send the email
        await transporter.sendMail({
            from: smtpSettings ? smtpSettings.smtp_username : process.env.EMAIL_USER,
            to: email,
            subject: `Thank you, ${name}!`,
            html: htmlWithTracking,
        });

        console.log(`Email sent to ${email}`);
        return res.status(200).json({ message: 'Thank-you email sent successfully' });

    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Internal error while sending email' });
    }
};
exports.sendGoogleFormJohn = async (req, res) => {
    const { name, email } = req.body;
    const userId = 307; // Hardcoded for this flow

    try {
        console.log('Sending Google Review Form...');

        // Step 1: Get thank-you template
        const templateResult = await pool.query(
            `SELECT id AS template_id, content 
             FROM templates 
             WHERE user_id = $1 AND workflow = $2`,
            [userId, 6]
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Thank-you template not found' });
        }

        const { template_id: templateId, content: templateContent } = templateResult.rows[0];

        // Step 2: Check or create subscriber
        let subscriberResult = await pool.query(
            `SELECT id FROM subscribers WHERE email = $1 AND user_id = $2`,
            [email, userId]
        );

        let subscriberId;
        if (subscriberResult.rows.length === 0) {
            const insertResult = await pool.query(
                `INSERT INTO subscribers (name, email, user_id) VALUES ($1, $2, $3) RETURNING id`,
                [name, email, userId]
            );
            subscriberId = insertResult.rows[0].id;
        } else {
            subscriberId = subscriberResult.rows[0].id;
        }

        // Step 3: Setup SMTP
        let transporter;
        const smtpSettings = await getUserSMTPSettings(userId);

        if (smtpSettings) {
            const decryptedPassword = decryptPassword(smtpSettings.smtp_password);
            if (!decryptedPassword) throw new Error('SMTP password invalid');
            transporter = nodemailer.createTransport({
                host: smtpSettings.smtp_host,
                port: smtpSettings.smtp_port,
                secure: false,
                auth: {
                    user: smtpSettings.smtp_username,
                    pass: decryptedPassword,
                },
                tls: { rejectUnauthorized: false },
            });
        } else {
            transporter = nodemailer.createTransport({
                host: 'smtp.zoho.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        }

        // Step 4: Inject tracking
        const appUrl = 'https://homepage-809404625.catalystserverless.com/server/crm_function';

        const trackingPixel = `<img src="${appUrl}/api/track/template/open/${templateId}/${subscriberId}?rand=${Math.random()}" width="1" height="1" style="display:none;" alt=""/>`;
        const unsubscribeLink = `<p style="text-align: center; font-size: small"> <a style="color: red" href="${appUrl}/api/unsubscribe/${subscriberId}">Unsubscribe</a></p>`;

        let htmlWithTracking = `${templateContent} ${trackingPixel} ${unsubscribeLink}`;

        htmlWithTracking = htmlWithTracking.replace(
            /<a href="(.*?)"/g,
            (_, link) => `<a href="${appUrl}/api/track/template/click/${templateId}/${subscriberId}?redirect=${encodeURIComponent(link)}"`
        );

        // Step 5: Send the email
        await transporter.sendMail({
            from: smtpSettings ? smtpSettings.smtp_username : process.env.EMAIL_USER,
            to: email,
            subject: `Thank you, ${name}!`,
            html: htmlWithTracking,
        });

        console.log(`Email sent to ${email}`);
        return res.status(200).json({ message: 'Thank-you email sent successfully' });

    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Internal error while sending email' });
    }
};


exports.getUserTemplates = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
    }

    try {
        const result = await pool.query(
            `SELECT id, category, content FROM templates WHERE user_id = $1`,
            [parseInt(userId, 10)]
        );
        console.log('getting user templates');
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching templates:', error);
        return res.status(500).json({ error: 'Failed to fetch templates' });
    }
};




// Controller function to update a specific template by ID




// Create a new template or update an existing one based on category and user_id


exports.createOrUpdateTemplate = async (req, res) => {
    const { category, content, user_id, interval } = req.body; // Added 'interval'

    // Ensure interval is a number or default to 7
    const parsedInterval = interval !== undefined ? Number(interval) : 7;

    try {
        // Step 1: Check if a template with the same category and user_id exists
        const existingTemplateQuery = `
            SELECT id 
            FROM templates 
            WHERE category = $1 AND user_id = $2
        `;
        const existingTemplateResult = await pool.query(existingTemplateQuery, [category, user_id]);

        if (existingTemplateResult.rows.length > 0) {
            // Step 2: If the template exists, update it
            const templateId = existingTemplateResult.rows[0].id;

            const updateTemplateQuery = `
                UPDATE templates
                SET content = $1, interval = $2, updated_at = NOW()
                WHERE id = $3 AND user_id = $4
                RETURNING *
            `;
            const updateResult = await pool.query(updateTemplateQuery, [
                content,
                parsedInterval,
                templateId,
                user_id,
            ]);

            // Respond with the updated template
            return res.status(200).json({
                message: 'Template updated successfully',
                template: updateResult.rows[0],
            });
        } else {
            // Step 3: If no template exists, create a new one
            const createTemplateQuery = `
                INSERT INTO templates (user_id, category, content, interval, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
                RETURNING *
            `;
            const createResult = await pool.query(createTemplateQuery, [
                user_id,
                category,
                content,
                parsedInterval,
            ]);

            // Respond with the newly created template
            return res.status(201).json({
                message: 'Template created successfully',
                template: createResult.rows[0],
            });
        }
    } catch (error) {
        // Handle errors gracefully
        console.error('Error creating/updating template:', error);
        res.status(500).json({ error: 'Failed to create or update template' });
    }
};




// Get a template by category and user_id
// Import your database pool and other necessary dependencies


// Fetch template by category and user_id, or create a new one if none is found
exports.getCategoryTemplate = async (req, res) => {
    const { category, user_id } = req.query; // Read category and user_id from query parameters

    try {
        // Query the database for the template with the given category and user_id
        const result = await pool.query(
            `SELECT * FROM templates WHERE category = $1 AND user_id = $2`,
            [category, user_id]
        );

        if (result.rows.length > 0) {
            return res.status(200).json({ template: result.rows[0] }); // Return the template
        } else {
            return res.status(404).json({ message: 'No template found for this category and user.' });
        }
    } catch (error) {
        console.error('Error retrieving template:', error);
        res.status(500).json({ error: 'Failed to retrieve template.' });
    }
};





// Get all templates
exports.getAllTemplates = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM templates ORDER BY created_at DESC`);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
};

// Get a single template by ID
exports.getTemplateById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`SELECT * FROM templates WHERE id = $1`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching template by ID:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
};

// Delete a template by ID
exports.deleteTemplate = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`DELETE FROM templates WHERE id = $1 RETURNING *`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.status(200).json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
};
