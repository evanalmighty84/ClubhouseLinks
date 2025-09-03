#!/usr/bin/env node
const fs = require('fs');
const { chromium } = require('playwright');
const { buildSearchUrl } = require('./pick_ftn_result');

function getProxy() {
    const s = process.env.PROXY_URL || '';
    if (!s) return undefined;
    const u = new URL(s);
    return {
        server: `${u.protocol}//${u.hostname}:${u.port}`,
        username: decodeURIComponent(u.username || ''),
        password: decodeURIComponent(u.password || ''),
    };
}


// ADD this helper near the top:
async function openFTNSearchOrDetail(page, { first, last, city, detailUrl }) {
    // 1) Try the detail page directly if provided
    if (detailUrl) {
        console.log('🔗 Opening detail directly:', detailUrl);
        try {
            const r = await page.goto(detailUrl, { waitUntil: 'commit', timeout: 120000 });
            const s = r?.status?.() ?? 0;
            console.log('   detail status:', s);
            if (s && s < 400) return { url: detailUrl, status: s };
        } catch (e) {
            console.warn('   detail failed:', e.message, '→ falling back to search…');
        }
    }

    // 2) Try people/results then genealogy/results
    const bases = [
        'https://www.familytreenow.com/search/people/results',
        'https://www.familytreenow.com/search/genealogy/results',
    ];
    for (const base of bases) {
        const url = buildSearchUrl({ first, last, livesText: city, base });
        console.log('🔎 Opening search:', url);
        try {
            const resp = await page.goto(url, { waitUntil: 'commit', timeout: 120000 });
            const status = resp?.status?.() ?? 0;
            console.log('   status:', status);
            if (status && status < 400) return { url, status };
        } catch (e) {
            console.warn(`   fetch error (${base}):`, e.message);
        }
    }

    // 3) Keep artifacts for debugging
    try { await page.screenshot({ path: 'ftn_500_debug.png', fullPage: true }); } catch {}
    try { const html = await page.content(); require('fs').writeFileSync('ftn_500_debug.html', html); } catch {}
    throw new Error('Search failed: both endpoints returned errors');
}


(async () => {
    const [, , artifactPath] = process.argv;
    if (!artifactPath) {
        console.error('Usage: node ftn_click_and_scrape.js <best_pick.json>');
        process.exit(1);
    }
    const best = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const { first, last, city, livesText } = best;

    const proxy = getProxy();
    console.log('Using proxy:', proxy?.server || '(none)');

    const headless = !process.env.HEADFUL;

    const browser = await chromium.launch({
        headless,
        proxy,                                 // <<< creds split explicitly
        args: [
            '--ignore-certificate-errors',
            '--disable-gpu',
        ],
    });

    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        viewport: { width: 1360, height: 900 },
        locale: 'en-US',
    });

    // Speed things up: don’t download heavy assets
    await context.route('**/*.{png,jpg,jpeg,webp,gif,svg,woff,woff2,ttf}', r => r.abort());

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(180000);
    page.setDefaultTimeout(180000);

    // Basic wire logs so we can see what’s happening
    page.on('request', r => console.log('➡️', r.method(), r.url()));
    page.on('response', r => console.log('⬅️', r.status(), r.url()));
    page.on('console', m => console.log('🟡 console:', m.text()));

    // Quick probe to confirm proxy really works from Chromium
    try {
        await page.goto('https://example.com', { timeout: 60000, waitUntil: 'commit' });
        console.log('Probe OK. Title:', await page.title());
    } catch (e) {
        console.error('Proxy probe failed from Chromium:', e.message);
        await browser.close();
        process.exit(10);
    }

// If your artifact has a detail URL, pass it (support a few key names)
    const detailUrl =
        best.detailUrl ||
        best.VIEW_DETAILS_URL ||
        best.viewDetailsUrl ||
        undefined;

    const openRes = await openFTNSearchOrDetail(page, { first, last, city, detailUrl });
    console.log('✅ Opened:', openRes.url, '(status', openRes.status, ')');


    // Detect PerimeterX; in HEADFUL we let you solve it, else exit with code 42
    const hitPX = await page.evaluate(() => {
        try {
            if (window._pxAppId) return true;
            const t = document.body?.innerText || '';
            return /Before we continue|Press & Hold/i.test(t);
        } catch { return false; }
    });
    if (hitPX) {
        if (process.env.HEADFUL) {
            console.warn('⚠️ PerimeterX shown. Solve it in the visible browser. Waiting up to 3 minutes…');
            await page.waitForFunction(
                () => !window._pxAppId && !/Before we continue|Press & Hold/i.test(document.body.innerText),
                { timeout: 180000 }
            );
        } else {
            console.error('PX challenge detected in headless mode. Re-run with HEADFUL=1.');
            await browser.close();
            process.exit(42);
        }
    }

    // Click “View Details” inside the exact card that matches livesText
    const clicked = await page.evaluate(async (targetLives) => {
        const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

        const rows = Array.from(document.querySelectorAll('tr'))
            .filter(tr => (tr.querySelector('td')?.innerText || '').toLowerCase().includes('lives in'));

        let bestRow = null;
        for (const tr of rows) {
            const tds = tr.querySelectorAll('td');
            const live = (tds[1]?.innerText || '').replace(/\s+/g, ' ').trim();
            if (norm(live) === norm(targetLives)) { bestRow = tr; break; }
        }
        if (!bestRow) return { ok: false, reason: 'no matching livesText' };

        let card = bestRow.closest('.row') || bestRow.closest('table')?.closest('.row') || bestRow.closest('td') || bestRow;
        const sels = [
            'a.btn.btn-success.detail-link[href]',
            'a.summary-detail-link.detail-link[href]',
            'a.detail-link[href]',
            'a[href*="/record/"]',
        ];
        let a = null;
        for (const s of sels) { a = card.querySelector(s); if (a) break; }
        if (!a) return { ok: false, reason: 'no detail anchor in card' };

        a.scrollIntoView({ block: 'center' });
        (a instanceof HTMLElement) && a.click();
        return { ok: true, href: a.getAttribute('href') || '' };
    }, livesText);

    if (!clicked.ok) {
        console.error('❌ Could not click details link:', clicked.reason);
        await browser.close();
        process.exit(3);
    }

    // Wait for either navigation or URL change
    try {
        await page.waitForNavigation({ timeout: 90000, waitUntil: 'commit' });
    } catch (_) { /* sometimes it’s SPA-ish; ignore */ }

    const finalUrl = page.url();
    console.log('➡️ Landed on:', finalUrl);

    // Scrape a few details
    const data = await page.evaluate(() => {
        const out = {};
        const canon = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
        if (canon) out.canonical = canon;
        out.title = document.title || '';

        const rows = Array.from(document.querySelectorAll('tr'));
        for (const tr of rows) {
            const tds = tr.querySelectorAll('td');
            if (tds.length < 2) continue;
            const key = (tds[0].innerText || '').trim().replace(/:$/, '').toLowerCase();
            const val = (tds[1].innerText || '').trim();
            if (!key || !val) continue;

            if (key === 'name') out.name = val;
            else if (key === 'lives in') out.livesIn = val;
            else if (key === 'age') out.age = val;
            else if (key === 'born') out.born = val;
            else if (key === 'possible relatives') out.possibleRelatives = val;
        }
        return out;
    });

    console.log('🧾 SCRAPED:', JSON.stringify(data, null, 2));

    if (headless) await browser.close();
    else console.log('👀 HEADFUL—close the window when done');
})().catch(async (e) => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
