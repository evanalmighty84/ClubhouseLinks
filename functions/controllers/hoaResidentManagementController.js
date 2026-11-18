'use strict';

// Board roster management: intentionally independent of legacy ID-only HOA
// event routes. A resident ID alone never authorizes reading or editing a roster.
const pool = require('../db/db');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');

const isId = value => /^[1-9]\d{0,17}$/.test(String(value ?? ''));
const secret = () => {
    const key = process.env.BOARD_RESIDENT_SESSION_SECRET || '';
    return key.length >= 32 ? key : null;
};
const service = () => process.env.TWILIO_VERIFY_SERVICE_SID;
const phoneE164 = value => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 10 ? '+1' + digits :
        digits.length === 11 && digits.startsWith('1') ? '+' + digits : null;
};
const otpClient = () => twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);
const err = (res, code, message) => res.status(code).json({error: message});

async function boardRecord(id) {
    if (!isId(id)) return null;
    const {rows: [row]} = await pool.query(
        `SELECT id, phone, neighborhood_id FROM hoa_residents
         WHERE id = $1 AND board_of_directors = TRUE
           AND approval_status = 'approved'
           AND neighborhood_id IS NOT NULL LIMIT 1`, [id]);
    return row || null;
}
async function beginSession(req, res) {
    if (!secret() || !service()) return err(res, 503, 'Board roster security is not configured');
    try {
        const board = await boardRecord(req.params.boardId);
        if (!board || !phoneE164(board.phone))
            return err(res, 403, 'Board member verification unavailable');
        await otpClient().verify.v2.services(service()).verifications.create({
            to: phoneE164(board.phone), channel: 'sms'
        });
        return res.json({success: true, message: 'A verification code was sent to the board member phone'});
    } catch (e) {
        console.error('Board OTP send failed:', e?.code || e?.name);
        return err(res, 502, 'Unable to send verification');
    }
}
async function verifySession(req, res) {
    if (!secret() || !service()) return err(res, 503, 'Board roster security is not configured');
    if (!/^\d{4,10}$/.test(String(req.body?.code ?? '')))
        return err(res, 400, 'Invalid verification code format');
    try {
        const board = await boardRecord(req.params.boardId);
        if (!board || !phoneE164(board.phone))
            return err(res, 403, 'Board member verification unavailable');
        const verified = await otpClient().verify.v2.services(service()).verificationChecks.create({
            to: phoneE164(board.phone), code: String(req.body.code)
        });
        if (verified.status !== 'approved') return err(res, 403, 'Incorrect or expired code');
        const token = jwt.sign({
            scope: 'hoa:roster', neighborhood_id: board.neighborhood_id
        }, secret(), {subject: String(board.id), algorithm: 'HS256',
            expiresIn: '30m', issuer: 'clubhouse-links-board', audience: 'hoa-roster'});
        return res.json({success: true, access_token: token, expires_in: 1800});
    } catch (e) {
        console.error('Board OTP verification failed:', e?.code || e?.name);
        return err(res, 403, 'Unable to verify board member');
    }
}
async function requireBoardSession(req, res, next) {
    const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(req.get('Authorization') || '');
    if (!secret() || !match) return err(res, 401, 'Verified board session required');
    let claims;
    try {
        claims = jwt.verify(match[1], secret(), {
            algorithms: ['HS256'], issuer: 'clubhouse-links-board', audience: 'hoa-roster'
        });
    } catch {
        return err(res, 401, 'Board session expired. Verify again');
    }
    if (!isId(req.params.boardId) || String(claims.sub) !== String(req.params.boardId) ||
        claims.scope !== 'hoa:roster')
        return err(res, 403, 'Invalid board session');
    try {
        const board = await boardRecord(req.params.boardId);
        if (!board || Number(board.neighborhood_id) !== Number(claims.neighborhood_id))
            return err(res, 403, 'Board membership has changed');
        req.boardNeighborhoodId = board.neighborhood_id;
        req.boardResidentId = Number(board.id);
        return next();
    } catch (e) {
        console.error('Board session lookup failed:', e?.code || e?.name);
        return err(res, 500, 'Unable to verify board membership');
    }
}
async function listResidents(req, res) {
    try {
        // Resolve the invite code from the verified board member's neighborhood,
        // never from a client-provided neighborhood ID or hardcoded HOA name.
        const {rows: [community]} = await pool.query(
            `SELECT n.id AS neighborhood_id, n.name AS neighborhood_name,
                    (SELECT ic.code FROM hoa_invite_codes ic
                     WHERE ic.neighborhood_id = n.id
                       AND ic.active = TRUE
                       AND ic.code_type = 'resident'
                       AND COALESCE(ic.grants_board_access, FALSE) = FALSE
                     ORDER BY ic.id LIMIT 1) AS invite_code
             FROM hoa_neighborhoods n WHERE n.id = $1 LIMIT 1`,
            [req.boardNeighborhoodId]);
        if (!community) return err(res, 404, 'Board community not found');
        const {rows} = await pool.query(
            `SELECT id, first_name, last_name, approval_status, board_of_directors,
                created_at
             FROM hoa_residents
             WHERE neighborhood_id = $1
             ORDER BY last_name NULLS LAST, first_name NULLS LAST, id
             LIMIT 500`, [req.boardNeighborhoodId]);
        return res.json({success: true, community, residents: rows});
    } catch (e) {
        console.error('Board resident listing failed:', e?.code || e?.name);
        return err(res, 500, 'Unable to load residents');
    }
}
async function updateResident(req, res) {
    if (!isId(req.params.targetId)) return err(res, 400, 'Invalid resident ID');
    const input = req.body || {};
    const permitted = ['first_name', 'last_name', 'approval_status'];
    const keys = Object.keys(input);
    if (!keys.length || keys.some(key => !permitted.includes(key)))
        return err(res, 400, 'Only name and approval status may be edited');
    for (const key of ['first_name', 'last_name']) {
        if (key in input && (typeof input[key] !== 'string' ||
            !input[key].trim() || input[key].trim().length > 80))
            return err(res, 400, 'Invalid resident name');
    }
    if ('approval_status' in input &&
        !['pending', 'approved', 'rejected'].includes(input.approval_status))
        return err(res, 400, 'Invalid approval status');
    try {
        // Never let a board member change another board member's role, status,
        // or identity. Never change neighborhood, phone, verification or address.
        const {rows: [row]} = await pool.query(
            `UPDATE hoa_residents SET
                first_name = COALESCE($3::text, first_name),
                last_name = COALESCE($4::text, last_name),
                approval_status = COALESCE($5::text, approval_status),
                approved_at = CASE
                   WHEN $5::text = 'approved' THEN NOW()
                   WHEN $5::text IN ('pending', 'rejected') THEN NULL
                   ELSE approved_at END,
                updated_at = NOW()
             WHERE id = $1 AND neighborhood_id = $2
               AND COALESCE(board_of_directors, FALSE) = FALSE
             RETURNING id, first_name, last_name, approval_status, board_of_directors`,
            [req.params.targetId, req.boardNeighborhoodId,
                input.first_name?.trim() ?? null, input.last_name?.trim() ?? null,
                input.approval_status ?? null]);
        if (!row) return err(res, 404, 'Resident not found or board-managed record');
        return res.json({success: true, resident: row});
    } catch (e) {
        console.error('Board resident update failed:', e?.code || e?.name);
        return err(res, 500, 'Unable to update resident');
    }
}
module.exports = {beginSession, verifySession, requireBoardSession, listResidents, updateResident};
