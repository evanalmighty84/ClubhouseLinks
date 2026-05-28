const pool = require("../db/db");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.getHOAParties = async (req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT *
      FROM hoa_parties
      ORDER BY created_at DESC
    `);

        res.json(rows);
    } catch (error) {
        console.error("Error fetching HOA parties:", error);
        res.status(500).json({ error: "Failed to fetch HOA parties" });
    }
};

exports.createProviderCheckout = async (req, res) => {
    try {
        const {
            signup_id,
            stripe_client_reference_id,
            price_id,
        } = req.body;

        if (!signup_id || !price_id) {
            return res.status(400).json({
                error: "signup_id and price_id are required",
            });
        }

        const { rows } = await pool.query(
            `
            SELECT *
            FROM hoa_party_signups
            WHERE id = $1
            LIMIT 1
            `,
            [signup_id]
        );

        const signup = rows[0];

        if (!signup) {
            return res.status(404).json({
                error: "HOA provider signup not found",
            });
        }

        const session = await stripe.checkout.sessions.create({
            mode: "payment",

            line_items: [
                {
                    price: price_id,
                    quantity: 1,
                },
            ],

            client_reference_id:
                stripe_client_reference_id ||
                signup.stripe_client_reference_id,

            customer_email: signup.email,

            metadata: {
                hoa_signup_id: signup.id.toString(),
                hoa_party_id: signup.hoa_party_id.toString(),
                business_name: signup.business_name || "",
                contact_name: signup.contact_name || "",
                service_category: signup.service_category || "",
            },

            success_url:
                "https://clubhouselinks.com/hoa-parties?payment=success",

            cancel_url:
                "https://clubhouselinks.com/hoa-parties?payment=cancelled",
        });

        res.json({
            url: session.url,
        });
    } catch (error) {
        console.error(
            "Error creating HOA provider checkout:",
            error
        );

        res.status(500).json({
            error: "Failed to create checkout session",
        });
    }
};

exports.createGuestSignup = async (req, res) => {
    try {
        const {
            hoa_party_id,
            name,
            email,
            phone,
            attendees,
        } = req.body;

        if (!hoa_party_id || !name || !email) {
            return res.status(400).json({
                error: "hoa_party_id, name, and email are required",
            });
        }

        const { rows } = await pool.query(
            `
      INSERT INTO hoa_party_signups (
        hoa_party_id,
        signup_type,
        name,
        email,
        phone,
        attendees
      )
      VALUES ($1, 'guest', $2, $3, $4, $5)
      RETURNING *
      `,
            [
                hoa_party_id,
                name,
                email,
                phone || null,
                attendees || 1,
            ]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Error creating guest HOA signup:", error);
        res.status(500).json({ error: "Failed to create guest signup" });
    }
};

exports.getReservedCategories = async (req, res) => {
    try {
        const { partyId } = req.params;

        const { rows } = await pool.query(
            `
      SELECT service_category
      FROM hoa_party_signups
      WHERE hoa_party_id = $1
        AND signup_type = 'service_provider'
        AND service_category IS NOT NULL
      `,
            [partyId]
        );

        res.json(rows.map((r) => r.service_category));
    } catch (error) {
        console.error("Error fetching reserved categories:", error);
        res.status(500).json({ error: "Failed to fetch reserved categories" });
    }
};

exports.createProviderSignup = async (req, res) => {
    try {
        const {
            hoa_party_id,
            business_name,
            contact_name,
            email,
            phone,
            service_category,
        } = req.body;

        if (
            !hoa_party_id ||
            !business_name ||
            !contact_name ||
            !email ||
            !phone ||
            !service_category
        ) {
            return res.status(400).json({
                error:
                    "hoa_party_id, business_name, contact_name, email, phone, and service_category are required",
            });
        }

        const { rows } = await pool.query(
            `
      INSERT INTO hoa_party_signups (
        hoa_party_id,
        signup_type,
        business_name,
        contact_name,
        email,
        phone,
        service_category
      )
      VALUES ($1, 'service_provider', $2, $3, $4, $5, $6)
      RETURNING *
      `,
            [
                hoa_party_id,
                business_name,
                contact_name,
                email,
                phone,
                service_category,
            ]
        );

        const signup = rows[0];
        const stripeClientReferenceId = `hoa_provider_${signup.id}`;

        const updated = await pool.query(
            `
      UPDATE hoa_party_signups
      SET stripe_client_reference_id = $1
      WHERE id = $2
      RETURNING *
      `,
            [stripeClientReferenceId, signup.id]
        );

        res.status(201).json(updated.rows[0]);
    } catch (error) {
        console.error("Error creating provider HOA signup:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                error: "This service category has already been reserved for this event.",
            });
        }

        res.status(500).json({ error: "Failed to create provider signup" });
    }
};