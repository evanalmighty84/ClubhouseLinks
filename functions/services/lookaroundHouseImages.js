'use strict';

// House-image queue handlers. The capture worker must NOT run unless the
// imagery owner explicitly authorizes permanent storage and redistribution.
// These handlers alone never fetch Apple Maps imagery.
const { randomUUID, timingSafeEqual } = require('node:crypto');
const maxAttempts = 4;
const residentId = value => /^[1-9]\d{0,17}$/.test(String(value ?? ''));
const leaseId = value => typeof value === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);

module.exports = function createHouseImageHandlers(pool) {
    const error = (res, status, message) => res.status(status).json({ error: message });
    const enabled = () => process.env.HOUSE_IMAGE_LOOKAROUND_ENABLED === 'yes';
    function allowed(req, res) {
        const configured = Buffer.from(process.env.HOUSE_IMAGE_WRITE_KEY || '');
        const supplied = Buffer.from(req.get('X-House-Image-Write-Key') || '');
        if (!configured.length || supplied.length !== configured.length ||
            !timingSafeEqual(configured, supplied)) {
            error(res, 403, 'Not authorized');
            return false;
        }
        return true;
    }
    function failed(res, action, err) {
        console.error(`House image ${action} failed`, err?.code || err?.name);
        return error(res, 500, 'House image operation failed');
    }

    async function claimLookAroundHouseJob(req, res) {
        if (!allowed(req, res)) return;
        if (!enabled()) return error(res, 503, 'Look Around worker is disabled');
        const id = req.body?.resident_id ?? null;
        if (id !== null && !residentId(id)) return error(res, 400, 'Invalid resident ID');
        try {
            await pool.query(
                `UPDATE hoa_lookaround_house_jobs
                 SET status = 'failed', lease_token = NULL, lease_expires_at = NULL, updated_at = NOW()
                 WHERE status = 'running' AND attempts >= $1 AND lease_expires_at <= NOW()`,
                [maxAttempts]
            );
            const { rows: [job] } = await pool.query(
                `WITH next_job AS (
                    SELECT resident_id FROM hoa_lookaround_house_jobs
                    WHERE ($1::bigint IS NULL OR resident_id = $1)
                      AND attempts < $3
                      AND ((status = 'queued' AND available_at <= NOW()) OR
                           (status = 'running' AND lease_expires_at <= NOW()))
                    ORDER BY available_at, resident_id
                    FOR UPDATE SKIP LOCKED LIMIT 1
                )
                UPDATE hoa_lookaround_house_jobs AS j
                SET status = 'running', attempts = j.attempts + 1, lease_token = $2,
                    lease_expires_at = NOW() + INTERVAL '5 minutes', updated_at = NOW()
                FROM next_job
                WHERE j.resident_id = next_job.resident_id
                RETURNING j.resident_id, j.latitude, j.longitude, j.lease_token`,
                [id, randomUUID(), maxAttempts]
            );
            return res.json({ job: job || null });
        } catch (err) { return failed(res, 'claim', err); }
    }

    async function reportLookAroundHouseJob(req, res) {
        if (!allowed(req, res)) return;
        if (!enabled()) return error(res, 503, 'Look Around worker is disabled');
        const id = req.params.residentId;
        const { lease_token: lease, outcome } = req.body || {};
        if (!residentId(id) || !leaseId(lease) || !['retry', 'no_coverage'].includes(outcome)) {
            return error(res, 400, 'Invalid job result');
        }
        try {
            const { rows: [job] } = await pool.query(
                `UPDATE hoa_lookaround_house_jobs SET
                    status = CASE WHEN $3::text = 'no_coverage' THEN 'no_coverage'
                                  WHEN attempts >= $4 THEN 'failed' ELSE 'queued' END,
                    available_at = NOW() + INTERVAL '2 minutes' * attempts,
                    lease_token = NULL, lease_expires_at = NULL, updated_at = NOW()
                 WHERE resident_id = $1 AND lease_token = $2 AND status = 'running'
                   AND lease_expires_at > NOW()
                 RETURNING status`,
                [id, lease, outcome, maxAttempts]
            );
            if (!job) return error(res, 409, 'Job expired or changed');
            return res.json({ success: true, status: job.status });
        } catch (err) { return failed(res, 'report', err); }
    }

    async function saveLicensedResidentHouseImage(req, res) {
        if (!allowed(req, res)) return;
        const id = req.params.residentId;
        if (!residentId(id)) return error(res, 400, 'Invalid resident ID');
        const { image_url: image, source, lease_token: lease, expected_address: expected } = req.body || {};
        const clear = image === null;
        const worker = lease !== undefined;
        const url = typeof image === 'string' ? image.trim() : '';
        if (worker && !enabled()) return error(res, 503, 'Look Around worker is disabled');
        if (worker && (!leaseId(lease) || clear || source !== 'licensed_provider')) {
            return error(res, 400, 'Invalid Look Around save');
        }
        if (!worker && !clear && expected !== undefined &&
            (typeof expected !== 'string' || !expected.trim())) {
            return error(res, 400, 'Invalid expected_address');
        }
        if (!clear) {
            if (!['resident_upload', 'licensed_provider'].includes(source)) {
                return error(res, 400, 'Unsupported image source');
            }
            let parsed;
            try { parsed = new URL(url); } catch {}
            const cloudName = process.env.HOUSE_IMAGE_CLOUDINARY_CLOUD_NAME;
            if (!parsed || parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' ||
                parsed.username || parsed.password || parsed.port ||
                (worker && (!cloudName || !parsed.pathname.startsWith(`/${cloudName}/image/upload/`)))) {
                return error(res, 400, 'Expected an HTTPS URL for an uploaded Cloudinary image');
            }
        }

        const returning = `RETURNING id, address, latitude, longitude, house_image_url,
            house_image_source, house_image_address, house_image_updated_at`;
        if (!worker) {
            const matchAddress = clear ? null : expected ?? null;
            try {
                const { rows: [row] } = await pool.query(
                    `UPDATE hoa_residents SET house_image_url = $2,
                        house_image_source = $3,
                        house_image_address = CASE WHEN $2::text IS NULL THEN NULL ELSE address END,
                        house_image_updated_at = NOW()
                     WHERE id = $1 AND ($2::text IS NULL OR NULLIF(BTRIM(address), '') IS NOT NULL)
                       AND ($4::text IS NULL OR address = $4::text)
                     ${returning}`, [id, clear ? null : url, clear ? null : source, matchAddress]
                );
                if (!row && matchAddress !== null) return error(res, 409, 'Resident address no longer matches');
                if (!row) return error(res, 404, 'Resident not found or address missing');
                return res.json({ success: true, resident: row });
            } catch (err) { return failed(res, 'legacy save', err); }
        }

        let client;
        try {
            client = await pool.connect();
            await client.query('BEGIN');
            const { rows: [resident] } = await client.query(
                'SELECT id FROM hoa_residents WHERE id = $1 FOR UPDATE', [id]
            );
            if (!resident) {
                await client.query('ROLLBACK');
                return error(res, 409, 'Resident no longer exists');
            }
            const { rows: [job] } = await client.query(
                `SELECT expected_address, latitude, longitude FROM hoa_lookaround_house_jobs
                 WHERE resident_id = $1 AND lease_token = $2 AND status = 'running'
                   AND lease_expires_at > NOW() FOR UPDATE`, [id, lease]
            );
            if (!job) {
                await client.query('ROLLBACK');
                return error(res, 409, 'Job expired or changed');
            }
            const { rows: [row] } = await client.query(
                `UPDATE hoa_residents SET house_image_url = $2,
                    house_image_source = 'licensed_provider', house_image_address = address,
                    house_image_updated_at = NOW()
                 WHERE id = $1 AND address = $3 AND house_image_url IS NULL
                   AND latitude::double precision = $4 AND longitude::double precision = $5
                 ${returning}`, [id, url, job.expected_address, job.latitude, job.longitude]
            );
            if (row) {
                await client.query(
                    `UPDATE hoa_lookaround_house_jobs SET status = 'saved', lease_token = NULL,
                        lease_expires_at = NULL, updated_at = NOW() WHERE resident_id = $1`, [id]
                );
            } else {
                await client.query('DELETE FROM hoa_lookaround_house_jobs WHERE resident_id = $1', [id]);
            }
            await client.query('COMMIT');
            if (!row) return error(res, 409, 'Resident location changed or a photo is already saved');
            return res.json({ success: true, resident: row });
        } catch (err) {
            if (client) try { await client.query('ROLLBACK'); } catch {}
            return failed(res, 'save', err);
        } finally {
            client?.release();
        }
    }

    return { claimLookAroundHouseJob, reportLookAroundHouseJob, saveLicensedResidentHouseImage };
};
