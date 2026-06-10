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

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/residents', hoaResidentRoutes);

app.get('/api/test', (req, res) => {
    res.json({ message: '✅ HOA backend is responding' });
});

module.exports = app;