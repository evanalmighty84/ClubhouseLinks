// nextdoorAutomationPlano.js
require('dotenv').config();
const path = require('path');
const { chromium } = require('playwright');
const OpenAI = require('openai');
const pool = require('./../../../db/db');
const fs = require('fs');





// 👉 adjust import path if needed
const { personSearchAndScrape } = require('../melissaLookup');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* =================== DISABLED: DM-related constants =================== */
// const MAX_DMS_PER_DAY = 7;
// const DM_PAUSE_MS = 1500;

const CITY = 'Plano';

const SEARCH_TERMS = [
    { label: 'Pool Cleaner',     query: 'pool cleaner',     type: 'pool',     needsMostRecent: true },
    { label: 'Pool Maintenance', query: 'pool maintenance', type: 'pool',     needsMostRecent: true }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------- Helpers: Stealth + Login ------------------------ */

async function handleChooseAddress(page) {
    if (!/\/choose_address/i.test(page.url())) return;
    try {
        await page.fill('input[placeholder*="address" i], input[name*="address"]', '1707 Hastings Court');
        await page.fill('input[placeholder*="zip" i], input[name*="zip"]', '75023');

        const nextBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
        if (await nextBtn.count()) {
            await Promise.all([page.waitForLoadState('domcontentloaded'), nextBtn.click()]);
        }

        const confirm = page.locator('button:has-text("Confirm neighborhood"), button:has-text("Join")').first();
        if (await confirm.count()) {
            await Promise.all([page.waitForLoadState('domcontentloaded'), confirm.click()]);
        }

        console.log('✅ Address submitted/confirmed');
    } catch (e) {
        console.warn('⚠️ Address autofill failed:', e.message);
    }
}

/** Wipe cookies + site storage for Nextdoor so each run is “clean”. */
async function clearNextdoorStorage(context, phase = 'startup') {
    try {
        // 1) Cookies/permissions at the context level
        await context.clearCookies();
        await context.clearPermissions();

        // 2) Open a temp page on Nextdoor origin to clear localStorage/sessionStorage/indexedDB/caches
        const p = await context.newPage();
        await p.goto('https://nextdoor.com/', { waitUntil: 'domcontentloaded' });
        await p.evaluate(async () => {
            try { localStorage.clear(); } catch {}
            try { sessionStorage.clear(); } catch {}
            try {
                if (indexedDB && indexedDB.databases) {
                    const dbs = await indexedDB.databases();
                    for (const db of dbs) {
                        if (db && db.name) {
                            try { indexedDB.deleteDatabase(db.name); } catch {}
                        }
                    }
                }
            } catch {}
            try {
                if (typeof caches !== 'undefined' && caches.keys) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
            } catch {}
        });
        await p.close();
 //test
        console.log(`🧼 Cleared Nextdoor storage (${phase}).`);
    } catch (e) {
        console.warn(`⚠️ Failed to clear storage (${phase}):`, e.message);
    }
}

async function ensureLoggedIn(page) {
    await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' });
    if (await page.locator('input[aria-label="Search Nextdoor"], [data-testid="home-feed"]').first().count()) {
        console.log('✅ Already on feed');
        return;
    }

    await page.goto('https://nextdoor.com/login/?next=/news_feed/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const emailSelectors = [
        'input[data-testid="email-address-input"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[placeholder*="Email" i]',
    ];
    const passSelectors = [
        'input[data-testid="password-input"]',
        'input[name="password"]',
        'input[type="password"]',
        'input[placeholder*="Password" i]',
    ];
    const loginBtnSelectors = [
        'button[data-testid="signin_button"]',
        'button:has-text("Log in")',
        'button:has-text("Sign in")',
        'button[type="submit"]',
    ];
    const findFirst = async (arr) => {
        for (const s of arr) {
            if (await page.locator(s).first().count()) return s;
        }
        return null;
    };

    const emailSel = await findFirst(emailSelectors);
    const passSel = await findFirst(passSelectors);
    const btnSel = await findFirst(loginBtnSelectors);

    if (!emailSel || !passSel || !btnSel) {
        console.log('ℹ️ Login inputs/buttons not found; checking if auto-signed-in or blocked…');
        if (await page.locator('input[aria-label="Search Nextdoor"], [data-testid="home-feed"]').first().count()) {
            console.log('✅ Feed visible after redirect');
            return;
        }
        if (/\/choose_address/i.test(page.url())) {
            console.log('ℹ️ Address interstitial detected');
            await handleChooseAddress(page);
            return;
        }
        throw new Error('Login form not found (selectors may have changed).');
    }

    console.log(`🔐 Filling login using selectors: email="${emailSel}", pass="${passSel}", btn="${btnSel}"`);

    await page.fill(emailSel, process.env.NEXTDOOR_USERNAME2);
    await page.fill(passSel, process.env.NEXTDOOR_PASSWORD2);

    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(btnSel)]);

    if (/\/choose_address/i.test(page.url())) {
        console.log('ℹ️ Address interstitial after login');
        await handleChooseAddress(page);
    }

    if (!(await page.locator('input[aria-label="Search Nextdoor"], [data-testid="home-feed"]').first().count())) {
        await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' });
        if (!(await page.locator('input[aria-label="Search Nextdoor"], [data-testid="home-feed"]').first().count())) {
            try {
                await page.screenshot({ path: `login_debug_${Date.now()}.png`, fullPage: true });
            } catch {}
            throw new Error('Login appears to have failed (feed not visible).');
        }
    }

    console.log('✅ Logged in and feed visible');
}

function parseName(author = '') {
    const parts = author.trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    return { first, last };
}

function isValidPersonName(author = '') {
    const { first, last } = parseName(author);
    return first.length >= 1 && last.length >= 2;
}

/* -------------------------- Messaging + Persistence ------------------------ */

/* =================== DISABLED: DM template & sending ===================
// const dmTemplate = (name, type = 'pool') => { ... }
// async function sendDMOnProfile(page, messageText) { ... }
*/

/**
 * Insert/Upsert post WITHOUT any message_sent fields.
 * Keeps enrichment fields updated on conflict.
 */
async function upsertMessage(
    table,
    { url, author, location, city = CITY, leadType, phone = null, email = null, physical_address = null }
) {
    await pool.query(
        `INSERT INTO ${table}
       (post_url, author, location, city, lead_type, phone, email, physical_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (post_url) DO UPDATE
       SET author = COALESCE(EXCLUDED.author, ${table}.author),
           location = COALESCE(EXCLUDED.location, ${table}.location),
           city = COALESCE(EXCLUDED.city, ${table}.city),
           lead_type = COALESCE(EXCLUDED.lead_type, ${table}.lead_type),
           phone = COALESCE(EXCLUDED.phone, ${table}.phone),
           email = COALESCE(EXCLUDED.email, ${table}.email),
           physical_address = COALESCE(EXCLUDED.physical_address, ${table}.physical_address)`,
        [url, author, location, city, leadType, phone, email, physical_address]
    );
}

async function saveMessagedPost(post) {
    const { url, author, location, leadType } = post;

    if (!isValidPersonName(post.author)) {
        console.log(`⏭️ Not saving weak name "${post.author}"`);
        return;
    }

    try {
        console.log(
            `💾 Saving (no DM logic): url=${url}, author=${author}, loc=${location}, leadType=${leadType}`
        );
        await upsertMessage('nextdoor_messages', post);
        await upsertMessage('recent_nextdoor_messages', post);
    } catch (err) {
        console.error('❌ DB save failed:', err.message);
    }
}

/* ----------------------------- Search Utilities ---------------------------- */

async function clickMostRecentFilter(page) {
    try {
        const sortBy = page.locator('div[role="button"][aria-label="Sort By"]');
        await sortBy.waitFor({ timeout: 8000 });
        await sortBy.click();
        await page.waitForTimeout(800);
        const mostRecent = page.locator('div[role="menuitem"] span:text("Most Recent")');
        await mostRecent.waitFor({ timeout: 5000 });
        await mostRecent.click();
        await page.waitForTimeout(1500);
    } catch {
        /* non-fatal */
    }
}

async function goToPostsTab(page, searchTerm) {
    const ariaTab = page.getByRole('tab', { name: /^Posts$/i });
    if (await ariaTab.count()) {
        await ariaTab.first().click();
        return;
    }

    const testId = page.locator('[data-testid="tab-posts"]');
    if (await testId.count()) {
        await testId.first().click();
        return;
    }

    const textLink = page.locator('a,button', { hasText: /^Posts$/i }).first();
    if (await textLink.count()) {
        await textLink.click();
        return;
    }

    await page.goto(`https://nextdoor.com/search/posts/?query=${encodeURIComponent(searchTerm)}`, {
        waitUntil: 'domcontentloaded',
    });
}

async function scrapePostsOnPage(page, limit = 30) {
    for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 1600);
        await sleep(300);
    }
    const posts = await page.$$eval('a[href*="/p/"], a[href*="/posting/"]', (links) => {
        const seen = new Set(), out = [];
        for (const a of links) {
            const href = a.getAttribute('href');
            if (!href) continue;
            const abs = href.startsWith('http') ? href : new URL(href, location.origin).href;
            if (seen.has(abs)) continue;
            seen.add(abs);
            const root = a.closest('article') || a.closest('[role="article"]') || a;
            const text = (root?.innerText || '').replace(/\s+/g, ' ').trim();
            if (text && text.length > 20) out.push({ url: abs, text });
        }
        return out;
    });
    return posts.slice(0, limit);
}

async function filterNewLeads(posts) {
    const urls = posts.map((p) => p.url);
    const { rows } = await pool.query('SELECT post_url FROM nextdoor_messages WHERE post_url = ANY($1)', [urls]);
    const seen = new Set(rows.map((r) => r.post_url));
    return posts.filter((p) => !seen.has(p.url));
}

/* --------------------------- GPT Lead Classifier --------------------------- */

async function getAuthorAndLocation(page, postUrl) {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    let author = 'UNKNOWN', location = 'UNKNOWN';

    try {
        const authorEl = page.locator('a[href*="/profile/"] span.Text_detailTitle__1cj4dca1c').first();
        await authorEl.waitFor({ timeout: 5000 });
        author = await authorEl.innerText();
    } catch {}

    try {
        const locationEl = page.locator('a[href*="/neighborhood/"] span.Text_mini__1cj4dca6').first();
        await locationEl.waitFor({ timeout: 5000 });
        location = await locationEl.innerText();
    } catch {}

    return { author, location };
}

async function classifyPosts(posts, labelType = 'pool') {
    if (!posts.length) return [];

    const SYSTEM_PROMPTS = {
        pool: `You’re classifying neighborhood posts. Label "lead" ONLY if the author is seeking pool/spa/hot tub service (cleaning, maintenance, equipment like pump/chlorinator/filter, green pool, quotes or recommendations for a pool pro).
If it's about plumbing (toilets, sinks, faucets, water heaters, sewer, general leaks not clearly about a pool) or irrigation/sprinklers, label "not_lead".
Return ONLY JSON in input order: [{"label":"lead"|"not_lead","reason":"..."}]. Be strict.`,
        handyman: `You’re classifying neighborhood posts. Label "lead" ONLY if the author is seeking handyman or plumbing help (repairs, leaks, faucets, toilets, water heater, mounting, drywall, doors, tile, general recommendations).
If it's about pool/spa/hot tub maintenance or equipment, label "not_lead".
Return ONLY JSON in input order: [{"label":"lead"|"not_lead","reason":"..."}]. Be strict.`,
    };

    const system = SYSTEM_PROMPTS[labelType] || SYSTEM_PROMPTS.pool;
    const user = `Posts:\n${posts.map((p, i) => `#${i + 1}\n${p.text}`).join('\n')}`;

    const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    });

    const raw = resp.choices?.[0]?.message?.content || '[]';
    try {
        return JSON.parse(raw);
    } catch {
        const m = raw.match(/\[[\s\S]*\]/);
        return m ? JSON.parse(m[0]) : posts.map(() => ({ label: 'not_lead', reason: 'parse error' }));
    }
}

/* --------------------------- Melissa (TX only) ---------------------------- */

async function melissaTX(author) {
    const name = (author || '').trim();
    if (!name || name.split(' ').length < 2) return { phone: null, email: null, physical_address: null };

    let b;
    try {
        const headless = process.env.HEADLESS === '1';
        const useChrome = process.env.USE_CHROME === '1';
        b = useChrome
            ? await chromium.launch({ channel: 'chrome', headless })
            : await chromium.launch({ headless });
        return await personSearchAndScrape(b, { name, state: 'TX', city: '', zip: '' });
    } catch (e) {
        console.warn('⚠️ Melissa lookup failed:', e.message);
        return { phone: null, email: null, physical_address: null };
    } finally {
        if (b) await b.close();
    }
}

/* --------------------------------- Main ----------------------------------- */

const runNextdoorAutomation = async () => {
    console.log('🏡  Running Nextdoor Automation...');

    const useChrome = process.env.USE_CHROME === '1';
    const headless  = process.env.HEADLESS === '1';

// --- slot-aware env (defaults to morning) ---
    const SLOT = (process.env.RUN_SLOT || 'morning').toLowerCase();   // "morning" | "afternoon"
    const PROXY_URL = process.env[`PROXY_URL_${SLOT.toUpperCase()}`] || process.env.PROXY_URL || '';
    const ND_PROFILE_DIR =
        process.env[`ND_PROFILE_DIR_${SLOT.toUpperCase()}`] ||
        process.env.ND_PROFILE_DIR || // optional global override
        undefined; // if undefined, Playwright will create a temp profile (not persisted)

// Log what we resolved (safe values only)
    console.log(`🕒 Slot: ${SLOT}`);
    console.log(`🌐 Proxy: ${PROXY_URL ? 'enabled' : 'disabled'}`);
    console.log(`📁 Profile dir: ${ND_PROFILE_DIR || '(ephemeral)'}`);

// --- shared launch options ---
    const baseLaunchOpts = {
        headless,
        viewport: { width: 1400, height: 900 },
        geolocation: { latitude: 33.0602, longitude: -96.7349 },
        permissions: ['geolocation'],
        timezoneId: 'America/Chicago',
        locale: 'en-US',
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        args: [
            '--disable-blink-features=AutomationControlled',
            ...(headless ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
        ],
        ...(PROXY_URL ? { proxy: { server: PROXY_URL } } : {}),
    };

// --- use a persistent context when we have a profile dir ---


    let context;
    if (ND_PROFILE_DIR) {
        try {
            fs.mkdirSync(ND_PROFILE_DIR, { recursive: true });
        } catch (err) {
            console.error(`⚠️ Failed to ensure profile dir ${ND_PROFILE_DIR}:`, err);
        }

        const opts = useChrome
            ? { ...baseLaunchOpts, channel: 'chrome' }
            : baseLaunchOpts;

        context = await chromium.launchPersistentContext(ND_PROFILE_DIR, opts);
    } else {
        // fall back to non-persistent browser (no profile saved)
        const browser = useChrome
            ? await chromium.launch({ ...baseLaunchOpts, channel: 'chrome' })
            : await chromium.launch(baseLaunchOpts);
        context = await browser.newContext(); // create a fresh context
    }

    await clearNextdoorStorage(context,'startup')

// small stealth tweaks
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // Supply minimal chrome object to reduce detection
        // @ts-ignore
        window.chrome = window.chrome || { runtime: {} };
        Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    const page = await context.newPage();


    try {
        await ensureLoggedIn(page);

        for (const { label, query, type, needsMostRecent } of SEARCH_TERMS) {
            console.log(`🔍 Searching for: ${label}`);

            await page.waitForSelector('input[aria-label="Search Nextdoor"]', { timeout: 15000 });
            await page.fill('input[aria-label="Search Nextdoor"]', query);
            await page.keyboard.press('Enter');
            await page.waitForLoadState('domcontentloaded');
            await sleep(3000);

            await goToPostsTab(page, query);
            if (needsMostRecent) await clickMostRecentFilter(page);
            await sleep(2000);

            const posts = await scrapePostsOnPage(page, 30);
            const labels = await classifyPosts(posts, type);
            const enriched = posts.map((p, i) => ({ ...p, ...(labels[i] || {}) }));
            const leads = enriched.filter((p) => p.label === 'lead');
            const keywordTighten =
                type === 'pool'
                    ? (p) => /\b(pool|spa|chlorine|skimmer|pump|filter|backwash|algae|acid|resurface|pebble|tiles?)\b/i.test(p.text)
                    : () => true;

            const newLeads = await filterNewLeads(leads.filter(keywordTighten));

            if (!newLeads.length) {
                console.log(`⚠️ No clear new leads for: ${label}`);
                continue;
            }

            for (const [i, lead] of newLeads.entries()) {
                console.log(`(${i + 1}/${newLeads.length}) Visiting -> ${lead.url}`);

                const { author, location } = await getAuthorAndLocation(page, lead.url);
                lead.author = author;
                lead.location = location;
                lead.leadType = type;

                if (!isValidPersonName(author)) {
                    console.log(`⏭️ Skipping weak name "${author}" (needs a real last name)`);
                    continue;
                }

                let phone = null, email = null, physical_address = null;
                const r = await melissaTX(author);
                console.log('📇 Melissa:', r);
                phone = r.phone; email = r.email; physical_address = r.physical_address;

                await saveMessagedPost(
                    {
                        url: lead.url,
                        author,
                        location,
                        city: CITY,
                        leadType: type,
                        phone,
                        email,
                        physical_address,
                    }
                );
            }
        }
    } catch (err) {
        console.error('❌ Fatal error:', err);
    } finally {
        // 🔴 NEW: also wipe on shutdown
        await clearNextdoorStorage(context, 'shutdown');

        console.log('🧼 Closing browser...');
        await context.close();
        console.log('✅ All automations completed');
    }
};

if (require.main === module) runNextdoorAutomation();
module.exports = runNextdoorAutomation;
