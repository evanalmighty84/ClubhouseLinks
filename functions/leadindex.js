const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nextDoorRoutes = require('./routes/nextDoorRoutes');
const templatesRoutes = require('./routes/templatesRoutes')
const poolRoutes = require('./routes/poolRoutes')
const leadRoutes = require('./routes/leadRoutes')
const smsRoutes = require('./routes/smsRoutes')



const path = require('path');

// Initialize express app
const app = express();

// Load environment variables
dotenv.config();

// Middleware
app.use(cors()); // Enable CORS

// Global logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next(); // Pass control to the next middleware or route handler
});


// Increase the JSON payload size to 5MB

app.use(express.json({ limit: '5mb' }));
// Increase the URL-encoded form data payload size to 5MB

// Authentication Routes

app.use('/api/pool', poolRoutes); // Pool routes

app.use('/api/smsqueue', smsRoutes);

app.use('/api/templates', templatesRoutes);

app.use('/api/nextdoor', nextDoorRoutes);

app.use('/api/leads',leadRoutes);

app.use('/api/test', (req, res) => {
    res.send('✅ CRM app is responding');
});


// Export the app module for Zoho Catalyst to handle the server initialization
module.exports = app;
