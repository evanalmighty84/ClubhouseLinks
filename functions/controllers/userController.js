// controllers/userController.js (or wherever this lives)
const { encryptPassword, decryptPassword } = require('../utils/encryption');
const pool = require('../db/db');

/** Canonical tokens saved in Postgres (text[]) */
const CANON_INDUSTRIES = [
    'pool', 'handyman', 'plumber', 'roofer', 'painter', 'lawncare', 'electrician',
    'golf_instructor', 'pet_sitter', 'junk_removal', 'general_contractor',
    'realtor', 'insurance', 'house_cleaner',
];

/** Pretty labels for UI (optional helper) */
const DISPLAY_LABEL = {
    pool: 'Pool',
    handyman: 'Handyman',
    plumber: 'Plumber',
    roofer: 'Roofer',
    painter: 'Painter',
    lawncare: 'Lawn Care',
    electrician: 'Electrician',
    golf_instructor: 'Golf Instructor',
    pet_sitter: 'Pet Sitter',
    junk_removal: 'Junk Removal',
    general_contractor: 'General Contractor',
    realtor: 'Realtor',
    insurance: 'Insurance',
    house_cleaner: 'House Cleaner',
};

/** Synonyms (case-insensitive) → canonical tokens */
const CANON_MAP = {
    // exact tokens map to themselves
    ...Object.fromEntries(CANON_INDUSTRIES.map(t => [t, t])),

    // common variants
    'house cleaner': 'house_cleaner',
    'housecleaner': 'house_cleaner',
    'house-cleaner': 'house_cleaner',
    'cleaner': 'house_cleaner',
    'house keeping': 'house_cleaner',
    'housekeeping': 'house_cleaner',
    'maid': 'house_cleaner',
    'maids': 'house_cleaner',
    'house keeper': 'house_cleaner',

    'golf instructor': 'golf_instructor',
    'pet sitter': 'pet_sitter',
    'junk removal': 'junk_removal',
    'general contractor': 'general_contractor',
    'lawn care': 'lawncare',
};

/** Normalize a single value to canonical token (or drop if unknown) */
const toCanonical = (v) => {
    if (v == null) return null;
    const k = String(v).trim().toLowerCase();
    return CANON_MAP[k] || null;
};

/** Normalize an array of arbitrary labels to unique canonical tokens */
const normalizeToCanonical = (values = []) => {
    const out = [];
    const seen = new Set();
    for (const v of values) {
        const tok = toCanonical(v);
        if (tok && !seen.has(tok)) { seen.add(tok); out.push(tok); }
    }
    return out;
};

/** Parse Postgres array literal if needed (kept from your code) */
const parsePgArray = (val) => {
    if (Array.isArray(val)) return val;
    if (val == null) return [];
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

/** ====== Public endpoints ====== */

// Return choices for UI (pretty labels but include tokens if you like)
exports.getIndustries = async (_req, res) => {
    const industries = CANON_INDUSTRIES.map(t => ({ value: t, label: DISPLAY_LABEL[t] || t }));
    return res.status(200).json({ industries });
};

exports.getUserIndustries = async (req, res) => {
    try {
        const { id } = req.params;
        const r = await pool.query('SELECT id, email, industry FROM users WHERE id = $1', [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'User not found' });

        const row = r.rows[0];
        const raw = parsePgArray(row.industry);
        const normalized = normalizeToCanonical(raw);

        res.status(200).json({
            userId: row.id,
            email: row.email,
            userIndustriesArrayRaw: raw,          // what’s actually stored
            userIndustriesArrayNormalized: normalized,
            userIndustriesCsv: raw.join(','),
        });
    } catch (e) {
        console.error('Error fetching user industries:', e);
        res.status(500).json({ error: 'Failed to fetch user industries' });
    }
};

exports.updateUserSettings = async (req, res) => {
    const { userId, industries, currentPassword, newPassword } = req.body;

    try {
        const userResult = await pool.query(
            'SELECT id, email, industry, password_hash FROM users WHERE id = $1',
            [userId]
        );
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const wantsIndustryUpdate = Array.isArray(industries);
        const wantsPasswordUpdate = typeof currentPassword === 'string' && typeof newPassword === 'string';

        if (!wantsIndustryUpdate && !wantsPasswordUpdate) {
            return res.status(400).json({
                error: 'Nothing to update. Provide industries[] and/or currentPassword + newPassword.',
            });
        }

        // start from DB
        let newIndustryArray = parsePgArray(user.industry);
        if (wantsIndustryUpdate) {
            newIndustryArray = normalizeToCanonical(industries);
        }

        let passwordHash = user.password_hash;
        if (wantsPasswordUpdate) {
            const decrypted = decryptPassword(user.password_hash);
            if (decrypted !== currentPassword) return res.status(400).json({ error: 'Current password is incorrect' });
            if (!String(newPassword).trim())   return res.status(400).json({ error: 'New password cannot be empty' });
            passwordHash = encryptPassword(newPassword);
        }

        const updateResult = await pool.query(
            `UPDATE users
         SET industry = $1::text[], password_hash = $2
       WHERE id = $3
       RETURNING id, email, industry`,
            [newIndustryArray, passwordHash, userId]
        );

        const updated = updateResult.rows[0];
        const dbArr = parsePgArray(updated.industry);

        return res.status(200).json({
            message: 'User settings updated successfully!',
            userId: updated.id,
            email: updated.email,
            userIndustriesCsv: dbArr.join(','),
            userIndustriesArrayRaw: dbArr,
            userIndustriesArrayNormalized: normalizeToCanonical(dbArr),
            didUpdateIndustries: wantsIndustryUpdate,
            didUpdatePassword: wantsPasswordUpdate,
        });
    } catch (error) {
        console.error('Error updating user settings:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
    }
};
