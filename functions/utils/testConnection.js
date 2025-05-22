// testConnection.js
const pool = require('../db/db');  // Update path if needed

async function testConnection() {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('Connected to Heroku PostgreSQL. Current time:', res.rows[0]);
    } catch (error) {
        console.error('Error connecting to database:', error);
    } finally {
        pool.end();
    }
}

testConnection();
