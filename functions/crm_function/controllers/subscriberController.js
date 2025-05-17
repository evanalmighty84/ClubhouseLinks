const pool = require('../db/db');
const moment = require('moment');

// Get all subscribers for a specific user with their associated lists
// Get all subscribers for a specific user with their associated lists and tags
exports.getAllSubscribers = async (req, res) => {
    const { userId } = req.params;

    try {
        const subscribersResult = await pool.query(`
            SELECT s.*, 
                   ARRAY(
                     SELECT ls.list_id 
                     FROM list_subscribers ls 
                     WHERE ls.subscriber_id = s.id
                   ) AS lists,
                   s.tags  -- Include tags field in the response
            FROM subscribers s
            WHERE s.user_id = $1
        `, [userId]);

        res.status(200).json(subscribersResult.rows);
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        res.status(500).json({ error: 'Failed to fetch subscribers' });
    }
};

exports.scheduleSubscribers = async (req, res) => {
    const { subscriberIds, type, date, notes } = req.body;

    if (!Array.isArray(subscriberIds) || !type || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const validTypes = ['email', 'phone_call', 'meeting', 'other', 'text'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid action type' });
    }

    const client = await pool.connect();
    const failedSubscribers = [];

    try {
        await client.query('BEGIN');

        for (const id of subscriberIds) {
            const { rows } = await client.query('SELECT * FROM subscribers WHERE id = $1', [id]);
            const subscriber = rows[0];
            if (!subscriber) continue;

            const formattedDate = moment.utc(date).toDate(); // store as actual UTC timestamp

            if (type === 'text') {
                const phone_number = subscriber.phone_number;
                const user_id = subscriber.user_id;

                if (!phone_number) {
                    failedSubscribers.push(subscriber.name || `Subscriber ${id}`);
                    continue;
                }

                await client.query(
                    `INSERT INTO smsqueue (subscriber_id, user_id, message, phone_number, scheduled_time, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
                    [id, user_id, notes, phone_number, formattedDate]
                );

                // ✅ Append to notes for text actions too
                await client.query(
                    `UPDATE subscribers
         SET notes = COALESCE(notes, '') || $1, updated_at = NOW()
         WHERE id = $2`,
                    [`\n[TEXT on ${moment(date).format('MMMM Do YYYY, h:mm A')}]: ${notes}`, id]
                );
            }
            else {
                const columnMap = {
                    email: 'scheduled_email',
                    phone_call: 'scheduled_phone_call',
                    meeting: 'scheduled_meeting',
                    other: 'scheduled_other',
                };

                const columnName = columnMap[type];

                await client.query(
                    `UPDATE subscribers
                     SET ${columnName} = $1, notes = COALESCE(notes, '') || $2, updated_at = NOW()
                     WHERE id = $3`,
                    [formattedDate, `\n[${type.toUpperCase()} on ${moment(date).format('MMMM Do YYYY, h:mm A')}]: ${notes}`, id]
                );
            }
        }

        await client.query('COMMIT');

        return res.status(200).json({
            message: 'Subscribers scheduled successfully',
            failed: failedSubscribers
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error scheduling:', error);
        res.status(500).json({ error: 'Failed to schedule subscribers' });
    } finally {
        client.release();
    }
};



// In subscribersController.js
exports.unscheduleEvent = async (req, res) => {
    const { id } = req.params;
    const { type } = req.body;

    const typeToColumn = {
        email: 'scheduled_email',
        phone_call: 'scheduled_phone_call',
        call: 'scheduled_phone_call', // 👈 added alias
        meeting: 'scheduled_meeting',
        other: 'scheduled_other'
    };


    const column = typeToColumn[type];
    if (!column) {
        return res.status(400).json({ error: 'Invalid or missing schedule type' });
    }

    try {
        const result = await pool.query(`UPDATE subscribers SET ${column} = NULL WHERE id = $1`, [id]);

        if (result.rowCount === 0) {
            console.warn(`No rows updated. Subscriber may not exist or already had ${column} = NULL.`);
            return res.status(404).json({ error: 'No matching subscriber found or already unset' });
        }

        res.status(200).json({ message: `${type} unscheduled successfully` });
    } catch (error) {
        console.error('Error unscheduling event:', error);
        res.status(500).json({ error: 'Failed to unschedule event' });
    }

};

exports.getQueuedEmailsForSubscriber = async (req, res) => {
    const { subscriberId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                eq.id,
                eq.send_time,
                eq.status,
                t.content AS template_preview
            FROM emailqueue eq
            LEFT JOIN templates t ON eq.template_id = t.id
            WHERE eq.subscriber_id = $1
            ORDER BY eq.send_time DESC
        `, [subscriberId]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching queued emails for subscriber:', error);
        res.status(500).json({ error: 'Failed to fetch queued emails' });
    }
};





// Get a subscriber by ID for a specific user with their associated lists
exports.getSubscribersByUserId = async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query(`
            SELECT s.*, 
                   COUNT(DISTINCT ls.list_id) AS list_count,  -- Count the number of lists each subscriber is associated with
                   COUNT(DISTINCT ec.id) AS clicks,          -- Count email click events
                   COUNT(DISTINCT eo.id) AS opens            -- Count email open events
            FROM subscribers s
            LEFT JOIN list_subscribers ls ON s.id = ls.subscriber_id
            LEFT JOIN email_click_events ec ON s.id = ec.subscriber_id
            LEFT JOIN email_open_events eo ON s.id = eo.subscriber_id
            WHERE s.user_id = $1
            GROUP BY s.id
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No subscribers found for this user' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        res.status(500).json({ error: 'Failed to fetch subscribers' });
    }
};



exports.getSubscriberById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM subscribers WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching subscriber:', error);
        res.status(500).json({ error: 'Failed to fetch subscriber' });
    }
};

// Get lists for a specific subscriber
exports.getSubscriberLists = async (req, res) => {
    const { id } = req.params; // Subscriber ID

    try {
        const result = await pool.query(
            `SELECT l.id, l.name
             FROM lists l
                      INNER JOIN list_subscribers ls ON l.id = ls.list_id
             WHERE ls.subscriber_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No lists found for this subscriber' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching lists for subscriber:', error);
        res.status(500).json({ error: 'Failed to fetch lists for subscriber' });
    }
};


// Create a new subscriber for a specific user and associate with lists
exports.createSubscriber = async (req, res) => {
    const { name, email, phone_number, physical_address, lists = [], user_id } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Insert the new subscriber including phone_number and physical_address
        const result = await client.query(
            `INSERT INTO subscribers (name, email, phone_number, physical_address, user_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING *`,
            [name, email, phone_number, physical_address, user_id]
        );
        const subscriberId = result.rows[0].id;

        // Insert into list_subscribers for each list ID
        if (lists.length > 0) {
            for (const listId of lists) {
                await client.query(
                    'INSERT INTO list_subscribers (list_id, subscriber_id) VALUES ($1, $2)',
                    [listId, subscriberId]
                );
            }
        }

        await client.query('COMMIT');
        console.log('here is what is being created' + name,email,phone_number,physical_address)
        res.status(201).json({ message: 'Subscriber created successfully', subscriber: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating subscriber:', error);
        res.status(500).json({ error: 'Failed to create subscriber' });
    } finally {
        client.release();
    }
};



exports.deleteSubscriber = async (req, res) => {
    const { id } = req.params;  // Subscriber ID
    const { userId } = req.query;  // User ID from query parameters
    const client = await pool.connect();

    try {
        // Start the transaction
        await client.query('BEGIN');

        // Step 1: Check if the subscriber exists in the subscribers table
        const subscriberResult = await client.query(
            'SELECT * FROM subscribers WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        const subscriber = subscriberResult.rows[0];
        if (!subscriber) {
            console.error(`Subscriber with ID ${id} and userId ${userId} not found`);
            return res.status(404).json({ message: 'Subscriber not found' });
        }

        console.log('Subscriber found:', subscriber);

        // Step 2: Fetch all lists that the subscriber is a part of
        const listResult = await client.query(
            `SELECT ls.list_id
             FROM list_subscribers ls
             WHERE ls.subscriber_id = $1`,
            [id]
        );
        const lists = listResult.rows;
        console.log(`Lists found for subscriber ${id}:`, lists);

        // ✅ Step 3 (Modified): Always insert into unsubscribes even if lists is empty
        const unsubscribeResult = await client.query(
            `SELECT * FROM unsubscribes WHERE subscriber_id = $1`,
            [id]
        );

        if (unsubscribeResult.rows.length === 0) {
            console.log(`Inserting into unsubscribes: subscriber_id=${id}, email=${subscriber.email}`);
            await client.query(
                `INSERT INTO unsubscribes (subscriber_id, email, unsubscribe_reason, created_at, user_id)
                 VALUES ($1, $2, 'Deleted by user', NOW(), $3)`,
                [id, subscriber.email, userId]
            );
            console.log(`Insert successful: subscriber_id=${id}`);

            const checkInsertedRow = await client.query(
                `SELECT * FROM unsubscribes WHERE subscriber_id = $1`,
                [id]
            );
            console.log('Inserted row:', checkInsertedRow.rows);
        }

        // ✅ Step 4 (unchanged): Delete the subscriber from all lists
        await client.query('DELETE FROM list_subscribers WHERE subscriber_id = $1', [id]);
        console.log(`Deleted subscriber ${id} from all lists.`);

        // ✅ Step 5 (unchanged): Pre-commit check to ensure unsubscribes exists
        const unsubscribesCheckBeforeCommit = await client.query('SELECT * FROM unsubscribes WHERE subscriber_id = $1', [id]);
        if (unsubscribesCheckBeforeCommit.rows.length === 0) {
            console.error(`Pre-commit check failed: No unsubscribes found for subscriber ${id}. Rolling back...`);
            await client.query('ROLLBACK');
            return res.status(500).json({ error: 'Failed to unsubscribe the user before committing changes.' });
        }
        console.log(`Pre-commit check successful: Found ${unsubscribesCheckBeforeCommit.rows.length} unsubscribes for subscriber ${id}`);

        // ✅ Step 6 (unchanged): Delete subscriber
        const deleteResult = await client.query(
            'DELETE FROM subscribers WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );

        if (deleteResult.rows.length === 0) {
            console.error(`Subscriber with ID ${id} not found for deletion.`);
            return res.status(404).json({ message: 'Subscriber not found for deletion' });
        }

        console.log(`Subscriber with ID ${id} deleted.`);

        // ✅ Step 7 (unchanged): Commit transaction
        console.log(`About to commit transaction for subscriber ${id}`);
        await client.query('COMMIT');
        console.log(`Transaction committed for subscriber ${id}`);

        // ✅ Step 8 (unchanged): Post-commit check
        const unsubscribesCheckAfterCommit = await client.query('SELECT * FROM unsubscribes WHERE subscriber_id = $1', [id]);
        console.log(`Unsubscribes for subscriber ${id} after commit:`, unsubscribesCheckAfterCommit.rows);

        res.status(200).json({ message: 'Subscriber deleted and unsubscribed successfully' });

    } catch (error) {
        // Rollback the transaction only for critical issues
        console.error('Error detected, rolling back transaction:', error);
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to delete subscriber' });
    } finally {
        client.release();
    }
};




// Update a subscriber and their associated lists for a specific user
exports.updateSubscriber = async (req, res) => {
    const { id } = req.params;  // Subscriber ID from the route
    const {
        email,
        name,
        customer,
        phone_number,
        physical_address,
        lists,
        tags
    } = req.body;

    try {
        // Update subscriber's core details
        const result = await pool.query(
            `UPDATE subscribers
             SET email = $1,
                 name = $2,
                 customer = $3,
                 phone_number = $4,
                 physical_address = $5,
                 tags = $6,
                 updated_at = NOW()
             WHERE id = $7 RETURNING *`,
            [email, name, customer, phone_number, physical_address, JSON.stringify(tags), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }

        const subscriber = result.rows[0];

        // Update the subscriber's lists
        await pool.query('DELETE FROM list_subscribers WHERE subscriber_id = $1', [id]);

        for (const listId of lists) {
            await pool.query(
                'INSERT INTO list_subscribers (list_id, subscriber_id) VALUES ($1, $2)',
                [listId, id]
            );
        }

        // Return the updated subscriber with their lists
        const updatedSubscriber = await pool.query(
            `SELECT s.*,
                    ARRAY(
                        SELECT ls.list_id 
                        FROM list_subscribers ls 
                        WHERE ls.subscriber_id = s.id
                    ) AS lists
             FROM subscribers s
             WHERE s.id = $1`,
            [id]
        );

        res.status(200).json({
            message: 'Subscriber updated successfully',
            subscriber: updatedSubscriber.rows[0]
        });
    } catch (error) {
        console.error('Error updating subscriber:', error);
        res.status(500).json({ error: 'Failed to update subscriber' });
    }
};




exports.editNotes = async (req, res) => {
    const { id } = req.params;         // subscriber ID
    const { note } = req.body;         // updated notes content

    if (!note) {
        return res.status(400).json({ error: 'Note is required' });
    }

    try {
        const result = await pool.query(
            `UPDATE subscribers SET notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [note, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Subscriber not found' });
        }

        res.status(200).json({
            message: 'Notes updated successfully',
            subscriber: result.rows[0],
        });
    } catch (err) {
        console.error('Error updating notes:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};








// Delete a subscriber and remove from all associated lists for a specific user
















