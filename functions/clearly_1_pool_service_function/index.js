const express = require('express');
const cors = require('cors');

// Routes
const contactUsRoutes = require('./routes/contactUsRoutes')

// Initialize express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '5mb' })); // Increase JSON payload size

// Routes
app.use('/api/contactus', contactUsRoutes); // Use the ContactUsRoutes

// Export the app module
module.exports = app;
