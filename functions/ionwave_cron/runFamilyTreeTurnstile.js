// runFamilyTreeTurnstile.js (CommonJS)
// Usage:
//   PROXY_LINE="http://user:pass@host:port" TWOCAPTCHA_API_KEY=xxx node runFamilyTreeTurnstile.js
// Or set PROXY_FILE to a list and adapt rotation logic (this file uses PROXY_LINE for simplicity)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { Solver } = require('@2captcha/captcha-solver');
const axios = require('axios');

const TARGET = process.env.TARGET_URL || 'https://www.familytreenow.com/search/genealogy/results?first=Lauren&last=Stevens&citystatezip=Plano,+TX';
const PROXY_LINE = process.argv[2] || process.env.PROXY_LINE || '';
const TWO_KEY = process.env.TWOCAPTCHA_API_KEY || process.env.TWOCAPTCHA || '';
const OUT_STATE = path.resolve(process.cwd(), 'ftn_storage.json');
const OUT_SCREEN = path.resolve(process.cwd(), 'ftn_result.png');

function normalizeProxy(raw) {
    if (!raw) return null;
    raw = raw.trim();
    // support http(s)://user:pass@host:port and socks5://user:pass@host:port
    let m = raw.match(/^(https?|http|socks5):\/\/([^@]+)@([^:\/]+):(\d+)$/i);
    if (m) {
        const proto = m[1].toLowerCase();
        const [username, password] = m[2].split(':');
        return { proto, host: m[3], port: Number(m[4]), username, password };
    }
    // user:pass@host:port (no scheme)
    m = raw.match(/^([^:]+):([^@]+)@([^:]+):(\d+)$/);
    if (m) return { proto: 'http', username: m[1], password: m[2], host: m[3], port: Number(m[4]) };
    // host:port:user:pass
    m = raw.match(/^([^:]+):(\d+):([^:]+):([^:]+)$/);
    if (m) return { proto: 'http', host: m[1], port: Number(m[2]), username: m[3], password: m[4] };
    // host:port
    m = raw.match(/^([^:]+):(\d+)$/);
    if (m) return { proto: 'http', host: m[1], port: Number(m[2]) };
    throw new Error('Unrecognized proxy format: ' + raw);
}

async function checkExitIp(proxy) {
    try {
        if (!proxy) return null;
        // axios proxy config
        const proxyCfg = proxy.username ? {
            host: proxy.host, port: proxy.port, protocol: (proxy.proto === 'https' ? 'https' : 'http'),
            auth: { username: proxy.username, password: proxy.password }
        } : { host: proxy.host, port: proxy.port, protocol: (proxy.proto === 'https' ? 'https' : 'http') };

        const r = await axios.get('https://ipinfo.io/json', { proxy: proxyCfg, timeout: 12000 });
        return r.data;
    } catch (err) {
        return { error: err.message || String(err) };
    }
}

async function main() {
    console.log('Target:', TARGET);
    let proxy = null;
    try {
        proxy = PROXY_LINE ? normalizeProxy(PROXY_LINE) : null;
    } catch (e) {
        console.warn('Proxy parse failed:', e.message);
        proxy = null;
    }

    if (proxy) console.log('Using proxy:', proxy.host + ':' + proxy.port, 'username?', !!proxy.username);
    else console.log('No proxy provided; running direct (risky for FTN).');

    if (proxy) {
        console.log('Probing exit IP via ipinfo...');
        const info = await checkExitIp(proxy);
        console.log('Exit probe:', info && info.error ? ('ERROR: ' + info.error) : info);
    }

    // solver
    const solver = TWO_KEY ? new Solver(TWO_KEY) : null;
    if (!solver) {
        console.warn('TWOCAPTCHA_API_KEY not set. The script will still hook turnstile and allow manual fallback.');
    }

    // userAgent + profile dir uniqueness (use new profile each run)
    const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
    const PROFILE_DIR = path.resolve(`./ftn-profile-${Date.now()}`);

    // Launch chromium (headful for manual fallback)
    const launchArgs = ['--ignore-certificate-errors', '--disable-dev-shm-usage', '--no-sandbox'];
    const launchOptions = { headless: false, args: launchArgs };

    // create proxy settings for Playwright based on normalized proxy object
    let contextProxy = undefined;
    if (proxy && proxy.host && proxy.port) {
        const server = (proxy.proto === 'socks5') ? `socks5://${proxy.host}:${proxy.port}` : `http://${proxy.host}:${proxy.port}`;
        contextProxy = { server, username: proxy.username, password: proxy.password };
    }

    console.log('Launching browser...');
    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({
        userAgent: UA,
        viewport: { width: 1366, height: 768 },
        locale: 'en-US',
        timezoneId: 'America/Chicago',
        proxy: contextProxy,
        ignoreHTTPSErrors: true
    });

    // Add init script before any page script runs: hook/override turnstile.render
    await context.addInitScript(() => {
        // run in page context
        (function installTurnstileHook() {
            // this code runs before the page scripts load
            const i = setInterval(() => {
                try {
                    if (window.turnstile && typeof window.turnstile.render === 'function') {
                        clearInterval(i);
                        const original = window.turnstile.render.bind(window.turnstile);
                        window.turnstile.render = function(container, b) {
                            try {
                                // Save the important payload for Node to read later
                                const payload = {
                                    sitekey: b.sitekey || null,
                                    cData: (b.cData !== undefined) ? b.cData : null,
                                    chlPageData: (b.chlPageData !== undefined) ? b.chlPageData : null,
                                    action: b.action || null,
                                    // store UA for reference; real UA will be used when contacting solver
                                };
                                // expose callback function and payload
                                try { window.__turnstile_callback = b.callback; } catch (e) { window.__turnstile_callback = null; }
                                try { window.__turnstile_payload = payload; } catch (e) {}
                            } catch (e) {
                                try { window.__turnstile_hook_error = String(e); } catch (_) {}
                            }
                            // call original render so widget still works as normal
                            try { return original(container, b); } catch (err) { return 'render-hooked'; }
                        };
                    } else if (window.turnstile && typeof window.turnstile.render === 'undefined') {
                        // if turnstile object exists but render undefined, still wrap it
                        window.turnstile.render = function() { return 'render-hooked'; };
                    }
                } catch (e) {
                    // swallow
                }
            }, 10);

            // also fallback in case page replaced turnstile later: keep small safety timeout
            setTimeout(() => { try { if (!window.__turnstile_payload) window.__turnstile_hook_timeout = true; } catch(e) {} }, 20000);
        })();
    });

    const page = await context.newPage();
    // Give the page some time for fonts / features
    page.setDefaultNavigationTimeout(60000);

    console.log('Navigating to target...');
    try {
        await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
    } catch (e) {
        console.warn('Initial goto warning:', e.message || e);
    }

    // wait up to ~18 seconds for the turnstile hook to capture payload
    let payload = null;
    try {
        await page.waitForFunction(() => !!window.__turnstile_payload || !!window.__turnstile_hook_timeout, { timeout: 18000 });
        payload = await page.evaluate(() => window.__turnstile_payload || null);
        const hookErr = await page.evaluate(() => window.__turnstile_hook_error || null);
        if (hookErr) console.warn('turnstile hook error reported in page:', hookErr);
    } catch (e) {
        console.warn('No turnstile payload observed within timeout.');
    }

    if (!payload || !payload.sitekey) {
        console.log('No Turnstile widget sitekey captured by hook. Page may have a different challenge type or be inside an iframe.');
        // Save artifacts for inspection
        await page.screenshot({ path: OUT_SCREEN, fullPage: true }).catch(()=>{});
        await context.storageState({ path: OUT_STATE }).catch(()=>{});
        console.log('Saved screenshot and storage to inspect.');
        console.log('Leaving browser open for manual solve. After solving press CTRL+C to exit or close browser.');
        return;
    }

    console.log('Captured Turnstile payload:', payload);

    // Build solver payload for 2captcha
    if (!solver) {
        console.warn('No solver configured. Leaving browser open for manual solve. Press ENTER in terminal to capture storageState when finished.');
        await new Promise((resolve) => {
            process.stdin.resume();
            process.stdin.once('data', () => {
                process.stdin.pause();
                resolve();
            });
        });
        await page.screenshot({ path: OUT_SCREEN, fullPage: true }).catch(()=>{});
        await context.storageState({ path: OUT_STATE }).catch(()=>{});
        console.log('Saved manual state.');
        return;
    }

    // Build solver options; challenge page requires cData and chlPageData ideally
    // Build the payload object for 2captcha's TurnstileTask (if we have cData/chlPageData)
    const solverProxyStr = proxy && proxy.username ? (proxy.proto === 'socks5'
        ? `socks5://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
        : `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`) : null;

    // Prefer TurnstileTask with proxy when we have proxy info; fallback to proxyless
    const attempts = [];
    if (solverProxyStr) {
        attempts.push({
            type: 'TurnstileTask', // proxy-enabled
            websiteKey: payload.sitekey,
            websiteURL: page.url(),
            data: payload.cData || null,
            pagedata: payload.chlPageData || null,
            action: payload.action || null,
            userAgent: await page.evaluate(() => navigator.userAgent),
            proxy: solverProxyStr
        });
    }
    // Add proxyless variant
    attempts.push({
        type: 'TurnstileTaskProxyless',
        websiteKey: payload.sitekey,
        websiteURL: page.url(),
        data: payload.cData || null,
        pagedata: payload.chlPageData || null,
        action: payload.action || null,
        userAgent: await page.evaluate(() => navigator.userAgent),
    });

    let token = null;
    for (const task of attempts) {
        try {
            console.log('Submitting to solver attempt:', task.type, task.proxy ? '(with proxy)' : '(proxyless)');
            const solved = await solver.solve(task);
            // library may return { data: 'token' } or string/token directly
            if (!solved) throw new Error('empty solver response');
            token = (typeof solved === 'string') ? solved : (solved.data || solved.token || (solved.solution && solved.solution.gRecaptchaResponse));
            if (token) {
                console.log('Solver returned token (truncated):', String(token).slice(0,30) + '...');
                break;
            }
        } catch (err) {
            console.warn('Solver attempt failed:', err && err.message ? err.message : err);
        }
    }

    if (!token) {
        console.warn('Solver did not produce a token. Leaving browser open for manual solve. When done press ENTER to save state.');
        await new Promise((resolve) => {
            process.stdin.resume();
            process.stdin.once('data', () => {
                process.stdin.pause();
                resolve();
            });
        });
        await page.screenshot({ path: OUT_SCREEN, fullPage: true }).catch(()=>{});
        await context.storageState({ path: OUT_STATE }).catch(()=>{});
        console.log('Saved manual artifacts.');
        return;
    }

    // Inject token into page & call the callback
    try {
        await page.evaluate((t) => {
            try {
                // set hidden input value if present
                const hidden = document.querySelector('input[name="cf-turnstile-response"], input[name="g-recaptcha-response"]');
                if (hidden) hidden.value = t;
            } catch (e) {}
            try {
                if (window.__turnstile_callback && typeof window.__turnstile_callback === 'function') {
                    // call the callback defined inside the widget
                    try { window.__turnstile_callback(t); return; } catch (ee) {}
                }
            } catch (ee) {}
            // fallback: try to submit a form
            try {
                const f = document.querySelector('form');
                if (f) f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            } catch (e) {}
        }, token);

        // Give Cloudflare/FTN time to validate
        await page.waitForTimeout(4000);
        // Save artifacts
        await page.screenshot({ path: OUT_SCREEN, fullPage: true }).catch(()=>{});
        await context.storageState({ path: OUT_STATE }).catch(()=>{});
        console.log('Saved screenshot and storage state:', OUT_SCREEN, OUT_STATE);
        console.log('If page still blocked, try a different proxy/ASN or manual solve and capture cookies.');
    } catch (e) {
        console.error('Inject token error:', e && e.message ? e.message : e);
    } finally {
        console.log('Browser left open for inspection. Close when done.');
    }
}

main().catch((err) => {
    console.error('Fatal error:', err && err.stack ? err.stack : err);
    process.exit(1);
});
