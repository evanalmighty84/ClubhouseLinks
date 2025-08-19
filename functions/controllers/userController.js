const { encryptPassword, decryptPassword } = require('../utils/encryption');
const pool = require('../db/db');


const INDUSTRIES = [
    'pool', 'handyman', 'plumber', 'roofer', 'painter', 'lawncare', 'electrician',
    'golf instructor', 'pet sitter', 'junk removal', 'general contractor',
    'realtor', 'insurance', 'House cleaner',
];


// Export to the client
exports.getIndustries = async (req, res) => {
    try {
        return res.status(200).json({ industries: INDUSTRIES });
    } catch (e) {
        console.error('Error getting industries:', e);
        return res.status(500).json({ error: 'Failed to get industries' });
    }
};
// controllers/userController.js

// reuse INDUSTRIES, normalizeToCanonical, parsePgArray from your file

exports.getUserIndustries = async (req, res) => {
    try {
        const { id } = req.params;
        const r = await pool.query(
            'SELECT id, email, industry FROM users WHERE id = $1',
            [id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'User not found' });

        const row = r.rows[0];
        const arr = parsePgArray(row.industry);                // raw DB array
        const normalized = normalizeToCanonical(arr);          // canonical where possible

        res.status(200).json({
            userId: row.id,
            email: row.email,
            userIndustriesArrayRaw: arr,
            userIndustriesArrayNormalized: normalized,
            userIndustriesCsv: arr.join(','),
        });
    } catch (e) {
        console.error('Error fetching user industries:', e);
        res.status(500).json({ error: 'Failed to fetch user industries' });
    }
};



// Helpers
const normalizeToCanonical = (values = []) => {
    const canonLower = INDUSTRIES.map((s) => s.toLowerCase());
    return [...new Set(values
        .map((v) => String(v).trim())
        .filter(Boolean)
        .map((v) => {
            const i = canonLower.indexOf(v.toLowerCase());
            return i >= 0 ? INDUSTRIES[i] : v;
        })
    )];
};

// Fallback: parse a Postgres array literal string if node-postgres returns one
const parsePgArray = (val) => {
    if (Array.isArray(val)) return val;
    if (val == null) return [];
    // naive parser for {a,b,"c d"}
    const m = String(val).match(/^\{(.*)\}$/);
    if (!m) return String(val).split(',').map(s => s.trim()).filter(Boolean);
    const inner = m[1];
    const out = [];
    let cur = '', inQuotes = false, esc = false;
    for (let ch of inner) {
        if (esc) { cur += ch; esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; continue; }
        cur += ch;
    }
    if (cur !== '') out.push(cur);
    return out.map(s => s.replace(/\\"/g,'"'));
};

exports.updateUserSettings = async (req, res) => {
    const { userId, industries, currentPassword, newPassword } = req.body;

    try {
        const userResult = await pool.query('SELECT id, email, industry, password_hash FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const wantsIndustryUpdate = Array.isArray(industries);
        const wantsPasswordUpdate = typeof currentPassword === 'string' && typeof newPassword === 'string';

        if (!wantsIndustryUpdate && !wantsPasswordUpdate) {
            return res.status(400).json({
                error: 'Nothing to update. Provide industries[] and/or currentPassword + newPassword.',
            });
        }

        // Start from current DB values
        let newIndustryArray = parsePgArray(user.industry); // always JS array
        if (wantsIndustryUpdate) {
            newIndustryArray = normalizeToCanonical(industries); // allow [] to clear
        }

        let passwordHash = user.password_hash;
        if (wantsPasswordUpdate) {
            const decrypted = decryptPassword(user.password_hash);
            if (decrypted !== currentPassword) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            if (!String(newPassword).trim()) {
                return res.status(400).json({ error: 'New password cannot be empty' });
            }
            passwordHash = encryptPassword(newPassword);
        }

        // 🚀 Write a real Postgres array using a parameterized cast
        const updateResult = await pool.query(
            `UPDATE users
       SET industry = $1::text[], password_hash = $2
       WHERE id = $3
       RETURNING id, email, industry`,
            [newIndustryArray, passwordHash, userId]
        );

        const updated = updateResult.rows[0];
        const dbIndustriesArray = parsePgArray(updated.industry);
        const dbIndustriesArrayNormalized = normalizeToCanonical(dbIndustriesArray);

        return res.status(200).json({
            message: 'User settings updated successfully!',
            userId: updated.id,
            email: updated.email,
            userIndustriesCsv: dbIndustriesArray.join(','), // for convenience
            userIndustriesArrayRaw: dbIndustriesArray,
            userIndustriesArrayNormalized: dbIndustriesArrayNormalized,
            didUpdateIndustries: wantsIndustryUpdate,
            didUpdatePassword: wantsPasswordUpdate,
        });
    } catch (error) {
        console.error('Error updating user settings:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
    }
};




// Keep this for the frontend to fetch options








