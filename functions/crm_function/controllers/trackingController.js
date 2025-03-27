// /controllers/trackingController.js
const pool = require('../db/db');

// Track pixel opens (views)
exports.trackOpenCampaign = async (req, res) => {
    const { campaignId, subscriberId } = req.params;

    try {
        // Log the open event in the database
        await pool.query(
            'INSERT INTO email_open_events (campaign_id, subscriber_id, opened_at) VALUES ($1, $2, NOW())',
            [campaignId, subscriberId]
        );

        // Return a 1x1 transparent pixel image
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length,
        });
        res.end(pixel);
    } catch (error) {
        console.error('Error logging email open event:', error);
        res.status(500).json({ error: 'Failed to log email open event' });
    }
};

// Track link clicks
exports.trackClickCampaign = async (req, res) => {
    const { campaignId, subscriberId } = req.params;
    const { redirect } = req.query;

    console.log('Received redirect URL:', redirect);

    if (!redirect) {
        return res.status(400).json({ error: 'Missing redirect URL' });
    }

    try {
        await pool.query(
            'INSERT INTO email_click_events (campaign_id, subscriber_id, clicked_at) VALUES ($1, $2, NOW())',
            [campaignId, subscriberId]
        );

        res.redirect(decodeURIComponent(redirect));
    } catch (error) {
        console.error('Error logging email click event:', error);
        res.status(500).json({ error: 'Failed to log email click event' });
    }
};


//trying to add this one
exports.trackOpenTemplate = async (req, res) => {
    const { templateId, subscriberId } = req.params;

    try {
        const query = `
            INSERT INTO email_open_events (template_id, subscriber_id, opened_at) 
            VALUES ($1, $2, NOW())
        `;
        const values = [templateId, subscriberId];

        // Log the values being inserted
        console.log('Executing query:', query, [templateId, subscriberId]);

        // Execute the query
        await pool.query(query, values);

        // Return a 1x1 transparent pixel image
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length,
        });
        res.end(pixel);
    } catch (error) {
        console.error('Error logging email open event:', error);
        res.status(500).json({ error: 'Failed to log email open event' });
    }
};


exports.trackClickTemplate = async (req, res) => {
    const { templateId, subscriberId } = req.params;
    const { redirect } = req.query;

    if (!redirect) {
        return res.status(400).json({ error: 'Missing redirect URL' });
    }

    const decodedRedirect = decodeURIComponent(redirect);

    try {
        // Fire-and-forget DB logging
        pool.query(
            'INSERT INTO email_click_events (template_id, subscriber_id, clicked_at) VALUES ($1, $2, NOW())',
            [templateId, subscriberId]
        ).catch((err) => {
            console.error('DB insert failed:', err);
        });

      return res.redirect(decodedRedirect);
    } catch (error) {
        console.error('Unexpected error in click tracking:', error);
        return res.redirect(decodedRedirect); // Fail-safe: still redirect
    }
};







