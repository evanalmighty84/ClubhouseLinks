#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Import utility functions from your existing module
const { pickBest, buildSearchUrl } = require('./pick_ftn_result');

function parseArgs() {
    const [, , first, last, cityState] = process.argv;
    if (!first || !last || !cityState) {
        console.error('Usage: node ftn_click_via_playwright.js "<First>" "<Last>" "<City[, ST]>"');
        process.exit(1);
    }
    return { first, last, cityState };
}

function proxyConfigFromEnv() {
    const PROXY_URL = process.env.PROXY_URL || '';
    if (!PROXY_URL) return undefined;

    const u = new URL(PROXY_URL);
    return {
        server: `${u.protocol}//${u.hostname}:${u.port}`,
        username: u.username || undefined,
        password: u.password || undefined,
    };
}

async function run() {
    const { first, last, cityState } = parseArgs();
    const proxy = proxyConfigFromEnv();
    const headless = !process.env.HEADFUL;

    const browser = await chromium.launch({
        headless,
        proxy,
        args: ['--ignore-certificate-errors'], // fix for Nimble MITM certs
    });

    const context = await browser.newContext({
        ignoreHTTPSErrors: true, // <- critical fix for ERR_CERT_AUTHORITY_INVALID
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        viewport: { width: 1320, height: 900 },
        locale: 'en-US',
    });

    const page = await context.newPage();

    // 1. Build FTN search URL
    const searchUrl = buildSearchUrl({
        first,
        last,
        livesText: cityState,
        base: 'https://www.familytreenow.com/search/people/results'
    });

    console.log('🔎 Navigating to:', searchUrl);

    try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (err) {
        console.error('Fatal:', err.message);
        process.exit(1);
    }

    // 2. Detect PerimeterX (PX) Challenge
    const hitPX = await page.evaluate(() => {
        try {
            if (window._pxAppId) return true;
            const txt = document.body?.innerText || '';
            return /Before we continue/i.test(txt) || /Press & Hold/i.test(txt);
        } catch { return false; }
    });

    if (hitPX) {
        console.warn('⚠️ PerimeterX challenge detected.');

        if (process.env.HEADFUL) {
            console.log('👋 Please complete the challenge in the visible browser.');
            try {
                await page.waitForFunction(() => {
                    return !window._pxAppId && !/Before we continue/i.test(document.body.innerText);
                }, { timeout: 180000 });
            } catch {
                console.warn('⏳ Waited 3 minutes but challenge not cleared. Exiting.');
                await browser.close();
                process.exit(2);
            }
        } else {
            const dump = `px_block_${Date.now()}.html`;
            fs.writeFileSync(dump, await page.content(), 'utf8');
            console.error(`🚫 PX challenge present. Saved page to ${dump}`);
            await browser.close();
            process.exit(42);
        }
    }

    // 3. Get page content and pick best card
    const html = await page.content();
    const res = await pickBest(html, cityState, first, last);

    if (!res?.best?.detailUrl) {
        console.warn('❌ No detail URL found by pickBest(). Exiting.');
        const fallback = `ftn_noresult_${Date.now()}.html`;
        fs.writeFileSync(fallback, html, 'utf8');
        console.error('Saved raw HTML to:', fallback);
        await browser.close();
        process.exit(3);
    }

    const best = res.best;
    console.log('✅ Best match:', {
        name: best.nameText || `${first} ${last}`,
        livesIn: best.livesText,
        detailUrl: best.detailUrl,
        score: Number(best.score.toFixed(3)),
        distance_km: isFinite(best.km) ? Number(best.km.toFixed(1)) : null,
    });

    // 4. Navigate to detail page (safe route)
    try {
        const detailUrl = best.detailUrl.startsWith('http')
            ? best.detailUrl
            : new URL(best.detailUrl, 'https://www.familytreenow.com').href;

        console.log('➡️ Navigating to detail page:', detailUrl);
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Optional: dump to file for further processing
        if (process.env.DUMP_HTML) {
            const outPath = path.resolve(process.env.DUMP_HTML);
            fs.writeFileSync(outPath, await page.content(), 'utf8');
            console.log('📝 Wrote final detail page to:', outPath);
        } else {
            console.log('✅ Reached detail page:', page.url());
        }

    } catch (err) {
        console.error('❌ Error navigating to detail page:', err.message);
        const errorDump = `ftn_detail_fail_${Date.now()}.html`;
        fs.writeFileSync(errorDump, await page.content(), 'utf8');
        console.log('Saved fallback HTML to:', errorDump);
    }

    if (headless) {
        await browser.close();
    } else {
        console.log('👀 HEADFUL mode active — press Ctrl+C to quit manually');
    }
}

run().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
