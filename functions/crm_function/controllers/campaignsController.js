const pool = require('../db/db');
const { sendCampaignEmail } = require('../utils/sendCampaignEmail');

// Create a new campaign
const incrementSendCount = async (campaignId, incrementBy = 1) => {
    try {
        await pool.query(
            'UPDATE campaigns SET send_count = send_count + $1 WHERE id = $2',
            [incrementBy, campaignId]
        );
    } catch (error) {
        console.error(`Error incrementing send_count for campaign ${campaignId}:`, error);
    }
};

// /controllers/campaignsController.js


// Get a specific campaign by ID
exports.getCampaignById = async (req, res) => {
    const { campaignId } = req.params;

    try {
        const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching campaign by ID:', error);
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
};

// Create a new campaign with static values for testing
exports.createCampaign = async (req, res) => {
    const {
        name,
        subject,
        fromAddress = 'noreply@user@yoursite.com',  // Default email if none provided
        listIds,
        content,
        userId // No fallback to a static value like '8'
    } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        console.log('Received campaign payload:', req.body);

        const formattedListIds = Array.isArray(listIds) ? listIds.map(id => parseInt(id, 10)) : [];

        const result = await pool.query(
            `INSERT INTO campaigns 
            (name, subject, from_address, list_ids, template, messenger, tags, content, url_slug, metadata, send_later, scheduled_date, publish_to_archive, user_id, status, send_count, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'default', 'email', '', $5, '', '{}', false, null, false, $6, 'sent', 0, NOW(), NOW())
            RETURNING *`,
            [
                name,
                subject,
                fromAddress,
                formattedListIds,
                content,
                userId  // Pass userId dynamically from the request
            ]
        );

        const newCampaign = result.rows[0];

        if (newCampaign.status === 'sent') {
            const subscribersResult = await pool.query(
                `SELECT s.email, s.id AS subscriber_id 
                 FROM subscribers s
                 JOIN list_subscribers ls ON s.id = ls.subscriber_id
                 WHERE ls.list_id = ANY($1::int[])`,
                [formattedListIds]
            );

            const subscribers = subscribersResult.rows;

            for (const subscriber of subscribers) {
                await sendCampaignEmail(
                    subscriber.email,
                    subject,
                    content,
                    newCampaign.id,
                    subscriber.subscriber_id,
                    userId  // Ensure you pass the userId here as well
                );
            }

            await incrementSendCount(newCampaign.id, subscribers.length);
        }

        res.status(201).json({ message: 'Campaign created successfully', campaign: newCampaign });
    } catch (error) {
        console.error('Error creating campaign:', error.message);
        res.status(500).json({ error: 'Failed to create campaign', details: error.message });
    }
};




exports.resendCampaign = async (req, res) => {
    const { id } = req.params;  // Campaign ID
    const { userId } = req.body;  // Make sure to pass userId in the request body or token

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const campaignResult = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
        const campaignData = campaignResult.rows[0];

        if (!campaignData) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const { list_ids } = campaignData;

        if (!list_ids || list_ids.length === 0) {
            return res.status(400).json({ error: 'No lists associated with this campaign' });
        }

        const subscribersResult = await pool.query(
            `SELECT s.email, s.id AS subscriber_id 
             FROM subscribers s
             JOIN list_subscribers ls ON s.id = ls.subscriber_id
             WHERE ls.list_id = ANY($1::int[])`,
            [list_ids]
        );

        const subscribers = subscribersResult.rows;

        for (const subscriber of subscribers) {
            await sendCampaignEmail(
                subscriber.email,
                campaignData.subject,
                campaignData.content,
                campaignData.id,
                subscriber.subscriber_id,
                userId  // Pass userId here as well
            );
        }

        res.json({ message: 'Campaign sent successfully!' });
    } catch (error) {
        console.error('Error resending campaign:', error);
        res.status(500).json({ error: 'Failed to resend the campaign' });
    }
};





// Update a specific campaign by ID
// Update a specific campaign by ID (only lists)
exports.updateCampaignById = async (req, res) => {
    const { campaignId } = req.params;
    const { list_ids } = req.body;  // Only expect list_ids in the payload

    try {
        // Check if the campaign exists
        const campaignResult = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
        if (campaignResult.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Update only the list_ids field in the database
        const result = await pool.query(
            `UPDATE campaigns 
             SET list_ids = $1, updated_at = NOW()
             WHERE id = $2 RETURNING *`,
            [list_ids, campaignId]
        );

        res.status(200).json({ message: 'Campaign lists updated successfully', campaign: result.rows[0] });
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ error: 'Failed to update campaign' });
    }
};




// Update campaign status



exports.updateCampaignStatus = async (req, res) => {
    const { campaignId } = req.params;
    const { status } = req.body;

    try {
        // Update campaign status
        const result = await pool.query(
            'UPDATE campaigns SET status = $1 WHERE id = $2 RETURNING *',
            [status, campaignId]
        );

        if (status === 'sent') {
            // Fetch the subscribers for the campaign
            const subscribersResult = await pool.query(
                `SELECT s.email, s.id AS subscriber_id 
                 FROM subscribers s
                 JOIN list_subscribers ls ON s.id = ls.subscriber_id
                 WHERE ls.list_id = ANY(
                    SELECT unnest(list_ids) FROM campaigns WHERE id = $1
                 )`, [campaignId]
            );

            const campaign = result.rows[0];
            const subscribers = subscribersResult.rows;
            const subject = campaign.subject;
            const html = campaign.content;

            // Send emails to all subscribers
            for (const subscriber of subscribers) {
                await sendCampaignEmail(
                    subscriber.email,
                    subject,
                    html,
                    campaignId,
                    subscriber.subscriber_id
                );
            }

            // Increment send_count for the campaign
            await incrementSendCount(campaignId);
        }

        res.status(200).json({ message: 'Campaign updated and emails sent if applicable' });
    } catch (error) {
        console.error('Error updating campaign status:', error);
        res.status(500).json({ error: 'Failed to update campaign status' });
    }
};



// Example of campaign stats endpoint


exports.getCampaignStatsByCampaign = async (req, res) => {
    const { campaignId } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
                send_count, 
                CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END AS scheduled_count,
                CASE WHEN status = 'draft' THEN 1 ELSE 0 END AS draft_count
             FROM campaigns 
             WHERE id = $1`,
            [campaignId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No stats found for this campaign' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching campaign stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch campaign stats', details: error.message });
    }
};


// Get campaign stats by user
exports.getCampaignStatsByUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
                SUM(send_count) AS sent_count,  -- Sum the send_count for sent campaigns
                COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled_count,
                COUNT(*) FILTER (WHERE status = 'draft') AS draft_count
             FROM campaigns 
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No campaigns found for this user' });
        }

        // Return the statistics for campaigns
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching campaign stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch campaign stats', details: error.message });
    }
};





// Get campaigns by userId with status filtering
exports.getCampaignsByUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query('SELECT * FROM campaigns WHERE user_id = $1', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No campaigns found for this user' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching campaigns:', error.message);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
};


// Sample query to test database connection
exports.testDatabaseConnection = async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');  // Test query to get the current timestamp from the database
        res.status(200).json({ message: 'Database connection successful', timestamp: result.rows[0] });
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
};
