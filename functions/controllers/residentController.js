// controllers/hoaResidentController.js
const pool = require('../db/db');

function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
}

function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

exports.validateInviteCode = async (req, res) => {
    try {
        const { invite_code } = req.body;

        const { rows } = await pool.query(
            `
      SELECT ic.id, ic.code, n.id AS neighborhood_id, n.name AS neighborhood_name
      FROM hoa_invite_codes ic
      JOIN hoa_neighborhoods n ON n.id = ic.neighborhood_id
      WHERE UPPER(ic.code) = UPPER($1)
        AND ic.active = TRUE
      LIMIT 1
      `,
            [invite_code]
        );

        if (!rows.length) {
            return res.status(400).json({ valid: false, error: 'Invalid invite code' });
        }

        res.json({ valid: true, invite: rows[0] });
    } catch (err) {
        console.error('validateInviteCode error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.signupResident = async (req, res) => {
    try {
        const { first_name, last_name, phone, invite_code } = req.body;
        const cleanPhone = normalizePhone(phone);

        if (!first_name || !last_name || !cleanPhone || !invite_code) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const inviteResult = await pool.query(
            `
                SELECT
                    ic.id,
                    n.id AS neighborhood_id,
                    n.name AS neighborhood_name
                FROM hoa_invite_codes ic
                         JOIN hoa_neighborhoods n
                              ON n.id = ic.neighborhood_id
                WHERE UPPER(ic.code) = UPPER($1)
                  AND ic.active = TRUE
                    LIMIT 1
            `,
            [invite_code]
        );

        if (!inviteResult.rows.length) {
            return res.status(400).json({ error: 'Invalid invite code' });
        }

        const neighborhoodId = inviteResult.rows[0].neighborhood_id;
        const neighborhoodName = inviteResult.rows[0].neighborhood_name;

        const residentResult = await pool.query(
            `
            INSERT INTO hoa_residents
                (first_name, last_name, phone, neighborhood_id, approval_status, sms_verified, approved_at)
            VALUES
                ($1, $2, $3, $4, 'approved', TRUE, NOW())
            ON CONFLICT (phone, neighborhood_id)
            DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                sms_verified = TRUE,
                approval_status = 'approved',
                approved_at = NOW(),
                updated_at = NOW()
            RETURNING *
            `,
            [first_name, last_name, cleanPhone, neighborhoodId]
        );

        const resident = {
            ...residentResult.rows[0],
            neighborhood_name: neighborhoodName
        };

        res.json({
            success: true,
            resident_id: resident.id,
            resident,
            message: 'Resident profile created successfully.'
        });
    } catch (err) {
        console.error('signupResident error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.verifyResidentSms = async (req, res) => {
    try {
        const { resident_id, code } = req.body;

        const { rows } = await pool.query(
            `
      SELECT *
      FROM hoa_sms_verifications
      WHERE resident_id = $1
        AND code = $2
        AND used = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      `,
            [resident_id, code]
        );

        if (!rows.length) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        await pool.query(
            `UPDATE hoa_sms_verifications SET used = TRUE WHERE id = $1`,
            [rows[0].id]
        );

        await pool.query(
            `UPDATE hoa_residents SET sms_verified = TRUE, updated_at = NOW() WHERE id = $1`,
            [resident_id]
        );

        res.json({
            success: true,
            message: 'Phone verified. Resident is pending HOA approval.'
        });
    } catch (err) {
        console.error('verifyResidentSms error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getPendingResidents = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `
      SELECT r.*, n.name AS neighborhood_name
      FROM hoa_residents r
      JOIN hoa_neighborhoods n ON n.id = r.neighborhood_id
      WHERE r.approval_status = 'pending'
      ORDER BY r.created_at DESC
      `
        );

        res.json(rows);
    } catch (err) {
        console.error('getPendingResidents error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.approveResident = async (req, res) => {
    try {
        const { residentId } = req.params;

        const { rows } = await pool.query(
            `
      UPDATE hoa_residents
      SET approval_status = 'approved',
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
            [residentId]
        );

        res.json({ success: true, resident: rows[0] });
    } catch (err) {
        console.error('approveResident error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getResidentProfile = async (req, res) => {
    try {
        const { residentId } = req.params;

        const { rows } = await pool.query(
            `
                SELECT
                    r.*,
                    n.name AS neighborhood_name,
                    n.city AS neighborhood_city,
                    n.state AS neighborhood_state
                FROM hoa_residents r
                         JOIN hoa_neighborhoods n
                              ON n.id = r.neighborhood_id
                WHERE r.id = $1
                    LIMIT 1
            `,
            [residentId]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Resident not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('getResidentProfile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};