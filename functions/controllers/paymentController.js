const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../db/db');

exports.stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const data = event.data.object;

    try {
        switch (event.type) {

            // ✅ THIS is what activates the UI
            case 'checkout.session.completed': {
                if (data.mode !== 'subscription') break;

                await pool.query(`
                    UPDATE subscriptions
                    SET
                        stripe_subscription_id = $1,
                        status = 'active',
                        updated_at = NOW()
                    WHERE stripe_customer_id = $2
                `, [
                    data.subscription,
                    data.customer
                ]);

                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await pool.query(`
                    UPDATE subscriptions
                    SET
                        stripe_subscription_id = $1,
                        status = $2,
                        price_id = $3,
                        current_period_end = to_timestamp($4),
                        updated_at = NOW()
                    WHERE stripe_customer_id = $5
                `, [
                    data.id,
                    data.status,
                    data.items.data[0].price.id,
                    data.current_period_end,
                    data.customer
                ]);
                break;

            case 'customer.subscription.deleted':
                await pool.query(`
                    UPDATE subscriptions
                    SET status = 'canceled', updated_at = NOW()
                    WHERE stripe_customer_id = $1
                `, [data.customer]);
                break;

            case 'invoice.payment_failed':
                await pool.query(`
                    UPDATE subscriptions
                    SET status = 'past_due'
                    WHERE stripe_customer_id = $1
                `, [data.customer]);
                break;

            case 'invoice.paid':
                await pool.query(`
                    UPDATE subscriptions
                    SET status = 'active'
                    WHERE stripe_customer_id = $1
                `, [data.customer]);
                break;
        }

        res.json({ received: true });
    } catch (err) {
        console.error('❌ Stripe webhook DB error:', err);
        res.status(500).send('Webhook handler failed');
    }
};


// 🔹 Helper: ensure Stripe customer + subscription row exists
exports.ensureStripeCustomer = async (user) => {
    // 1. Check if subscription already exists
    const existing = await pool.query(
        'SELECT * FROM subscriptions WHERE user_id = $1',
        [user.id]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    // 2. Create Stripe customer
    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
            user_id: user.id
        }
    });

    // 3. Insert subscription row (inactive until webhook fires)
    const result = await pool.query(
        `
        INSERT INTO subscriptions (
            user_id,
            stripe_customer_id,
            status
        )
        VALUES ($1, $2, 'inactive')
        RETURNING *
        `,
        [user.id, customer.id]
    );

    return result.rows[0];
};
// GET /stripe/subscription/:userId
exports.getSubscription = async (req, res) => {
    const { userId } = req.params;

    const { rows } = await pool.query(
        'SELECT status FROM subscriptions WHERE user_id = $1',
        [userId]
    );

    res.json(rows[0] || { status: null });
};

exports.createCheckoutSession = async (req, res) => {
    const { userId } = req.body;

    const { rows } = await pool.query(
        'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
        [userId]
    );

    const customerId = rows[0]?.stripe_customer_id;

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        success_url: 'https://clubhouselinks.com/settings?success=true',
        cancel_url: 'https://clubhouselinks.com/settings?canceled=true',
    });

    res.json({ url: session.url });
};

exports.cancelSubscription = async (req, res) => {
    const { userId } = req.body;

    const { rows } = await pool.query(
        'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1',
        [userId]
    );

    if (!rows.length || !rows[0].stripe_subscription_id) {
        return res.status(400).json({ error: 'No active subscription' });
    }

    await stripe.subscriptions.update(rows[0].stripe_subscription_id, {
        cancel_at_period_end: true,
    });

    res.json({ success: true });
};

exports.syncStripeSubscription = async (req, res) => {
    const { userId } = req.params;

    try {
        // 1️⃣ Get user email
        const { rows } = await pool.query(
            'SELECT id, email FROM users WHERE id = $1',
            [userId]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];

        // 2️⃣ Find Stripe customer by email
        const customers = await stripe.customers.list({
            email: user.email,
            limit: 1
        });

        if (!customers.data.length) {
            return res.json({ status: 'no_subscription' });
        }

        const customer = customers.data[0];

        // 3️⃣ Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 1
        });

        if (!subscriptions.data.length) {
            return res.json({ status: 'no_subscription' });
        }

        const sub = subscriptions.data[0];

        // 4️⃣ Upsert into DB
        await pool.query(`
            INSERT INTO subscriptions (
                user_id,
                stripe_customer_id,
                stripe_subscription_id,
                status,
                price_id,
                current_period_end,
                created_at,
                updated_at
            )
            VALUES ($1,$2,$3,$4,$5,to_timestamp($6),NOW(),NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                stripe_customer_id = EXCLUDED.stripe_customer_id,
                stripe_subscription_id = EXCLUDED.stripe_subscription_id,
                status = EXCLUDED.status,
                price_id = EXCLUDED.price_id,
                current_period_end = EXCLUDED.current_period_end,
                updated_at = NOW()
        `, [
            user.id,
            customer.id,
            sub.id,
            sub.status,
            sub.items.data[0].price.id,
            sub.current_period_end
        ]);

        res.json({
            status: sub.status,
            price_id: sub.items.data[0].price.id
        });

    } catch (err) {
        console.error('Stripe sync error:', err);
        res.status(500).json({ error: 'Sync failed' });
    }
};

exports.getBillingHistory = async (req, res) => {
    const { userId } = req.params;

    try {
        // 1️⃣ Get user email
        const { rows } = await pool.query(
            'SELECT email FROM users WHERE id = $1',
            [userId]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        const email = rows[0].email;

        // 2️⃣ Find Stripe customer by email
        const customers = await stripe.customers.list({
            email,
            limit: 1
        });

        if (!customers.data.length) {
            return res.json([]);
        }

        const customerId = customers.data[0].id;

        // 3️⃣ Get invoices
        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: 10
        });

        const formatted = invoices.data.map(inv => ({
            id: inv.id,
            amount: (inv.amount_paid / 100).toFixed(2),
            currency: inv.currency.toUpperCase(),
            status: inv.status,
            date: new Date(inv.created * 1000),
            url: inv.hosted_invoice_url
        }));

        res.json(formatted);

    } catch (err) {
        console.error("Billing history error:", err);
        res.status(500).json({ error: "Failed to load billing history" });
    }
};




