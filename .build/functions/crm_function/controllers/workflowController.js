const pool = require('../db/db');

// Get Scheduled Workflow Events
exports.getScheduledWorkflowEvents = async (req, res) => {
    const { user_id } = req.query;

    console.log('Received user_id:', user_id, 'Type:', typeof user_id);

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const result = await pool.query(
            `
        SELECT 
            ls.subscriber_id, 
            s.email, 
            ls.next_send_time, 
            l.name AS list_name, 
            t.workflow
        FROM list_subscribers ls
        INNER JOIN subscribers s 
            ON ls.subscriber_id = s.id
        INNER JOIN lists l 
            ON ls.list_id = l.id
        INNER JOIN templates t 
            ON l.user_id = t.user_id AND t.workflow::integer = 5  -- Cast to integer here
        WHERE ls.next_send_time IS NOT NULL 
          AND l.user_id = $1
        ORDER BY ls.next_send_time ASC
        `,
            [parseInt(user_id, 10)]  // Ensure user_id is an integer
        );



        console.log('Query result:', result.rows);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching scheduled workflow events:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled workflow events' });
    }
};
