const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../db/db'); // your db connection

// ✅ This is the function used in your router
exports.textSignup = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET_KEY);
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email;
        try {
            await pool.query(
                'UPDATE users SET text_queue_enabled = true WHERE email = $1',
                [customerEmail]
            );
            console.log(`✅ User ${customerEmail} upgraded to text_queue_enabled`);
        } catch (err) {
            console.error('❌ Failed to update user:', err);
            return res.status(500).send('Internal Server Error');
        }
    }

    return res.json({ received: true });
};
