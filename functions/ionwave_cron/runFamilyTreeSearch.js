// runFamilyTreeWithProxy.js  (CommonJS)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { Solver } = require('@2captcha/captcha-solver'); // npm i @2captcha/captcha-solver
const TARGET = process.env.TARGET_URL || 'https://www.familytreenow.com/search/genealogy/results?first=Emily&last=Fung&citystatezip=Plano,+TX';
const RAW_PROXY = process.argv[2] || process.env.PROXY_LINE || ''; // raw generator line
const TWO_KEY = process.env.TWOCAPTCHA_API_KEY || '';
const OUT_STATE = path.resolve(process.cwd(), 'ftn_storage.json');
const OUT_SCREEN = path.resolve(process.cwd(), 'ftn_result.png');

function normalizeProxy(raw) {
    if (!raw) return null;
    raw = raw.trim();
    // common generator formats we have seen:
    // http://host:port:username:password
    // http://username:password@host:port
    // host:port:username:password
    // socks5://username:password@host:port
    let m = raw.match(/^(socks5|http|https):\/\/([^@]+)@([^:]+):(\d+)$/i);
    if (m) {
        const proto = m[1].toLowerCase();
        const [username, password] = m[2].split(':');
        return { proto, host: m[3], port: Number(m[4]), username, password };
    }
    m = raw.match(/^([^:\/]+):(\d+):([^:]+):([^:]+)$/);
    if (m) return { proto: 'http', host: m[1], port: Number(m[2]), username: m[3], password: m[4] };
    m = raw.match(/^([^:]+):([^@]+)@([^:]+):(\d+)$/);
    if (m) return { proto: 'http', username: m[1], password: m[2], host: m[3], port: Number(m[4]) };
    // fallback attempt for username:password@host:port or host:port
    m = raw.match(/^([^@]+)@([^:]+):(\d+)$/);
    if (m) {
        const [username, password] = m[1].split(':');
        return { proto: 'http', host: m[2], port: Number(m[3]), username, password };
    }
    // try host:port
    m = raw.match(/^([^:]+):(\d+)$/);
    if (m) return { proto: 'http', host: m[1], port: Number(m[2]) };
    throw new Error('Unrecognized proxy format: ' + raw);
}

async function trySolver(payload, solver, solverProxyString) {
    // payload for Turnstile: { type: 'TurnstileTaskProxyless' | 'TurnstileTask', websiteKey, websiteURL, ... }
    // solver.solve may accept different shapes; try a couple of variants.
    try {
        console.log('Solver: submitting payload:', Object.assign({}, payload, { websiteKey: payload.websiteKey, websiteURL: payload.websiteURL }));
        const res = await solver.solve(payload);
        // library sometimes returns object with data/token fields
        if (!res) throw new Error('Empty solver response');
        if (typeof res === 'string') return res;
        if (res.token) return res.token;
        if (res.data) return res.data;
        // sometimes nested
        if (res.solution) return res.solution || res.solution?.gRecaptchaResponse;
        return JSON.stringify(res).slice(0, 1000);
    } catch (err) {
        throw err;
    }
}

(async () => {
    console.log('Target URL:', TARGET);
    let proxy = null;
    try {
        proxy = RAW_PROXY ? normalizeProxy(RAW_PROXY) : null;
    } catch (e) {
        console.warn('Proxy string parse failed:', e.message);
        proxy = null;
    }

    if (proxy) console.log('Proxy normalized:', proxy);
    else console.log('No proxy provided (running without proxy). Set PROXY_LINE or pass raw proxy as first argument to use proxy.');

    // Build Playwright proxy options if proxy provided
    const playwrightProxy = proxy && proxy.host && proxy.port ? {
        server: (proxy.proto === 'socks5' ? `socks5://${proxy.host}:${proxy.port}` : `http://${proxy.host}:${proxy.port}`),
        username: proxy.username,
        password: proxy.password
    } : undefined;

    if (playwrightProxy) console.log('Playwright proxy server:', playwrightProxy.server, 'username:', playwrightProxy.username ? 'yes' : 'no');

    // Launch browser (visible)
    const context = await chromium.launchPersistentContext(path.resolve('./ftn-profile'), {
        headless: false,
        proxy: playwrightProxy,
        args: ['--ignore-certificate-errors'],
    });

    const page = await context.newPage();
    page.on('console', (m) => {
        try { console.log('PAGE>', m.text()); } catch (e) {}
    });
    page.on('framenavigated', (frame) => console.log('⚠️ Frame navigated:', frame.url()));

    try {
        await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(1000);

        // Try to detect a Turnstile widget - it might be in an iframe or on page - we'll attempt to hook window.turnstile.render
        console.log('Looking for Turnstile... (will poll for up to 12s)');
        const payload = await page.evaluate(() => new Promise((resolve) => {
            // If widget was already rendered, try to hook
            if (window.turnstile && window.turnstile.render) {
                try {
                    const orig = window.turnstile.render;
                    window.turnstile.render = (a, b) => {
                        try {
                            window.tsCallback = b.callback;
                        } catch (e) {}
                        resolve({ sitekey: b.sitekey, action: b.action, page: window.location.href });
                        return 'hooked';
                    };
                } catch (e) {
                    // ignore
                }
            }
            // Poll for it (in case it appears later)
            let attempts = 0;
            const i = setInterval(() => {
                attempts++;
                if (window.turnstile && window.turnstile.render) {
                    clearInterval(i);
                    try {
                        window.turnstile.render = (a, b) => {
                            try {
                                window.tsCallback = b.callback;
                            } catch (e) {}
                            resolve({ sitekey: b.sitekey, action: b.action, page: window.location.href });
                            return 'hooked';
                        };
                    } catch (e) {
                        resolve(null);
                    }
                } else if (attempts > 240) { // ~12s
                    clearInterval(i);
                    resolve(null);
                }
            }, 50);
        }));

        if (!payload || !payload.sitekey) {
            console.warn('No Turnstile sitekey detected. Page might not require challenge or it is inside an inaccessible iframe. Saving artifacts and exiting.');
            await page.screenshot({ path: OUT_SCREEN, fullPage: true });
            await context.storageState({ path: OUT_STATE });
            console.log('Saved screenshot ->', OUT_SCREEN);
            console.log('Saved storage ->', OUT_STATE);
            return;
        }

        console.log('Detected Turnstile sitekey:', payload.sitekey, 'page:', payload.page);

        // prepare solver if key present
        if (!TWO_KEY) {
            console.warn('TWOCAPTCHA_API_KEY not set. Will pause for manual solve in visible browser. Press ENTER in terminal after you complete the challenge to save state.');
            // wait for user input
            process.stdin.resume();
            await new Promise((resolve) => {
                process.stdin.once('data', () => {
                    process.stdin.pause();
                    resolve();
                });
            });
            await page.screenshot({ path: OUT_SCREEN, fullPage: true });
            await context.storageState({ path: OUT_STATE });
            console.log('Saved screenshot ->', OUT_SCREEN);
            console.log('Saved storage ->', OUT_STATE);
            return;
        }

        // create solver client
        const solver = new Solver(TWO_KEY);

        // try proxyless Turnstile first (sometimes works)
        let token = null;
        const tryVariants = [];

        // First variant: proxy-enabled TurnstileTask using the same proxy as the browser (preferred)
        if (proxy && proxy.username && proxy.password) {
            const solverProxyString = (proxy.proto === 'socks5')
                ? `socks5://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
                : `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
            tryVariants.push({
                type: 'TurnstileTask',
                websiteKey: payload.sitekey,
                websiteURL: payload.page,
                proxy: solverProxyString,
            });
        }

        // Second: TurnstileTaskProxyless (no proxy)
        tryVariants.push({
            type: 'TurnstileTaskProxyless',
            websiteKey: payload.sitekey,
            websiteURL: payload.page,
        });

        // Third: fallback shape some libs accept
        tryVariants.push({
            type: 'TurnstileTask',
            websiteKey: payload.sitekey,
            websiteURL: payload.page,
        });

        console.log('Attempting solver with', tryVariants.length, 'variant(s).');

        for (const v of tryVariants) {
            try {
                console.log('Solver attempt with payload type:', v.type, v.proxy ? '(with proxy)' : '(proxyless)');
                token = await trySolver(v, solver, v.proxy);
                if (token) {
                    console.log('Solver succeeded (token length):', String(token).length);
                    break;
                }
            } catch (err) {
                console.warn('Solver attempt failed:', err && err.message ? err.message : err);
            }
        }

        if (!token) {
            console.warn('All automatic solver attempts failed. Falling back to manual solve: please complete the challenge in the visible browser and press ENTER here.');
            process.stdin.resume();
            await new Promise((resolve) => {
                process.stdin.once('data', () => {
                    process.stdin.pause();
                    resolve();
                });
            });
            await page.screenshot({ path: OUT_SCREEN, fullPage: true });
            await context.storageState({ path: OUT_STATE });
            console.log('Saved screenshot ->', OUT_SCREEN);
            console.log('Saved storage ->', OUT_STATE);
            return;
        }

        console.log('Got token (truncated):', String(token).slice(0, 16) + '...');

        // inject token and call callback if available
        try {
            await page.evaluate((t) => {
                try {
                    const h = document.querySelector('input[name="cf-turnstile-response"]');
                    if (h) h.value = t;
                } catch (e) {}
                try {
                    if (window.tsCallback && typeof window.tsCallback === 'function') {
                        window.tsCallback(t);
                        return;
                    }
                } catch (e) {}
                // fallback: try to find form and submit
                try {
                    const forms = document.getElementsByTagName('form');
                    if (forms && forms.length) {
                        try {
                            forms[0].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                        } catch (e) {}
                    }
                } catch (e) {}
            }, token);
        } catch (err) {
            console.warn('Injection failed:', err && err.message ? err.message : err);
        }

        // give Cloudflare a few seconds to validate and redirect
        await page.waitForTimeout(4000);

        // save screenshot + storage
        await page.screenshot({ path: OUT_SCREEN, fullPage: true });
        await context.storageState({ path: OUT_STATE });

        console.log('✅ Done. Saved screenshot ->', OUT_SCREEN);
        console.log('✅ Saved storage state ->', OUT_STATE);
    } catch (err) {
        console.error('Flow error:', err && err.message ? err.message : err);
        try {
            await page.screenshot({ path: OUT_SCREEN, fullPage: true });
            await context.storageState({ path: OUT_STATE });
            console.log('Saved artifacts despite error.');
        } catch (e) {}
    } finally {
        console.log('Browser left open for inspection. Close manually when done.');
    }
})();
