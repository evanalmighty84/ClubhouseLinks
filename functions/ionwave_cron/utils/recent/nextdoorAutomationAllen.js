// nextdoorAutomationAllen.js
require('dotenv').config();
const path = require('path');
const { chromium } = require('playwright');
const OpenAI = require('openai');
const pool = require('./../../../db/db');
const fs = require('fs');





// 👉 adjust import path if needed
const SIGNIN = 'https://apps.melissa.com/user/signin.aspx?src=https://lookups.melissa.com/home/';
const PEOPLE_SEARCH = 'https://lookups.melissa.com/home/personatorsearch/';

async function loginMelissa(page) {
    await page.goto(SIGNIN, { waitUntil: 'domcontentloaded' });
    if (await page.locator('#ctl00_ContentPlaceHolder1_Signin1_txtEmail').count()) {
        await page.fill('#ctl00_ContentPlaceHolder1_Signin1_txtEmail', process.env.MELISSA_USERNAME);
        const pwdSel = '#ctl00_ContentPlaceHolder1_Signin1_txtPassword, input[type="password"]';
        await page.fill(pwdSel, process.env.MELISSA_PASSWORD);
        await Promise.all([
            page.waitForLoadState('domcontentloaded'),
            page.click('#ctl00_ContentPlaceHolder1_Signin1_btnLogin')
        ]);
    }
}

// --- Helper: force the State to TX across select/input/combobox variants ---
async function forceStateTX(page, abbr = 'TX', full = 'Texas') {
    // 1) Plain <select>
    const selects = [
        'select[name="state"]',
        'select[name="stateabbr"]',
        'select#state',
        'select#stateabbr'
    ];
    for (const sel of selects) {
        if (await page.locator(sel).count()) {
            try {
                await page.selectOption(sel, { value: abbr }).catch(async () => {
                    await page.selectOption(sel, { label: full });
                });
                const val = await page.$eval(sel, el => (el.value || '').toUpperCase());
                if (val === abbr) return true;
            } catch {}
        }
    }

    // 2) Text inputs
    const inputs = [
        'input[name="state"]',
        'input[name="stateabbr"]',
        'input[placeholder*="State" i]'
    ];
    for (const sel of inputs) {
        if (await page.locator(sel).count()) {
            try { await page.fill(sel, abbr); return true; } catch {}
        }
    }

    // 3) ARIA combobox style
    const combo = page.locator('[role="combobox"][aria-haspopup="listbox"]');
    if (await combo.count()) {
        try {
            await combo.click();
            await page.keyboard.type(full);
            await page.keyboard.press('Enter');
            return true;
        } catch {}
    }

    return false;
}



// --- Main lookup with TX forcing + TX-row preference ---
async function personSearchAndScrape(browser, { name, city = '', state = 'TX', zip = '' }) {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    await loginMelissa(page);
    await page.goto(PEOPLE_SEARCH, { waitUntil: 'domcontentloaded' });

    // Fill inputs
    const nameInput = page.locator('input[placeholder*="Full Name"], input[name="name"]');
    await nameInput.first().waitFor();
    await nameInput.first().fill(name);

    if (city) await page.fill('input[name="city"], input[placeholder*="City"]', city).catch(() => {});
    if (zip)  await page.fill('input[name="postalCode"], input[placeholder*="ZIP"]', zip).catch(() => {});

    // Force TX regardless of control type
    if (state) await forceStateTX(page, state, 'Texas');

    // (optional) log what we think it is
    try {
        const sVal = await page.evaluate(() => {
            const sel = document.querySelector('select[name="state"],select[name="stateabbr"]');
            if (sel) return sel.value || '';
            const inp = document.querySelector('input[name="state"],input[name="stateabbr"]');
            return inp ? inp.value || '' : '';
        });
        console.log('🧭 Melissa state set to:', sVal || '(unknown)');
    } catch {}

    // Submit
    const submit = page.locator('input[type="submit"][value="Submit"], button:has-text("Submit")').first();
    await submit.waitFor({ timeout: 15000 });
    await submit.click();

    // Wait for results
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 20000 });

    // Prefer a TX row
    let clicked = false;
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
        const txt = (await rows.nth(i).innerText()).toUpperCase();
        if (txt.includes(' TX ') || txt.endsWith(' TX') || txt.includes(' TX-')) {
            const link = rows
                .nth(i)
                .locator('a.btnAjax[href*="/home/personator/index"], a.btnAjax[href*="/home/mikpersoninfo/index"]')
                .first();
            if (await link.count()) {
                await Promise.all([page.waitForLoadState('domcontentloaded'), link.click()]);
                clicked = true;
                break;
            }
        }
    }

    // Fallback: first detail link
    if (!clicked) {
        const nameLink = page.locator('a.btnAjax[href*="/home/personator/index"]').first();
        const mikLink  = page.locator('a.btnAjax[href*="/home/mikpersoninfo/index"]').first();
        if (await nameLink.count()) {
            await Promise.all([page.waitForLoadState('domcontentloaded'), nameLink.click()]);
        } else if (await mikLink.count()) {
            await Promise.all([page.waitForLoadState('domcontentloaded'), mikLink.click()]);
        } else {
            return { phone: null, email: null, physical_address: null };
        }
    }

    // Scrape detail
    const out = { phone: null, email: null, physical_address: null };

    try {
        const phoneEl = page.locator('a[href*="/home/phonecheck?phone="]').first();
        if (await phoneEl.count()) out.phone = (await phoneEl.innerText()).trim();
    } catch {}

    try {
        const emailEl = page.locator('a[href*="/home/emailcheck"], a[href^="mailto:"]').first();
        if (await emailEl.count()) {
            const t = (await emailEl.innerText()) || (await emailEl.getAttribute('href')) || '';
            out.email = t.replace(/^mailto:/, '').trim();
        }
    } catch {}

    try {
        const addr = await page
            .locator('xpath=//td[normalize-space(text())="Address"]/following-sibling::td[1]')
            .innerText();
        out.physical_address = addr.trim();
    } catch {}

    return out;
}


const os = require("os");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* =================== DISABLED: DM-related constants =================== */
// const MAX_DMS_PER_DAY = 7;
// const DM_PAUSE_MS = 1500;

const CITY = 'Allen';

const SEARCH_TERMS = [
    { label: 'Pool Cleaner',     query: 'pool cleaner',     type: 'pool',     needsMostRecent: true },
    { label: 'Pool Maintenance', query: 'pool maintenance', type: 'pool',     needsMostRecent: true }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


const FEED_SEL =
    '[data-testid="home-feed"], input[aria-label="Search Nextdoor"], main[role="main"]';

async function waitForFeed(page, totalMs = 90_000) {
    const deadline = Date.now() + totalMs;
    while (Date.now() < deadline) {
        // feed visible?
        if (await page.locator(FEED_SEL).first().count()) return true;

        // address interstitial?
        if (/\/choose_address/i.test(page.url())) {
            console.log('ℹ️ Address interstitial detected — attempting to skip');
            await skipAddressIfPresent(page);
            await page.waitForTimeout(1500);
        }

        // stuck on login? shove to feed again
        if (/\/login/i.test(page.url())) {
            await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' }).catch(() => {});
            await page.waitForTimeout(2000);
        } else {
            // let SPA settle
            await page.waitForTimeout(1500);
        }
    }
    return false;
}


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
    // 1) already signed in?
    await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' });
    if (await page.locator(FEED_SEL).first().count()) {
        console.log('✅ Already on feed');
        return;
    }

    // 2) go to login (force allow_login if splash)
    await page.goto('https://nextdoor.com/login/?next=/news_feed/', { waitUntil: 'domcontentloaded' });
    if (await page.locator('text=New here? Join Nextdoor').first().count()) {
        console.log('ℹ️ Got join splash, forcing login form…');
        await page.goto('https://nextdoor.com/login/?allow_login=true&next=/news_feed/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
    }

    // cookie consent (best-effort)
    try {
        await page.locator([
            'button:has-text("Accept")',
            'button:has-text("I agree")',
            'button:has-text("Allow all")',
            '[data-testid="cookie-accept"]'
        ].join(',')).first().click({ timeout: 1500 });
    } catch {}

    // selectors (flexible)
    const emailSel = await (async () => {
        for (const s of [
            'input[data-testid="email-address-input"]',
            'input[name="email"]',
            'input[type="email"]',
            'input[placeholder*="Email" i]'
        ]) if (await page.locator(s).first().count()) return s;
        return null;
    })();
    const passSel = await (async () => {
        for (const s of [
            'input[data-testid="password-input"]',
            'input[name="password"]',
            'input[type="password"]',
            'input[placeholder*="Password" i]'
        ]) if (await page.locator(s).first().count()) return s;
        return null;
    })();
    const btnSel = await (async () => {
        for (const s of [
            'button[data-testid="signin_button"]',
            'button:has-text("Log in")',
            'button:has-text("Sign in")',
            'button[type="submit"]'
        ]) if (await page.locator(s).first().count()) return s;
        return null;
    })();

    // if the form isn’t there, maybe we’ve been auto-signed in or blocked – try feed
    if (!emailSel || !passSel || !btnSel) {
        console.log('ℹ️ Login form not found, checking feed/interstitial…');
        if (await waitForFeed(page, 30_000)) {
            console.log('✅ Feed became visible without manual login');
            return;
        }
        throw new Error('Login form not found (and feed did not appear).');
    }
//Test
    console.log(`🔐 Filling login: email="${emailSel}", pass="${passSel}", btn="${btnSel}"`);

    await page.locator(emailSel).click();
    await page.keyboard.type(process.env.NEXTDOOR_USERNAME3, { delay: 40 });
    await page.locator(passSel).click();
    await page.keyboard.type(process.env.NEXTDOOR_PASSWORD3, { delay: 45 });

    // click and give the site a moment to start redirecting
    await Promise.allSettled([page.click(btnSel)]);
    await page.waitForTimeout(5_000);            // ← this was the missing piece

    // be patient and forgiving while we transition to the feed
    const ok = await waitForFeed(page, 90_000);
    console.log('➡️ Post-login URL:', page.url());
    if (ok) {
        console.log('✅ Feed visible after login');
        return;
    }

    // last try: push to feed and wait briefly, then soft-continue
    await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(5_000);
    if (await page.locator(FEED_SEL).first().count()) {
        console.log('⚠️ Feed detected after forced nav — continuing.');
        return;
    }

    // still no luck – capture context and fail
    try { await saveScreenshot(page, 'login_timeout')
    } catch {}
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

const runNextdoorAutomation = async () => {console.log('🏡  Running Nextdoor Automation...');

    const useChrome = process.env.USE_CHROME === '1';
    const headless  = process.env.HEADLESS === '1';

// --- slot-aware env (defaults to morning) ---
// --- slot-aware env (defaults to morning) ---
    const SLOT = (process.env.RUN_SLOT || 'morning').toLowerCase();   // "morning" | "afternoon"

// --- HARD DISABLE any proxies (even if inherited from the shell) ---
    ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY','all_proxy','NO_PROXY','no_proxy']
        .forEach(k => { if (process.env[k]) delete process.env[k]; });

// Force-off: do not read any PROXY_URL* vars
    const PROXY_URL = ''; // <— always empty so Playwright won’t use a proxy

// --- portable profile dir resolution (Railway uses /data, local uses OS tmp) ---
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
        // Last-resort: unique temp dir
        ND_PROFILE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), `.nd-profile-${SLOT}-`));
    }

    console.log(`🕒 Slot: ${SLOT}`);
    console.log('🌐 Proxy: disabled'); // guaranteed
    console.log(`📁 Profile dir resolved: ${ND_PROFILE_DIR}`);

// --- shared launch options (no proxy field at all) ---
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
        // 👇 no "proxy" key here at all
    };


// --- always use a persistent context with the resolved dir ---
    const opts = useChrome ? { ...baseLaunchOpts, channel: 'chrome' } : baseLaunchOpts;
    const context = await chromium.launchPersistentContext(ND_PROFILE_DIR, opts);

    if (process.env.CLEAR_STORAGE_ON_START === '1') {
        await clearNextdoorStorage(context, 'startup');
    }


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
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(60000);



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
        await new Promise(r => setTimeout(r, 30_000));
        await context.close();
        console.log('✅ All automations completed');
    }
};

if (require.main === module) runNextdoorAutomation();
module.exports = runNextdoorAutomation;
