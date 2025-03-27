const pool = require('../db/db');


// Controller for fetching scheduled subscribers within the given interval
exports.getScheduledSubscribers = async (req, res) => {
    const { user_id } = req.query; // User ID
    const { interval } = req.query; // Interval (7, 14, 21, or 28 days)

    if (!user_id || !interval) {
        return res.status(400).json({ message: 'User ID and interval are required parameters.' });
    }

    try {
        // Query to fetch subscribers where next_send_time is within the interval
        const scheduledSubscribersQuery = `
            SELECT 
                ls.subscriber_id,
                s.email,
                ls.next_send_time
            FROM 
                list_subscribers ls
            INNER JOIN 
                subscribers s ON ls.subscriber_id = s.id
            WHERE 
                s.user_id = $1
                AND ls.next_send_time IS NOT NULL
                AND ls.next_send_time BETWEEN NOW() AND NOW() + INTERVAL '${interval} days'
            ORDER BY 
                ls.next_send_time ASC;
        `;

        const result = await pool.query(scheduledSubscribersQuery, [user_id]);

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'No scheduled events found for the given interval.' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching scheduled subscribers:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled events.' });
    }
};


// Create a new list
exports.createList = async (req, res) => {
    const { name, user_id, subscribers = [] } = req.body;  // `subscribers` is an array of subscriber IDs
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Insert the new list
        const listResult = await client.query(
            `INSERT INTO lists (name, user_id, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
            [name, user_id]
        );
        const listId = listResult.rows[0].id;

        // Insert subscribers into the `list_subscribers` table
        for (const subscriberId of subscribers) {
            await client.query(
                'INSERT INTO list_subscribers (list_id, subscriber_id) VALUES ($1, $2)',
                [listId, subscriberId]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'List created successfully', list: listResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating list:', error);
        res.status(500).json({ error: 'Failed to create list' });
    } finally {
        client.release();
    }
};



// Get all lists
exports.getAllLists = async (req, res) => {
    try {
        const result = await pool.query(`
    SELECT l.id, l.name, l.created_at, l.updated_at,
           COUNT(ls.subscriber_id) AS subscriber_count
    FROM lists l
    LEFT JOIN list_subscribers ls ON l.id = ls.list_id
    GROUP BY l.id
`);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching lists:', error);
        res.status(500).json({ error: 'Failed to fetch lists' });
    }
};


// Get list by ID
exports.getListById = async (req, res) => {
    const { id } = req.params;

    try {
        const listResult = await pool.query('SELECT * FROM lists WHERE id = $1', [id]);

// No need to fetch `type` since it's no longer in the database


        if (listResult.rows.length === 0) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Fetch subscribers for this list
        const subscribersResult = await pool.query(
            `SELECT s.* FROM subscribers s
             INNER JOIN list_subscribers ls ON s.id = ls.subscriber_id
             WHERE ls.list_id = $1`,
            [id]
        );

        const list = listResult.rows[0];
        const subscribers = subscribersResult.rows;

        res.status(200).json({ list, subscribers });
    } catch (error) {
        console.error('Error fetching list:', error);
        res.status(500).json({ error: 'Failed to fetch list' });
    }
};

// Update a list and its subscribers
exports.updateList = async (req, res) => {
    const { id } = req.params;  // List ID from the route
    const { name, subscribers } = req.body;  // Extract updated fields from request body

    try {
        // Update the list's name, type, and updated_at timestamp
        const result = await pool.query(
            `UPDATE lists 
     SET name = $1, updated_at = NOW() 
     WHERE id = $2 RETURNING *`,
            [name, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'List not found' });
        }

        const updatedList = result.rows[0];

        // Update the list's subscribers in the list_subscribers table
        await pool.query('DELETE FROM list_subscribers WHERE list_id = $1', [id]);  // Remove existing subscribers

        for (const subscriberId of subscribers) {
            await pool.query(
                'INSERT INTO list_subscribers (list_id, subscriber_id) VALUES ($1, $2)',
                [id, subscriberId]
            );
        }

        // Query to return the updated list with its subscribers
        const listWithSubscribers = await pool.query(
            `SELECT l.*, 
                    ARRAY(
                        SELECT ls.subscriber_id 
                        FROM list_subscribers ls 
                        WHERE ls.list_id = l.id
                    ) AS subscribers
             FROM lists l
             WHERE l.id = $1`,
            [id]
        );

        res.status(200).json({ message: 'List updated successfully', list: listWithSubscribers.rows[0] });
    } catch (error) {
        console.error('Error updating list:', error);
        res.status(500).json({ error: 'Failed to update list' });
    }
};


// Delete a list
exports.deleteList = async (req, res) => {
    const { id } = req.params;

    try {
        // Delete from list_subscribers first to maintain referential integrity
        await pool.query('DELETE FROM list_subscribers WHERE list_id = $1', [id]);

        // Delete the list itself
        const result = await pool.query('DELETE FROM lists WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'List not found' });
        }

        res.status(200).json({ message: 'List deleted successfully' });
    } catch (error) {
        console.error('Error deleting list:', error);
        res.status(500).json({ error: 'Failed to delete list' });
    }
};



exports.getSubscribersForList = async (req, res) => {
    const { id } = req.params;  // List ID from the route

    try {
        // Query to fetch subscribers associated with the list
        const subscribersResult = await pool.query(`
            SELECT s.id, s.name, s.email
            FROM subscribers s
            JOIN list_subscribers ls ON s.id = ls.subscriber_id
            WHERE ls.list_id = $1
        `, [id]);

        if (subscribersResult.rows.length === 0) {
            return res.status(404).json({ message: 'No subscribers found for this list' });
        }

        res.status(200).json(subscribersResult.rows);  // Return the list of subscribers
    } catch (error) {
        console.error('Error fetching subscribers for list:', error);
        res.status(500).json({ error: 'Failed to fetch subscribers for the list' });
    }
};


// Get lists by userId
exports.getListsByUserId = async (req, res) => {
    const { userId } = req.params;
    console.log('Fetching lists for user:', userId);  // Log the userId

    try {
        const result = await pool.query(`
        SELECT l.id, l.name, l.created_at, l.updated_at,
           COUNT(ls.subscriber_id) AS subscriber_count
        FROM lists l
        LEFT JOIN list_subscribers ls ON l.id = ls.list_id
         WHERE l.user_id = $1
         GROUP BY l.id
         `, [userId]);


        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No lists found for this user' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching lists:', error);
        res.status(500).json({ error: 'Failed to fetch lists' });
    }
};



