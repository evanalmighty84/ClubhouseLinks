// familyTreeNowLookup.js — Playwright “on top of” your realtime renderer
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { chromium } = require('playwright');
const OpenAI = require('openai');

/* =======================
   Config
   ======================= */
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS || 45000);
const STEALTH_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const FTL_HOME = 'https://www.familytreenow.com/';

const REALTIME_API_URL =
    process.env.REALTIME_API_URL || 'https://api.webit.live/api/v1/realtime/web';
const REALTIME_API_TOKEN = process.env.TOKEN || ''; // <-- your base64 token
const SESSION = process.env.RT_SESSION || ('ftn-' + Math.random().toString(36).slice(2, 10));

/* =======================
   Optional OpenAI city infer
   ======================= */
const OPENAI_DIRECT = process.env.OPENAI_DIRECT === '1';
const openai = (() => {
    if (!process.env.OPENAI_API_KEY) return null;
    const cfg = { apiKey: process.env.OPENAI_API_KEY };
    // If you want to proxy OpenAI later, wire an undici ProxyAgent here.
    return new OpenAI(cfg);
})();

async function inferCityWithGPT({ neighborhood, baseCity, state }) {
    if (!openai || !neighborhood || !state) return '';
    try {
        const system = [
            "You are a concise geocoding assistant.",
            "Given a neighborhood name, a base city, and a US state abbreviation, determine the single most likely city (within that state) that the neighborhood belongs to or is adjacent to.",
            "If you are confident, return ONLY the city name (proper case, no state).",
            "If unsure, return an empty string."
        ].join(' ');

        const user = JSON.stringify({
            neighborhood, baseCity, state,
            instruction: "Return only the city name (e.g., 'Allen'). If unsure, return an empty string."
        });

        const resp = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
        });

        let answer = (resp.choices?.[0]?.message?.content || '').trim();
        answer = answer.replace(/[^A-Za-z.\-'\s]/g, '').trim();
        if (!answer || answer.split(/\s+/).length > 4) return '';
        return answer;
    } catch (e) {
        console.error('GPT city inference failed:', e?.message || e);
        return '';
    }
}

/* =======================
   Utils
   ======================= */
function headers(ref = 'https://www.familytreenow.com/') {
    return {
        'User-Agent': STEALTH_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Referer': ref,
        'DNT': '1',
    };
}

function fmtCityState({ city, state }) {
    if (!city) return (state || '').trim();
    const st = (state || '').trim();
    const c = String(city).trim();
    return st ? `${c}, ${st}` : c;
}

function looksLikeStateInText(text, stateAbbr) {
    if (!text || !stateAbbr) return false;
    const T = text.toUpperCase();
    const S = stateAbbr.toUpperCase();
    return (
        T.includes(` ${S} `) ||
        T.endsWith(` ${S}`) ||
        T.includes(`(${S})`) ||
        T.includes(`, ${S}`) ||
        T.includes(`- ${S}`)
    );
}

function cityVariants(cityStateZip) {
    if (!cityStateZip) return [];
    const v1 = cityStateZip;                    // "Plano, TX"
    const v2 = cityStateZip.replace(',', '');   // "Plano TX"
    const parts = cityStateZip.split(',');
    const v3 = parts[1] ? parts[1].trim() : cityStateZip; // "TX"
    return Array.from(new Set([v1, v2, v3].filter(Boolean)));
}

/* =======================
   Humanization helpers
   ======================= */
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function hpause(min=120, max=260) {
    const ms = Math.round(min + Math.random() * (max - min));
    await sleep(ms);
}
async function humanType(page, selector, text) {
    const el = page.locator(selector).first();
    await el.click({ timeout: NAV_TIMEOUT_MS });
    await el.fill(''); await hpause(150, 300);
    for (const ch of String(text).split('')) {
        await page.keyboard.type(ch, { delay: 40 + Math.floor(Math.random()*80) });
        if (Math.random() < 0.08) await hpause(80, 180);
    }
}

/* =======================
   Realtime renderer bridge
   ======================= */
async function scraperApiCall(url, tag = 'scraperApi') {
    const apiKey = process.env.SCRAPERAPI_KEY;

    if (!apiKey || !url) {
        console.warn('❌ SCRAPERAPI_KEY or URL missing.');
        return null;
    }

    try {
        const scraperUrl = `http://api.scraperapi.com/?api_key=${apiKey}&render=true&country_code=us&url=${encodeURIComponent(url)}`;

        console.log(`🌐 [${tag}] ScraperAPI requesting:`, url);
        const res = await axios.get(scraperUrl, {
            timeout: 60000,
            headers: {
                'User-Agent': STEALTH_UA,
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.familytreenow.com',
            }
        });

        const html = res.data;
        console.log(`📥 [${tag}] ScraperAPI HTML length:`, html?.length);
        return { html_content: html };
    } catch (err) {
        console.error(`❌ [${tag}] ScraperAPI failed:`, err.message || err);
        return null;
    }
}



async function rtLoad(page, url, ref = 'https://www.familytreenow.com/') {
    const data = await scraperApiCall(url, 'rtLoad');
    const html = data?.html_content || '';

    if (!html) return false;

    const origin = new URL(url).origin + '/';
    const withBase = html.includes('<base ')
        ? html
        : html.replace('<head>', `<head><base href="${origin}">`);

    await page.setContent(withBase, { waitUntil: 'domcontentloaded' });
    await page.evaluate((u) => {
        try { history.replaceState(null, '', u); } catch {}
    }, url);

    try { fs.writeFileSync('ftn_last.html', withBase, 'utf8'); } catch {}
    return true;
}


async function wireRtNavigation(page) {
    // Let the page tell Node to navigate via the renderer
    await page.exposeFunction('__rtNavigate', async (url) => {
        const current = await page.evaluate(() => location.href);
        return rtLoad(page, url, current);
    });

    // Intercept link clicks & form submits
    await page.addInitScript(() => {
        window.addEventListener('click', (e) => {
            const a = e.target && e.target.closest && e.target.closest('a[href]');
            if (!a) return;
            const href = a.getAttribute('href');
            if (!href) return;
            const url = new URL(href, location.href).toString();
            if (url.includes('familytreenow.com')) {
                e.preventDefault();
                // eslint-disable-next-line no-undef
                window.__rtNavigate(url);
            }
        }, true);

        window.addEventListener('submit', (e) => {
            const form = e.target;
            if (!form || !(form instanceof HTMLFormElement)) return;
            e.preventDefault();
            const action = form.getAttribute('action') || location.href;
            const method = (form.getAttribute('method') || 'GET').toUpperCase();
            const fd = new FormData(form);
            const usp = new URLSearchParams(fd);
            let url = new URL(action, location.href);
            if (method === 'GET') {
                for (const [k,v] of usp.entries()) url.searchParams.set(k, v);
                // eslint-disable-next-line no-undef
                window.__rtNavigate(url.toString());
            } else {
                // For POST we degrade to GET (FTN search uses GET anyway)
                for (const [k,v] of usp.entries()) url.searchParams.set(k, v);
                // eslint-disable-next-line no-undef
                window.__rtNavigate(url.toString());
            }
        }, true);
    });
}

/* =======================
   Core flow “on top” of renderer
   ======================= */
async function submitSearchHumanOnTop(page, { first, last, cityStateZip }) {
    const variants = cityVariants(cityStateZip?.length ? cityStateZip : '') || [''];

    for (let i = 0; i < Math.max(1, variants.length); i++) {
        const v = variants[i] || '';

        // Always load fresh home via renderer
        if (!(await rtLoad(page, FTL_HOME))) return false;
        await hpause(300, 700);
        await wireRtNavigation(page);

        // gentle mouse/scroll
        await page.mouse.move(80 + Math.random()*100, 130 + Math.random()*80);
        await page.mouse.wheel(0, 200 + Math.random()*200);
        await hpause(200, 400);

        // type fields
        await humanType(page, '#First', first || '');
        await hpause(120, 220);
        await humanType(page, '#Last',  last  || '');
        await hpause(120, 220);
        if (v) await humanType(page, '#CityStateZip', v);

        await hpause(220, 480);

        // Build the exact GET URL FTN expects and navigate via renderer
        const url = await page.evaluate(() => {
            const first = document.querySelector('#First')?.value || '';
            const last  = document.querySelector('#Last')?.value  || '';
            const csz   = document.querySelector('#CityStateZip')?.value || '';
            const u = new URL('/search/genealogy/results', 'https://www.familytreenow.com');
            if (first) u.searchParams.set('first', first);
            if (last)  u.searchParams.set('last',  last);
            if (csz)   u.searchParams.set('citystatezip', csz);
            return u.toString();
        });

        const ok = await page.evaluate(async (u) => {
            // eslint-disable-next-line no-undef
            return await window.__rtNavigate(u);
        }, url);
        // Just navigated to search results — check for CAPTCHA
        await page.waitForTimeout(2000); // small buffer

        const isCaptcha = await page.evaluate(() => {
            const text = document.body.innerText || '';
            const title = document.title || '';
            return (
                title.toLowerCase().includes('robot') ||
                text.toLowerCase().includes('are you human') ||
                text.toLowerCase().includes('please verify') ||
                text.toLowerCase().includes('recaptcha') ||
                !!document.querySelector('iframe[src*="recaptcha"]')
            );
        });

        if (isCaptcha) {
            console.log('🚧 CAPTCHA detected — please solve it manually in the browser...');
            console.log('🕒 Waiting for manual solve. Press ENTER here when ready.');

            await new Promise((resolve) => {
                process.stdin.resume();
                process.stdin.once('data', () => resolve());
            });

            console.log('✅ CAPTCHA cleared. Continuing automation...');
        }


        if (!ok) {
            await hpause(1000, 1600);
            continue; // try next variant
        }

        // Save for debug
        try { fs.writeFileSync('ftn_search.html', await page.content(), 'utf8'); } catch {}

        // If this page is JSON (rare via renderer), retry variant
        const isJson = await page.evaluate(() => (document.contentType || '').includes('json') ||
            document.body?.innerText?.includes('"msg":"something went wrong"'));
        if (!isJson) return true;

        await hpause(900, 1500);
    }
    return false;
}

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
        await hpause(500, 900);
        // “reload” from current URL via renderer
        const cur = await page.evaluate(() => location.href);
        await rtLoad(page, cur);
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
        if (!pref || looksLikeStateInText(text, pref)) {
            // pick detail href
            const href = await row.locator(
                'a:has-text("View"), a:has-text("Details"), a:has-text("Profile"), a[href*="detail"], a[href*="profile"], a[href*="/record/"]'
            ).first().getAttribute('href').catch(()=>null);

            if (href) {
                const url = new URL(href, await page.evaluate(() => location.href)).toString();
                const ok = await page.evaluate(async (u) => {
                    // eslint-disable-next-line no-undef
                    return await window.__rtNavigate(u);
                }, url);
                if (ok) return true;
            }
        }
    }

    // fallback: try first row
    const firstHref = await results.first().locator('a[href]').first().getAttribute('href').catch(()=>null);
    if (firstHref) {
        const url = new URL(firstHref, await page.evaluate(() => location.href)).toString();
        const ok = await page.evaluate(async (u) => {
            // eslint-disable-next-line no-undef
            return await window.__rtNavigate(u);
        }, url);
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

/* =======================
   Public API
   ======================= */
async function familyTreeNowSearchAndScrape(_browser, { first, last, baseCity='', state='', neighborhood='', city='' }) {
    const userDataDir = process.env.ND_PROFILE_DIR || path.join(os.tmpdir(), 'nd-ftn-profile');

    const out = {
        phone: null,
        email: null,
        physical_address: null,
        resolvedCity: null,
    };

    // Step 1: Optional city inference using GPT
    let resolvedCity = city;
    if (!resolvedCity) {
        console.log('🤖 Inferring city from neighborhood/state...');
        resolvedCity = await inferCityWithGPT({
            neighborhood: String(neighborhood || '').trim(),
            baseCity: String(baseCity || '').trim(),
            state: String(state || '').trim().toUpperCase()
        });
        if (!resolvedCity && baseCity) resolvedCity = baseCity;
    }

    out.resolvedCity = resolvedCity || null;
    console.log('🔎 resolved city:', out.resolvedCity || '(none)');

    // Step 2: Launch Playwright browser
    console.log('🧭 Launching Chromium with persistent context...');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: ['--ignore-certificate-errors'],
        ignoreHTTPSErrors: true,
        userAgent: STEALTH_UA,
        locale: 'en-US',
        timezoneId: 'America/Chicago',
        viewport: { width: 1400, height: 900 },
    });

    context.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    context.setDefaultTimeout(NAV_TIMEOUT_MS);

    const page = await context.newPage();
    console.log('🧾 New page opened.');

    // Step 3: Submit search
    const cityStateZipVal = fmtCityState({ city: resolvedCity, state });
    console.log('📬 Submitting FTN search with:', { first, last, cityStateZip: cityStateZipVal });

    const ok = await submitSearchHumanOnTop(page, {
        first,
        last,
        cityStateZip: cityStateZipVal || (state || '')
    });

    console.log('✅ Search page submitted?', ok);
    if (!ok) {
        console.warn('❌ Search failed. Closing browser.');
        await context.close();
        return out;
    }

    // Step 4: Pick and open result
    console.log('🔍 Attempting to pick and open matching record...');
    const detailOk = await pickAndOpenDetail(page, state);

    if (!detailOk) {
        console.warn('❌ No matching record opened. Closing browser.');
        await context.close();
        return out;
    }

    // Step 5: Scrape result details
    console.log('📋 Scraping contact details...');
    const detail = await scrapeDetail(page);
    Object.assign(out, detail);

    console.log('✅ Scrape complete. Closing browser...');
    await context.close();
    return out;
}

/* =======================
   CLI Runner
   ======================= */
async function runFamilyTreeNowAutomation() {
    const [,, firstArg, lastArg, stateArg, baseCityArg, neighborhoodArg] = process.argv;

    const first = firstArg || 'Isiah';
    const last = lastArg || 'Ichmel';
    const state = (stateArg || 'TX').toUpperCase();
    const baseCity = baseCityArg || 'Allen';
    const neighborhood = neighborhoodArg || 'Heritage Estates';


    try {
        console.log('🛠 Calling familyTreeNowSearchAndScrape...');
        const result = await familyTreeNowSearchAndScrape(null, {
            first, last, baseCity, state, neighborhood
        });
        console.log('✅ FamilyTreeNow result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ FamilyTreeNow test failed:', err);
        console.error(err?.stack || err);
    }


    try {
        const result = await familyTreeNowSearchAndScrape(null, {
            first, last, baseCity, state, neighborhood
        });
        console.log('✅ FamilyTreeNow result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ FamilyTreeNow test failed:', err);
    }
}

if (require.main === module) {
    if (!REALTIME_API_TOKEN) {
        console.warn('⚠️ TOKEN not set — set env TOKEN with your base64 credential.');
    }
    if (process.env.OPENAI_API_KEY) {
        console.log('OpenAI enabled (city inference).');
    } else {
        console.log('OpenAI not set — skipping city inference.');
    }
    runFamilyTreeNowAutomation();
}

module.exports = {
    familyTreeNowSearchAndScrape,
    runFamilyTreeNowAutomation,
    inferCityWithGPT,
};
