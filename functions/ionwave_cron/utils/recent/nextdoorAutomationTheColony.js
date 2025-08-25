// nextdoorAutomationTheColony.js
require('dotenv').config();
const path = require('path');
const { chromium } = require('playwright');
const OpenAI = require('openai');
const pool = require('./../../../db/db');
const fs = require('fs');





// 👉 adjust import path if needed
const { personSearchAndScrape } = require('../melissaLookup');
const os = require("os");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* =================== DISABLED: DM-related constants =================== */
// const MAX_DMS_PER_DAY = 7;
// const DM_PAUSE_MS = 1500;

const CITY = 'The Colony';

const SEARCH_TERMS = [
    { label: 'Pool Cleaner',     query: 'pool cleaner',     type: 'pool',     needsMostRecent: true },
    { label: 'Pool Maintenance', query: 'pool maintenance', type: 'pool',     needsMostRecent: true }
];

// --- optionally clear storage on startup (defaults OFF) ---



const sleep = (ms) => new Promise((r) => setTimeout(r, ms));




// One place to decide “am I on the feed?”
const FEED_SEL =
    '[data-testid="home-feed"], input[aria-label="Search Nextdoor"], main[role="main"]';

/**
 * Be patient and proactive: if we're stuck on /login?next=/news_feed/,
 * shove to /news_feed/ and re-check; loop until the feed renders or we give up.
 */
async function waitForFeed(page, totalMs = 120_000) {
    const deadline = Date.now() + totalMs;

    while (Date.now() < deadline) {
        // 1) Feed visible?
        if (await page.locator(FEED_SEL).first().count()) return true;

        const url = page.url();

        // 2) If we're on /login?next=/news_feed/, nudge to the feed explicitly
        if (/\/login\/?\?next=\/news_feed/i.test(url)) {
            await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' }).catch(() => {});
            await page.waitForTimeout(2500);
            continue;
        }

        // 3) Address interstitial? Try to skip.
        if (/\/choose_address/i.test(url)) {
            console.log('ℹ️ Address interstitial detected — attempting to skip');
            await skipAddressIfPresent(page);
            await page.waitForTimeout(1500);
            continue;
        }

        // 4) Regular login page? Try pushing to /news_feed/ anyway.
        if (/\/login/i.test(url)) {
            await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' }).catch(() => {});
            await page.waitForTimeout(2000);
            continue;
        }

        // 5) Let SPA settle a bit.
        await page.waitForTimeout(1200);
    }
    return false;
}





/* ------------------------- Helpers: Stealth + Login ------------------------ */


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
        //test2
        console.log(`🧼 Cleared Nextdoor storage (${phase}).`);
    } catch (e) {
        console.warn(`⚠️ Failed to clear storage (${phase}):`, e.message);
    }
}
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function saveScreenshot(page, label = 'login') {
    const path = `/tmp/${label}_${Date.now()}.png`;
    await page.screenshot({ path, fullPage: true });
    const res = await cloudinary.uploader.upload(path, { folder: 'nextdoor-screenshots' });
    console.log(`📸 Screenshot uploaded: ${res.secure_url}`);
    return res.secure_url;
}


async function ensureLoggedIn(page) {
    // Try feed first; we might already be signed in with the persisted profile
    await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' });
    if (await page.locator(FEED_SEL).first().count()) {
        console.log('✅ Already on feed');
        return;
    }

    // Go to login; if we get the “Join” splash, force allow_login
    await page.goto('https://nextdoor.com/login/?next=/news_feed/', { waitUntil: 'domcontentloaded' });
    if (await page.locator('text=New here? Join Nextdoor').first().count()) {
        console.log('ℹ️ Got join splash, forcing login form…');
        await page.goto('https://nextdoor.com/login/?allow_login=true&next=/news_feed/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
    }

    // Try to accept cookies (best-effort)
    try {
        await page.locator([
            'button:has-text("Accept")',
            'button:has-text("I agree")',
            'button:has-text("Allow all")',
            '[data-testid="cookie-accept"]'
        ].join(',')).first().click({ timeout: 1500 });
    } catch {}

    // Resolve selectors
    const findFirst = async (arr) => {
        for (const s of arr) if (await page.locator(s).first().count()) return s;
        return null;
    };
    const emailSel = await findFirst([
        'input[data-testid="email-address-input"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[placeholder*="Email" i]',
    ]);
    const passSel = await findFirst([
        'input[data-testid="password-input"]',
        'input[name="password"]',
        'input[type="password"]',
        'input[placeholder*="Password" i]',
    ]);
    const btnSel = await findFirst([
        'button[data-testid="signin_button"]',
        'button:has-text("Log in")',
        'button:has-text("Sign in")',
        'button[type="submit"]',
    ]);

    // If we don't see the form, wait-and-nudge feed anyway
    if (!emailSel || !passSel || !btnSel) {
        console.log('ℹ️ Login form not found, waiting for feed or redirect…');
        const ok = await waitForFeed(page, 90_000);
        if (ok) {
            console.log('✅ Feed became visible without manual login');
            return;
        }
        // Fall through to a final attempt/screenshot below
    } else {
        // Fill & submit
        console.log(`🔐 Filling login: email="${emailSel}", pass="${passSel}", btn="${btnSel}"`);
        await page.locator(emailSel).click();
        await page.keyboard.type(process.env.NEXTDOOR_USERNAME, { delay: 40 });
        await page.locator(passSel).click();
        await page.keyboard.type(process.env.NEXTDOOR_PASSWORD, { delay: 45 });

        await Promise.allSettled([page.click(btnSel)]);
        // Give Nextdoor time to start its redirect
        await page.waitForTimeout(5_000);
    }

    // Unified waiter after either path above
    const ok = await waitForFeed(page, 120_000);
    console.log('➡️ Post-login URL:', page.url());
    if (ok) {
        console.log('✅ Feed visible after login');
        return;
    }

    // One last hard push, then give up with a screenshot
    await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(5_000);
    if (await page.locator(FEED_SEL).first().count()) {
        console.log('⚠️ Feed detected after forced nav — continuing.');
        return;
    }

    try { await saveScreenshot(page, 'login_timeout'); } catch {}
    console.log('📸 Saved screenshot before throwing error:', page.url());
    throw new Error('Login appears to have failed (feed not visible).');
}


/** Try to bypass the address interstitial without requiring NEXTDOOR_ADDRESS. */
async function skipAddressIfPresent(page) {
    // If a text input is present and you *want* to fill later, you can extend this.
    // For now, try to *skip* it.
    const skipBtns = [
        'button:has-text("Skip for now")',
        'button:has-text("Skip")',
        'button:has-text("Not now")',
        'button:has-text("Do this later")',
        'button:has-text("Continue")',
        '[data-testid="skip"], [data-testid="continue"], [data-test="skip"]',
    ];

    const findFirst = async (arr) => {
        for (const s of arr) if (await page.locator(s).first().count()) return s;
        return null;
    };

    const btnSel = await findFirst(skipBtns);
    if (btnSel) {
        await Promise.allSettled([ page.click(btnSel) ]);
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
        return;
    }

    // Fallback: go to the feed explicitly
    await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' }).catch(() => {});
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
    const SLOT = (process.env.RUN_SLOT || 'morning').toLowerCase();

    // --- HARD DISABLE any proxies (even if inherited from the shell) ---
    ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY','all_proxy','NO_PROXY','no_proxy']
        .forEach(k => { if (process.env[k]) delete process.env[k]; });
    const PROXY_URL = ''; // guaranteed empty

    // --- portable profile dir resolution ---
    const os = require('os');
    const baseDefault = fs.existsSync('/data') ? '/data' : os.tmpdir();

    let ND_PROFILE_DIR =
        process.env[`ND_PROFILE_DIR_${SLOT.toUpperCase()}`] ||
        process.env.ND_PROFILE_DIR ||
        path.join(baseDefault, `.nd-profile-${SLOT}`);

    try {
        fs.mkdirSync(ND_PROFILE_DIR, { recursive: true });
    } catch (err) {
        console.error(`⚠️ Failed to ensure profile dir ${ND_PROFILE_DIR}:`, err);
        ND_PROFILE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), `.nd-profile-${SLOT}-`));
    }

    console.log(`🕒 Slot: ${SLOT}`);
    console.log('🌐 Proxy: disabled');
    console.log(`📁 Profile dir resolved: ${ND_PROFILE_DIR}`);

    // --- launch (no proxy key at all) ---
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
    };

    const opts = useChrome ? { ...baseLaunchOpts, channel: 'chrome' } : baseLaunchOpts;
    const context = await chromium.launchPersistentContext(ND_PROFILE_DIR, opts);

    // ✅ only now that context exists:
    if (process.env.CLEAR_STORAGE_ON_START === '1') {
        await clearNextdoorStorage(context, 'startup');
    }

    // small stealth tweaks
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // @ts-ignore
        window.chrome = window.chrome || { runtime: {} };
        Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    const page = await context.newPage();
    page.setDefaultTimeout(45_000);
    page.setDefaultNavigationTimeout(60_000);

    try {
        // Ensures we land on the feed (no need to check-and-return again)
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

                await saveMessagedPost({
                    url: lead.url,
                    author,
                    location,
                    city: CITY,
                    leadType: type,
                    phone,
                    email,
                    physical_address,
                });
            }
        }
    } catch (err) {
        console.error('❌ Fatal error:', err);
    } finally {
        if (process.env.CLEAR_STORAGE_ON_SHUTDOWN === '1') {
            await clearNextdoorStorage(context, 'shutdown');
        }
        console.log('🧼 Closing browser...');
        await new Promise(r => setTimeout(r, 30_000));
        await context.close();
        console.log('✅ All automations completed');
    }
};


if (require.main === module) runNextdoorAutomation();
module.exports = runNextdoorAutomation;
