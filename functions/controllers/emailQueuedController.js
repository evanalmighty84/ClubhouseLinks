const pool = require("../db/db");


// the first one is really getting the recent opened events
exports.getEmailQueued = async (req, res) => {
    const { userId, status = 'all', page = 1, limit = 10 } = req.body;

    try {
        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Build query conditionally based on status
// Set up base query and params
        let query = `
            SELECT
                eq.id, eq.user_id, eq.subscriber_id, eq.template_id, eq.send_time, eq.status, eq.created_at, eq.updated_at,
                t.content AS template_preview,
                s.email AS subscriber_email, s.name AS subscriber_name
            FROM EmailQueue eq
                     INNER JOIN templates t ON eq.template_id = t.id
                     INNER JOIN subscribers s ON eq.subscriber_id = s.id
            WHERE eq.user_id = $1
        `;
        const queryParams = [userId];

// Apply optional status filter
        if (status !== 'all') {
            queryParams.push(status);
            query += ` AND eq.status = $${queryParams.length}`;
        }

// Add ordering + pagination with correct placeholders
        queryParams.push(limit, offset);
        query += ` ORDER BY eq.send_time DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

        // Execute query
        const result = await pool.query(query, queryParams);

        // Count total emails for pagination
        const countQuery = `
            SELECT COUNT(*)
            FROM EmailQueue
            WHERE user_id = $1 ${status !== 'all' ? `AND status = $2` : ''}
        `;
        const countParams = status !== 'all' ? [userId, status] : [userId];

        const countResult = await pool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count, 10);

        // Fetch recent events from email_opened table
        const recentEventsResult = await pool.query(`
            SELECT 
                eo.subscriber_id, 
                eo.opened_at AS opened_at, 
                s.name, 
                s.email,
                CASE 
                    WHEN eo.opened_at >= NOW() - INTERVAL '1 week' THEN 'Last Week'
                    WHEN eo.opened_at >= NOW() - INTERVAL '2 weeks' THEN 'Last 2 Weeks'
                    WHEN eo.opened_at >= NOW() - INTERVAL '3 weeks' THEN 'Last 3 Weeks'
                    WHEN eo.opened_at >= NOW() - INTERVAL '4 weeks' THEN 'Last 4 Weeks'
                    ELSE 'Older'
                END AS time_period
            FROM email_open_events eo
            JOIN subscribers s 
                ON eo.subscriber_id = s.id AND s.user_id = $1
            ORDER BY eo.opened_at DESC;
        `, [userId]);

        res.status(200).json({
            emails: result.rows,
            recentEvents: recentEventsResult.rows,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
        });
    } catch (error) {
        console.error("Error fetching email queue:", error);
        res.status(500).json({ error: "Failed to fetch email queue." });
    }
};
exports.getPendingEmailQueued = async (req, res) => {
    const { userId } = req.body;

    try {
        const result = await pool.query(`
            SELECT 
                eq.id, eq.user_id, eq.subscriber_id, eq.template_id, eq.send_time, eq.status, eq.created_at, eq.updated_at,
                t.content AS template_preview,
                s.email AS subscriber_email, s.name AS subscriber_name
            FROM EmailQueue eq
            INNER JOIN templates t ON eq.template_id = t.id
            INNER JOIN subscribers s ON eq.subscriber_id = s.id
            WHERE eq.user_id = $1 AND eq.status = 'pending'
            ORDER BY eq.send_time DESC;
        `, [userId]);

        res.status(200).json({ emails: result.rows });
    } catch (error) {
        console.error("Error fetching pending emails:", error);
        res.status(500).json({ error: "Failed to fetch pending emails." });
    }
};
exports.getAllEmails = async (req, res) => {
    const { userId, page = 1, limit = 10 } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const offset = (page - 1) * limit;

        // Query queued emails
        const queuedEmailsQuery = `
            SELECT 
                eq.id,
                eq.user_id,
                eq.subscriber_id,
                eq.send_time,
                eq.status,
                t.content AS template_preview,
                s.email AS subscriber_email,
                s.name AS subscriber_name
            FROM EmailQueue eq
            INNER JOIN templates t ON eq.template_id = t.id
            INNER JOIN subscribers s ON eq.subscriber_id = s.id
            WHERE eq.user_id = $1
        `;

        const queuedEmailsResult = await pool.query(queuedEmailsQuery, [userId]);

        // Query sent campaign emails
        const sentEmailsQuery = `
            SELECT 
                ces.id,
                ces.user_id,
                ces.subscriber_id,
                ces.sent_at,
                'sent' AS status,
                ces.html_preview AS template_preview,
                s.email AS subscriber_email,
                s.name AS subscriber_name
            FROM campaign_emails_sent ces
            INNER JOIN subscribers s ON ces.subscriber_id = s.id
            WHERE ces.user_id = $1
        `;

        const sentEmailsResult = await pool.query(sentEmailsQuery, [userId]);

        // Merge and sort all emails
        const combined = [...queuedEmailsResult.rows, ...sentEmailsResult.rows];
        combined.sort((a, b) => new Date(b.send_time || b.sent_at) - new Date(a.send_time || a.sent_at));

        const paginated = combined.slice(offset, offset + limit);

        res.status(200).json({
            emails: paginated,
            totalCount: combined.length,
            totalPages: Math.ceil(combined.length / limit),
            currentPage: page,
        });
    } catch (error) {
        console.error('Error fetching all emails:', error);
        res.status(500).json({ error: 'Failed to fetch combined emails.' });
    }
};
exports.deleteEmailById = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'Email queue ID is required' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM emailqueue WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Email not found' });
        }

        return res.status(200).json({ message: 'Email deleted successfully', deleted: result.rows[0] });
    } catch (error) {
        console.error('Error deleting email queue item:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};





