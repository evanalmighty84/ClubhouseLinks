// controllers/poolController.js
const pool = require('../db/db');

exports.createReferral = async (req, res) => {
    const {
        firstName,
        lastName,
        phone,
        referralFirstName,
        referralLastName,
        referralBusinessName = null,
        referralPaymentUsername
    } = req.body;

    // Validate required fields
    if (
        !firstName ||
        !lastName ||
        !phone ||
        !referralFirstName ||
        !referralLastName ||
        !referralPaymentUsername
    ) {
        return res
            .status(400)
            .json({ error: 'Missing required referral fields.' });
    }

    try {
        const insertQuery = `
      INSERT INTO pool_referrals
        (
          first_name,
          last_name,
          phone,
          referral_first_name,
          referral_last_name,
          referral_business_name,
          referral_payment_username
        )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, created_at
    `;
        const values = [
            firstName,
            lastName,
            phone,
            referralFirstName,
            referralLastName,
            referralBusinessName,
            referralPaymentUsername
        ];

        const { rows } = await pool.query(insertQuery, values);
        res.status(201).json({
            success: true,
            referralId: rows[0].id,
            createdAt: rows[0].created_at
        });
    } catch (err) {
        console.error('Error inserting pool referral:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
