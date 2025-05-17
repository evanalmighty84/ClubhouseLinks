const pool = require('../db/db');
const { subDays, format } = require('date-fns');

exports.getDashboardStats = async (req, res) => {
    const { userId } = req.params;

    try {
        // Define the last 30 days time period
        const today = new Date();
        const startOfPeriod = subDays(today, 30);
        const formattedStart = format(startOfPeriod, 'yyyy-MM-dd');
        const formattedEnd = format(today, 'yyyy-MM-dd');

        // Fetch new subscribers in the last 30 days
        const newSubscribersResult = await pool.query(
            `SELECT id, name, email, created_at 
             FROM subscribers 
             WHERE created_at BETWEEN $1 AND $2 AND user_id = $3
             ORDER BY created_at DESC`,
            [formattedStart, formattedEnd, userId]
        );

        // Fetch new lists in the last 30 days
        const newListsResult = await pool.query(
            `SELECT id, name, created_at 
             FROM lists 
             WHERE created_at BETWEEN $1 AND $2 AND user_id = $3
             ORDER BY created_at DESC`,
            [formattedStart, formattedEnd, userId]
        );

        // Fetch new campaigns in the last 30 days
        const newCampaignsResult = await pool.query(
            `SELECT id, name, created_at 
             FROM campaigns 
             WHERE created_at BETWEEN $1 AND $2 AND user_id = $3
             ORDER BY created_at DESC`,
            [formattedStart, formattedEnd, userId]
        );

        // Fetch recent events (e.g., email opens) for the user
        const recentEventsResult = await pool.query(
            `
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
    `,
            [userId]
        );

        const recentEventsByPeriod = recentEventsResult.rows.reduce((acc, event) => {
            const { time_period } = event;

            if (!acc[time_period]) {
                acc[time_period] = [];
            }

            acc[time_period].push(event);
            return acc;
        }, {});

        // Fetch industry for the user
        const industryResult = await pool.query(
            `SELECT industry FROM users WHERE id = $1`,
            [userId]
        );
        const industry = industryResult.rows[0]?.industry || null;

        // Fetch total email opens for the user


        const totalOpensResult = await pool.query(
            `
    SELECT COUNT(*) AS total_opens
    FROM email_open_events e
    WHERE e.subscriber_id IN (
        SELECT s.id FROM subscribers s WHERE s.user_id = $1
    )
    `,
            [userId]
        );

        const totalOpens = parseInt(totalOpensResult.rows[0].total_opens, 10);
// Fetch text queue subscription status
        const textQueueResult = await pool.query(
            `SELECT text_queue_enabled FROM users WHERE id = $1`,
            [userId]
        );
        const textQueueEnabled = textQueueResult.rows[0]?.text_queue_enabled || false;



        // Fetch basic stats
        const result = await pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
                COUNT(*) FILTER (WHERE status = 'draft') AS draft_count,
                COUNT(*) AS total_campaigns
             FROM campaigns
             WHERE user_id = $1`,
            [userId]
        );

        const listsResult = await pool.query(
            `SELECT COUNT(*) AS total_lists
             FROM lists
             WHERE user_id = $1`,
            [userId]
        );

        const subscribersResult = await pool.query(
            `SELECT COUNT(*) AS total_subscribers
             FROM subscribers
             WHERE user_id = $1`,
            [userId]
        );

        // Prepare the dashboard response
        res.status(200).json({
            industry, // Include industry in the response
            totalCampaigns: parseInt(result.rows[0].total_campaigns, 10),
            sentCampaigns: parseInt(result.rows[0].sent_count, 10),
            draftCampaigns: parseInt(result.rows[0].draft_count, 10),
            totalLists: parseInt(listsResult.rows[0].total_lists, 10),
            totalSubscribers: parseInt(subscribersResult.rows[0].total_subscribers, 10),
            totalOpens, // Include total email opens in the response
            textQueueEnabled,
            recentEvents: recentEventsByPeriod, // Include recent events in the response
            latestActivity: {
                timePeriod: `${formattedStart} - ${formattedEnd}`,
                newSubscribers: newSubscribersResult.rows, // Include subscriber names and timestamps
                newLists: newListsResult.rows, // Include list names and timestamps
                newCampaigns: newCampaignsResult.rows // Include campaign names and timestamps
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
};
