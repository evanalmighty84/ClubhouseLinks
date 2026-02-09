
const express = require('express');
const app = express();
// ⭐ ADD THESE TWO LINES BEFORE ANY ROUTES ⭐
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const crmApp = require('./crmIndex'); // crm_function/crmIndex.js should export an app or router
const leadApp = require('./leadindex'); // crm_function/crmIndex.js should export an app or router
const realEstatePipelineApp = require('./realEstatePipelineIndex');
const { ensureStripeCustomer } = require('./controllers/paymentController');
const pool = require('./db/db')
// adjust path if needed

app.use('/server/crm_function/', crmApp);

app.use('/server/lead_function/', leadApp);

app.use('/server/agent_pipeline/', realEstatePipelineApp);
// TEMP: dev-only route
app.post('/dev/create-subscription/:userId', async (req, res) => {
    const userId = Number(req.params.userId);

    const { rows } = await pool.query(
        'SELECT id, email, name FROM users WHERE id = $1',
        [userId]
    );

    if (!rows.length) {
        return res.status(404).json({ error: 'User not found' });
    }

    const sub = await ensureStripeCustomer(rows[0], pool);
    res.json(sub);
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Hello Evan, Server running on port ${PORT}`);
    console.log(
        'Stripe key in use:',
        process.env.STRIPE_SECRET_KEY?.slice(0, 12)
    );

});
