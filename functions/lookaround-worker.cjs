'use strict';

// IMPORTANT: An Apple Developer Program membership or resident address consent
// does not grant permission to persist/rehost Apple Maps Look Around imagery.
// Set LOOKAROUND_PERSISTENT_STORAGE_AUTHORIZED=yes ONLY after receiving express
// permission from Apple for the intended use. This worker is disabled otherwise.

const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { resolve, join } = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { promisify } = require('node:util');
const exec = promisify(execFile);

async function processOne({ api, capture, upload, discard, onlyResident, mode }) {
    const response = await api('/internal/house-image-jobs/claim', 'POST',
        onlyResident ? { resident_id: onlyResident, mode } : { mode });
    if (!response.ok) throw new Error(`Claim returned HTTP ${response.status}`);
    const { job } = await response.json();
    if (!job) return 'idle';

    const id = String(job.resident_id);
    const lease = job.lease_token;
    if (job.mode !== mode) throw new Error('Job mode does not match requested worker mode');
    if (!/^[1-9]\d{0,17}$/.test(id) || typeof lease !== 'string') {
        throw new Error('Invalid job returned by Heroku');
    }
    async function report(outcome) {
        const result = await api(`/internal/house-image-jobs/${id}/report`, 'POST',
            { lease_token: lease, outcome, mode });
        if (result.status === 409) return 'stale';
        if (!result.ok) throw new Error(`Report returned HTTP ${result.status}`);
        const body = await result.json();
        return body.status;
    }

    let dir;
    let asset;
    try {
        dir = await mkdtemp(join(tmpdir(), 'lookaround-worker-'));
        const path = join(dir, 'house.png');
        if (!await capture(job, path)) return await report('no_coverage');
        asset = await upload(path);
        if (!asset?.secure_url || !asset?.public_id)
            throw new Error('Cloudinary returned no asset');
        const result = await api(`/profile/${id}/house-image`, 'PUT', {
            image_url: asset.secure_url,
            source: mode === 'test' ? 'test_placeholder' : 'licensed_provider',
            lease_token: lease,
            mode
        });
        if ([409, 400, 403].includes(result.status)) {
            try { await discard(asset.public_id); }
            catch { console.error('Cloudinary cleanup failed'); }
            if (result.status === 409) return 'stale';
            throw new Error(`Save returned HTTP ${result.status}`);
        }
        if (!result.ok) throw new Error(`Save returned HTTP ${result.status}`);
        const data = await result.json();
        if (data?.success !== true ||
            data.resident?.house_image_url !== asset.secure_url)
            throw new Error('Unexpected save response');
        return 'saved';
    } catch {
        // Do not destroy assets on ambiguous save failures: Heroku may have
        // committed. Such uploads should be reconciled separately.
        console.error('Look Around attempt failed; requesting retry');
        return report('retry');
    } finally {
        if (dir) await rm(dir, { recursive: true, force: true });
    }
}

async function main() {
    if (process.platform !== 'darwin') throw new Error('Run this worker on macOS.');
    const dryRun = process.argv.includes('--dry-run');
    const mode = String(process.env.HOUSE_IMAGE_PIPELINE_MODE || 'off').toLowerCase();
    if (!['off', 'test', 'licensed'].includes(mode))
        throw new Error('HOUSE_IMAGE_PIPELINE_MODE must be off, test, or licensed.');
    if (!dryRun && mode === 'off')
        throw new Error('House-image pipeline is switched off.');
    if (!dryRun && mode === 'licensed' &&
        (process.env.LOOKAROUND_PERSISTENT_STORAGE_AUTHORIZED !== 'yes' ||
         process.env.HOUSE_IMAGE_LICENSED_CAPTURE_AUTHORIZED !== 'yes'))
        throw new Error('Licensed Look Around mode needs express written rights and both authorization gates.');

    if (dryRun) {
        const base = process.env.LOOKAROUND_API_BASE;
        const key = process.env.HOUSE_IMAGE_WRITE_KEY;
        const residentId = process.env.LOOKAROUND_RESIDENT_ID;
        if (!base || !key) throw new Error('Dry run requires LOOKAROUND_API_BASE and HOUSE_IMAGE_WRITE_KEY.');
        if (residentId && !/^[1-9]\d{0,17}$/.test(residentId)) throw new Error('Invalid resident ID');
        const url = new URL(base);
        if (url.protocol !== 'https:' || url.username || url.password)
            throw new Error('Invalid LOOKAROUND_API_BASE');
        const response = await fetch(url.href.replace(/\/+$/, '') +
            '/internal/house-image-jobs/probe', {
            method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
            headers: {
                'Content-Type': 'application/json',
                'X-House-Image-Write-Key': key
            },
            body: JSON.stringify(residentId ? {resident_id: residentId} : {})
        });
        if (!response.ok) throw new Error(`Dry-run probe HTTP ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error('Dry-run probe unsuccessful');
        console.log('Codemagic macOS + Heroku dry-run OK; queued jobs:', result.queued_count);
        return;
    }
    const {
        LOOKAROUND_API_BASE, LOOKAROUND_SNAPSHOT_BIN = './lookaround-snapshot',
        HOUSE_TEST_IMAGE_BIN = './house-test-image',
        HOUSE_IMAGE_WRITE_KEY, CLOUDINARY_URL, LOOKAROUND_RESIDENT_ID
    } = process.env;
    if (!LOOKAROUND_API_BASE || !HOUSE_IMAGE_WRITE_KEY || !CLOUDINARY_URL)
        throw new Error('Set LOOKAROUND_API_BASE, HOUSE_IMAGE_WRITE_KEY, and CLOUDINARY_URL.');
    const base = new URL(LOOKAROUND_API_BASE);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash)
        throw new Error('LOOKAROUND_API_BASE must be a plain HTTPS router base URL.');
    if (LOOKAROUND_RESIDENT_ID && !/^[1-9]\d{0,17}$/.test(LOOKAROUND_RESIDENT_ID))
        throw new Error('Invalid LOOKAROUND_RESIDENT_ID.');
    const root = base.href.replace(/\/+$/, '');
    const { v2: cloudinary } = require('cloudinary');
    const once = process.argv.includes('--once');
    const api = (path, method, body) => fetch(root + path, {
        method, body: JSON.stringify(body), redirect: 'error',
        signal: AbortSignal.timeout(25000),
        headers: {
            'Content-Type': 'application/json',
            'X-House-Image-Write-Key': HOUSE_IMAGE_WRITE_KEY
        }
    });
    const capture = async (job, path) => {
        try {
            const isTest = mode === 'test';
            await exec(resolve(isTest ? HOUSE_TEST_IMAGE_BIN : LOOKAROUND_SNAPSHOT_BIN),
                isTest ? [path] : [String(job.latitude), String(job.longitude), path], {
                timeout: 90000,
                env: Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG']
                    .filter(key => process.env[key])
                    .map(key => [key, process.env[key]]))
            });
            return true;
        } catch (err) {
            if (err.code === 3) return false;
            throw new Error('Native capture failed');
        }
    };
    const upload = path => cloudinary.uploader.upload(path, {
        public_id: `resident-${mode === 'test' ? 'synthetic-test' : 'lookaround'}-${randomUUID()}`,
        overwrite: false, resource_type: 'image', timeout: 30000
    });
    const discard = id => cloudinary.uploader.destroy(id, {
        resource_type: 'image', invalidate: true, timeout: 10000
    });

    do {
        try {
            const status = await processOne({
                api, capture, upload, discard, onlyResident: LOOKAROUND_RESIDENT_ID, mode
            });
            if (once || status !== 'idle') console.log(`House image (${mode}): ${status}`);
            if (once && status !== 'saved') process.exitCode = 1;
        } catch (err) {
            if (/^(Claim|Report) returned HTTP \d{3}$/.test(err.message))
                console.error(err.message);
            else console.error('Look Around worker could not complete the request.');
            if (once) process.exitCode = 1;
        }
        if (!once) await wait(15000);
    } while (!once);
}

module.exports = { processOne };
if (require.main === module) {
    main().catch(err => {
        console.error(err.message);
        process.exitCode = 1;
    });
}
