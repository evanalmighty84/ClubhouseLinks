const pool = require("../db/db");

exports.getEmailQueued = async (req, res) => {
    const { userId, status = 'all', page = 1, limit = 10 } = req.body;

    try {
        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Build query conditionally based on status
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

        if (status !== 'all') {
            query += ` AND eq.status = $2`;
            queryParams.push(status);
        }

        // Order by most recent send_time descending
        query += ` ORDER BY eq.send_time DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        // Execute query
        const result = await pool.query(query, queryParams);

        // Count total emails for pagination
        const countQuery = `
            SELECT COUNT(*) 
            FROM EmailQueue 
            WHERE user_id = $1 ${status !== 'all' ? 'AND status = $2' : ''}
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
