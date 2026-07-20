// residentIndex.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const hoaResidentRoutes = require('./routes/residentRoutes');

dotenv.config();

const app = express();

app.use(cors());

app.use((req, res, next) => {
    console.log(`[HOA] [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

/*
 * Needed for completed project photo uploads.
 * Base64 images are larger than the original photo, so 5mb is too small.
 */
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

/*
 * Return clean JSON instead of raw HTML when the uploaded photo is too large.
 */
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'Photo is too large. Please choose a smaller photo.'
        });
    }

    next(err);
});

app.use('/api/residents', hoaResidentRoutes);

app.get('/api/test', (req, res) => {
    res.json({ message: '✅ HOA backend is responding' });
});

module.exports = app;