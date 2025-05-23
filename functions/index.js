const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Routes
const campaignsRoutes = require('./routes/campaignsRoutes');
const authRoutes = require('./routes/authRoutes');
const listRoutes = require('./routes/listRoutes'); // Import list routes
const subscriberRoutes = require('./routes/subscriberRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const unSubscribeRoutes = require('./routes/unsubscribesRoutes');
const bounceRoutes = require('./routes/bounceRoutes')
const smtpRoutes = require('./routes/smtpRoutes')
const userRoutes = require('./routes/userRoutes')
const templatesRoutes = require('./routes/templatesRoutes')
const workflowRoutes = require('./routes/workflowRoutes')
const emailQueuedRoutes = require('./routes/emailQueuedRoutes')
const smsRoutes = require('./routes/smsRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const poolRoutes = require('./routes/poolRoutes')


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
app.use('/api/auth', authRoutes); // Sign-up, Sign-in routes


app.use('/uploads', express.static(path.join(__dirname, '.build/functions/uploads')));
// Campaigns Routes
app.use('/api/campaigns', campaignsRoutes); // Campaign routes

app.use('/api/pool', poolRoutes); // Pool routes
app.use('/api/lists', listRoutes);

app.use('/api/subscribers', subscriberRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/emailqueue', emailQueuedRoutes);

app.use('/api/bounce',bounceRoutes)

// Add the upload route
app.use('/api/upload', uploadRoutes);

app.use('/api/smtp', smtpRoutes);

app.use('/api/smsqueue', smsRoutes);

app.use('/api/payments', express.raw({ type: 'application/json' }), paymentRoutes);



// Use tracking routes
app.use('/api/track', trackingRoutes);

app.use('/api/users', userRoutes)

app.use('/api/unsubscribe', unSubscribeRoutes);

app.use('/api/templates', templatesRoutes);

app.use('/api/workflow', workflowRoutes);



// Export the app module for Zoho Catalyst to handle the server initialization
module.exports = app;
