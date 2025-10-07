// stealthFamilyTree.js
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import { chromium } from 'playwright';
import { Solver } from '@2captcha/captcha-solver';
import axios from 'axios';

const solver = new Solver(process.env.TWOCAPTCHA_API_KEY || '');

const TARGET_URL = process.env.TARGET_URL || 'https://www.familytreenow.com/search/genealogy/results?first=Emily&last=Fung&citystatezip=Plano,+TX';
const OUT_STATE = process.env.OUT_STATE || 'ftn_storage.json';
const PROFILE_DIR = process.env.PROFILE_DIR || './ftn-profile';

// ---------------------- proxy parsing ----------------------
function normalizeProxy(raw) {
    if (!raw) return null;
    raw = raw.trim();
    // common forms:
    // http://user:pass@host:port
    // socks5://user:pass@host:port
    // host:port:user:pass
    // host:port:username:password
    let m = raw.match(/^(https?|http|socks5):\/\/([^@]+)@([^:\/]+):(\d+)$/i);
    if (m) {
        const proto = m[1].toLowerCase();
        const [user, pass] = m[2].split(':');
        return { proto, host: m[3], port: Number(m[4]), username: user, password: pass };
    }
    m = raw.match(/^([^:\/]+):(\d+):([^:]+):([^:]+)$/); // host:port:user:pass
    if (m) return { proto: 'http', host: m[1], port: Number(m[2]), username: m[3], password: m[4] };
    m = raw.match(/^([^:]+):([^@]+)@([^:]+):(\d+)$/); // user:pass@host:port (without scheme)
    if (m) return { proto: 'http', username: m[1], password: m[2], host: m[3], port: Number(m[4]) };
    // fallback: if it already contains "http://host:port:user:pass" style (some UIs show weird ordering)
    m = raw.match(/^(?:https?:\/\/)?([^:\/]+):(\d+):([^:]+):([^:]+)$/i);
    if (m) return { proto: 'http', host: m[1], port: Number(m[2]), username: m[3], password: m[4] };
    throw new Error('Unrecognized proxy format: ' + raw);
}

// ------------------- helper: small sleep -------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------- evaluate Turnstile payload -------------------
async function extractTurnstilePayload(page) {
    // run in page context to overwrite turnstile.render and capture the b object
    return page.evaluate(() => {
        return new Promise((resolve, reject) => {
            const maxMs = 20000;
            const t0 = Date.now();
            const interval = setInterval(() => {
                if (window.turnstile) {
                    clearInterval(interval);
                    try {
                        // override render
                        const orig = window.turnstile.render;
                        window.turnstile.render = (a, b) => {
                            try {
                                // gather payload fields similar to "TurnstileTaskProxyless"
                                const payload = {
                                    type: 'TurnstileTaskProxyless',
                                    websiteKey: b.sitekey,
                                    websiteURL: window.location.href,
                                    data: b.cData || null,
                                    pagedata: b.chlPageData || null,
                                    action: b.action || null,
                                    userAgent: navigator.userAgent || null,
                                };
                                // keep callback around for later injection
                                window.__tsCallback = b.callback;
                                resolve(payload);
                            } catch (e) {
                                reject(e);
                            }
                            // still call original render to keep page normal (optional)
                            try { return typeof orig === 'function' ? orig(a, b) : 'ok'; } catch(e) {}
                            return 'ok';
                        };
                    } catch (e) {
                        reject(e);
                    }
                } else if (Date.now() - t0 > maxMs) {
                    clearInterval(interval);
                    reject(new Error('timeout waiting for window.turnstile'));
                }
            }, 50);
        });
    });
}

// ------------------- pickAndOpenDetail + scrapeDetail (from user) -------------------
async function pickAndOpenDetail(page, state) {
    const candidates = [
        'table tbody tr',
        '.search-results .result',
        '.results .result',
        'ul.results > li',
        '.people-results li',
        '.content .result',
    ];

    const findSel = async () => {
        for (const sel of candidates) {
            if (await page.locator(sel).first().count()) return sel;
        }
        return null;
    };

    let resultsSel = await findSel();
    if (!resultsSel) {
        await sleep(500 + Math.random() * 400);
        // reload current url via renderer helper if available
        const cur = await page.evaluate(() => location.href);
        // try to use __rtNavigate if defined
        const okReload = await page.evaluate(async (u) => {
            if (window.__rtNavigate) return await window.__rtNavigate(u);
            location.href = u; return true;
        }, cur).catch(()=>false);
        // small wait
        await sleep(800);
        resultsSel = await findSel();
    }
    if (!resultsSel) return false;

    const results = page.locator(resultsSel);
    const rCount = await results.count();
    if (!rCount) return false;

    const pref = (state || '').toUpperCase();
    for (let i = 0; i < Math.min(rCount, 50); i++) {
        const row = results.nth(i);
        const text = ((await row.innerText().catch(() => '')) || '').trim();
        if (!pref || text.toUpperCase().includes(pref)) {
            // pick detail href
            const candidate = row.locator(
                'a:has-text("View"), a:has-text("Details"), a:has-text("Profile"), a[href*="detail"], a[href*="profile"], a[href*="/record/"], a[href*="/people/"]'
            ).first();
            const href = await candidate.getAttribute('href').catch(()=>null);
            if (href) {
                const url = new URL(href, await page.evaluate(() => location.href)).toString();
                const ok = await page.evaluate(async (u) => {
                    if (window.__rtNavigate) return await window.__rtNavigate(u);
                    try { window.location.href = u; return true; } catch { return false; }
                }, url).catch(()=>false);
                if (ok) return true;
            }
        }
    }

    // fallback: try first row's first link
    const firstHref = await results.first().locator('a[href]').first().getAttribute('href').catch(()=>null);
    if (firstHref) {
        const url = new URL(firstHref, await page.evaluate(() => location.href)).toString();
        const ok = await page.evaluate(async (u) => {
            if (window.__rtNavigate) return await window.__rtNavigate(u);
            try { window.location.href = u; return true; } catch { return false; }
        }, url).catch(()=>false);
        if (ok) return true;
    }
    return false;
}

async function scrapeDetail(page) {
    const out = { phone: null, email: null, physical_address: null };

    try {
        const phoneCand = [
            'a[href^="tel:"]',
            'a[href*="phone="]',
            'a:has-text("Phone")',
            'div:has(span:has-text("Phone")) a, div:has-text("Phone") a',
            'td:has-text("Phone") ~ td',
            'li:has-text("Phone")',
            '.phone, .phones a, .phones',
        ];
        for (const sel of phoneCand) {
            const el = page.locator(sel).first();
            if (await el.count()) {
                const t = (await el.innerText().catch(()=>'')) || (await el.getAttribute('href').catch(()=>'')) || '';
                const phone = t.replace(/^tel:/, '').trim();
                if (/\d{3}[-.\s)]?\d{3}[-.\s]?\d{4}/.test(phone)) { out.phone = phone; break; }
            }
        }
    } catch {}

    try {
        const emailCand = [
            'a[href^="mailto:"]',
            'a[href*="email="]',
            'a:has-text("@")',
            'td:has-text("Email") ~ td',
            'li:has-text("@")',
            '.email, .emails a, .emails',
        ];
        for (const sel of emailCand) {
            const el = page.locator(sel).first();
            if (await el.count()) {
                const t = (await el.innerText().catch(()=>'')) || (await el.getAttribute('href').catch(()=>'')) || '';
                const email = t.replace(/^mailto:/, '').trim();
                if (email.includes('@')) { out.email = email; break; }
            }
        }
    } catch {}

    try {
        const addrCand = [
            'td:has-text("Address") ~ td',
            'div:has(span:has-text("Address")) span:not(:has(*))',
            'address',
            'li:has-text("Address")',
            '[data-field="address"]',
            '.address, .addresses li, .addresses',
        ];
        for (const sel of addrCand) {
            const el = page.locator(sel).first();
            if (await el.count()) {
                const t = ((await el.innerText().catch(()=>'')) || '').trim();
                if (t && t.length > 6) { out.physical_address = t.replace(/\s*\n\s*/g, ', '); break; }
            }
        }
    } catch {}

    return out;
}

// ------------------- main -------------------
(async () => {
    const rawProxyArg = process.argv[2] || process.env.PROXY_LINE || null;
    let proxy = null;
    try { proxy = rawProxyArg ? normalizeProxy(rawProxyArg) : null; } catch (e) { console.warn('Proxy parse failed:', e.message); proxy = null; }

    console.log('TARGET:', TARGET_URL);
    if (proxy) console.log('Proxy normalized:', proxy);
    else console.log('No proxy provided (running without proxy).');

    // UA to use for context
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

    const launchOpts = { headless: false, args: ['--ignore-certificate-errors'] };
    const browser = await chromium.launch(launchOpts);

    // create context and inject __rtNavigate early
    const contextOpts = {
        userAgent: ua,
        // (optionally) viewport, locale, storageState, etc.
    };

    // apply proxy to context if given (Playwright supports context-level proxy)
    if (proxy) {
        // format server string
        const server = (proxy.proto === 'socks5') ? `socks5://${proxy.host}:${proxy.port}` : `http://${proxy.host}:${proxy.port}`;
        contextOpts.proxy = { server, username: proxy.username, password: proxy.password };
    }

    const context = await browser.newContext(contextOpts);

    // ensure init script exists before new page creation/navigation
    await context.addInitScript(() => {
        window.__rtNavigate = async function (url) {
            // resolve true on load, false on timeout/error
            return new Promise((resolve) => {
                try {
                    const to = setTimeout(() => resolve(false), 15000);
                    function onLoad() { clearTimeout(to); window.removeEventListener('load', onLoad, true); resolve(true); }
                    window.addEventListener('load', onLoad, true);
                    // force top-level navigation
                    window.location.href = url;
                } catch (e) { resolve(false); }
            });
        };
    });

    const page = await context.newPage();

    // go
    try {
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (err) {
        console.warn('Initial goto may have timed out or failed:', err.message || err);
    }

    // Wait to see if turnstile widget exists
    let payload = null;
    try {
        console.log('Waiting for Turnstile...');
        payload = await extractTurnstilePayload(page);
        console.log('Turnstile payload captured:', payload);
    } catch (e) {
        console.error('Turnstile not detected or extract failed:', e.message || e);
    }

    if (!payload) {
        console.log('No Turnstile payload — continuing (page may not require challenge).');
    } else {
        // Solve via 2Captcha
        try {
            console.log('Solving via 2Captcha...');
            const solveRes = await solver.solve(payload);
            const token = solveRes.data || solveRes; // library shape can vary
            if (!token) throw new Error('No token returned from solver');
            console.log('Got token (truncated):', String(token).slice(0, 12), '...');

            // inject token and call callback on page
            await page.evaluate((tkn) => {
                try {
                    const hiddenInput = document.querySelector('input[name="cf-turnstile-response"]');
                    if (hiddenInput) hiddenInput.value = tkn;
                    if (window.__tsCallback && typeof window.__tsCallback === 'function') {
                        // call the widget callback
                        try { window.__tsCallback(tkn); } catch (e) { /* ignore */ }
                    }
                } catch (e) {
                    // ignore page injection errors
                }
            }, token);

            // wait a bit to let verification happen
            await sleep(4000);
        } catch (err) {
            console.error('Captcha solve/inject failed:', err.message || err);
        }
    }

    // At this point the search results may be available (or page might be still blocked)
    // Try to find and click a "View Details" item
    try {
        // ensure results loaded
        await page.waitForTimeout(1500);
        const opened = await pickAndOpenDetail(page, 'TX'); // use 'TX' bias; change as needed
        if (!opened) {
            console.warn('Could not open detail page via pickAndOpenDetail; attempting fallback click on first "View Details" visible.');
            // fallback attempt: click first "View Details" button
            const btn = page.locator('a:has-text("View Details"), a:has-text("View Details")').first();
            if (await btn.count()) {
                await btn.click().catch(()=>null);
            }
        } else {
            console.log('Detail page opened.');
        }

        // wait for detail page to settle
        await page.waitForLoadState('domcontentloaded').catch(()=>null);
        await page.waitForTimeout(1200);

        const scraped = await scrapeDetail(page);
        console.log('Scraped detail:', scraped);

        // Save storage state (cookies + localStorage)
        await context.storageState({ path: OUT_STATE });
        console.log('Saved storage state to', OUT_STATE);
    } catch (err) {
        console.error('Error while opening/scraping detail:', err.message || err);
    } finally {
        // Leave browser open for inspection if you want; comment out close() during debugging
        await browser.close().catch(()=>null);
    }
})().catch((err) => {
    console.error('Fatal error:', err && err.stack ? err.stack : err);
    process.exit(1);
});
