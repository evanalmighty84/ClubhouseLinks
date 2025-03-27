const pool = require('../db/db');

async function createListsForNewUser(userId) {
    try {
        // Define the lists to be created (without specifying IDs)
        const lists = [
            { name: 'Advertisement' },
            { name: 'Sale' },

        ];

        for (const list of lists) {
            // Check if the list already exists for the user
            const listCheckResult = await pool.query(
                'SELECT id FROM lists WHERE name = $1 AND user_id = $2',
                [list.name, userId]
            );

            if (listCheckResult.rows.length === 0) {
                // Create the list if it doesn't exist
                await pool.query(
                    `INSERT INTO lists (name, user_id, contacts, created_at, updated_at)
                     VALUES ($1, $2, $3, NOW(), NOW())`,
                    [list.name, userId, '[]'] // Assuming 'contacts' is an empty array (JSON).
                );
                console.log(`Created "${list.name}" for user ${userId}`);
            } else {
                console.log(`"${list.name}" already exists for user ${userId}`);
            }
        }
    } catch (error) {
        console.error('Error creating lists for new user:', error);
    }
}



module.exports = {createListsForNewUser};

// Example usage: Call this function when a new user is created
// createListsForNewUser(newUserId);
