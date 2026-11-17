'use strict';

/**
 * Dispatch a queued house-image job to a short-lived Codemagic macOS build.
 * Disabled by default; no image capture is performed by this service.
 * Requires the dispatch SQL migration before enabling this integration.
 */
const pool = require('../db/db');

const enabled = () => process.env.CODEMAGIC_HOUSE_IMAGE_DISPATCH_ENABLED === 'yes';

async function dispatchHouseImageBuild(residentId) {
    if (!enabled()) return { status: 'disabled' };
    if (!/^[1-9]\d{0,17}$/.test(String(residentId)))
        return { status: 'invalid_resident_id' };

    const token = process.env.CODEMAGIC_API_TOKEN;
    const appId = process.env.CODEMAGIC_HOUSE_IMAGE_APP_ID;
    if (!token || !appId) return { status: 'not_configured' };

    // Claim a *dispatch*, not the underlying photo job. Avoid duplicate
    // build starts from simultaneous signup/address updates.
    const reserved = await pool.query(
        `UPDATE hoa_lookaround_house_jobs
         SET codemagic_dispatched_at = NOW()
         WHERE resident_id = $1
           AND status = 'queued'
           AND codemagic_dispatched_at IS NULL
         RETURNING resident_id, expected_address, latitude, longitude,
                   codemagic_dispatched_at`,
        [residentId]
    );
    const job = reserved.rows[0];
    if (!job) return { status: 'no_undispatched_job' };

    // Do not send private addresses or secrets in Codemagic build parameters.
    const body = {
        appId,
        workflowId: 'house-image-macos-debug',
        branch: process.env.CODEMAGIC_HOUSE_IMAGE_BRANCH || 'main',
        environment: {
            variables: { LOOKAROUND_RESIDENT_ID: String(job.resident_id) }
        }
    };
    let response;
    try {
        response = await fetch('https://api.codemagic.io/builds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(12000)
        });
        if (!response.ok) {
            const err = new Error(`Codemagic start failed HTTP ${response.status}`);
            err.httpStatus = response.status;
            throw err;
        }
        const data = await response.json();
        if (!data.buildId || typeof data.buildId !== 'string')
            throw new Error('Codemagic response did not include buildId');

        // Only write the returned build ID for this same dispatch reservation.
        await pool.query(
            `UPDATE hoa_lookaround_house_jobs
             SET codemagic_build_id = $2
             WHERE resident_id = $1 AND codemagic_dispatched_at = $3`,
            [residentId, data.buildId, job.codemagic_dispatched_at]
        );
        return { status: 'started', build_id: data.buildId };
    } catch (err) {
        // A timeout might mean Codemagic accepted a build despite no response.
        // Keep the reservation in that case to avoid duplicate paid builds.
        // Definitive HTTP rejection can be retried after fixing configuration.
        if (err.httpStatus) {
            await pool.query(
                `UPDATE hoa_lookaround_house_jobs
                 SET codemagic_dispatched_at = NULL
                 WHERE resident_id = $1 AND codemagic_dispatched_at = $2
                   AND codemagic_build_id IS NULL`,
                [residentId, job.codemagic_dispatched_at]
            ).catch(() => {});
        }
        console.warn('Codemagic house-image dispatch:', err.message);
        return { status: 'dispatch_failed', reason: err.message };
    }
}

module.exports = { dispatchHouseImageBuild, enabled };
