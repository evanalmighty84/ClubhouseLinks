// index.js
require('dotenv').config();
const path = require('path');
const { chromium } = require('playwright');
const OpenAI = require('openai');
const pool = require('./../../../db/db');

// 👉 adjust import path if needed
const { personSearchAndScrape } = require('../melissaLookup');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_DMS_PER_DAY = 7;
const DM_PAUSE_MS = 1500;
const CITY = 'Wylie';

const SEARCH_TERMS = [
    { label: 'Pool Cleaner',     query: 'pool cleaner',     type: 'pool',     needsMostRecent: true },
    { label: 'Pool Maintenance', query: 'pool maintenance', type: 'pool',     needsMostRecent: true },
    { label: 'Handyman Plumber', query: 'handyman plumber', type: 'handyman', needsMostRecent: true }
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ------------------------- Helpers: Stealth + Login ------------------------ */

async function handleChooseAddress(page) {
    // Only act if the current page is the address chooser
    if (!/\/choose_address/i.test(page.url())) return;

    try {
        // Your address for onboarding
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

async function ensureLoggedIn(page) {
    // Try feed fast-path
    await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' });
    if (await page.locator('input[aria-label="Search Nextdoor"], [data-testid="home-feed"]').first().count()) {
        console.log('✅ Already on feed');
        return;
    }

    // Go to canonical login (explicit next=)
    await page.goto('https://nextdoor.com/login/?next=/news_feed/', { waitUntil: 'domcontentloaded' });

    // Some variants lazy-load; give it a moment
    await page.waitForTimeout(1200);

    const emailSelectors = [
        'input[data-testid="email-address-input"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[placeholder*="Email" i]'
    ];
    const passSelectors = [
        'input[data-testid="password-input"]',
        'input[name="password"]',
        'input[type="password"]',
        'input[placeholder*="Password" i]'
    ];
    const loginBtnSelectors = [
        'button[data-testid="signin_button"]',
        'button:has-text("Log in")',
        'button:has-text("Sign in")',
        'button[type="submit"]'
    ];

    // Resolve first selector that exists on the page
    const findFirst = async (arr) => {
        for (const s of arr) { if (await page.locator(s).first().count()) return s; }
        return null;
    };

    const emailSel = await findFirst(emailSelectors);
    const passSel  = await findFirst(passSelectors);
    const btnSel   = await findFirst(loginBtnSelectors);

    if (!emailSel || !passSel || !btnSel) {
        console.log('ℹ️ Login inputs/buttons not found; checking if we were auto-signed-in or blocked…');
        if (await page.locator('input[aria-label="Search Nextdoor"], [data-testid="home-feed"]').first().count()) {
            console.log('✅ Feed visible after redirect');
            return;
        }
        // Address interstitial?
        if (/\/choose_address/i.test(page.url())) {
            console.log('ℹ️ Address interstitial detected');
            await handleChooseAddress(page);
            return;
        }
        throw new Error('Login form not found (selectors may have changed).');
    }

    console.log(`🔐 Filling login using selectors: email="${emailSel}", pass="${passSel}", btn="${btnSel}"`);

    await page.fill(emailSel, process.env.NEXTDOOR_USERNAME4);
    await page.fill(passSel,  process.env.NEXTDOOR_PASSWORD4);

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click(btnSel)
    ]);

    // Post-login handling
    if (/\/choose_address/i.test(page.url())) {
        console.log('ℹ️ Address interstitial after login');
        await handleChooseAddress(page);
    }

    // Final check
    if (!(await page.locator('input[aria-label="Search Nextdoor"], [data-testid="home-feed"]').first().count())) {
        // One more nudge to the feed
        await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded' });
        if (!(await page.locator('input[aria-label="Search Nextdoor"], [data-testid="home-feed"]').first().count())) {
            // Helpful screenshot for debugging
            try { await page.screenshot({ path: `login_debug_${Date.now()}.png`, fullPage: true }); } catch {}
            throw new Error('Login appears to have failed (feed not visible).');
        }
    }

    console.log('✅ Logged in and feed visible');
}

function parseName(author = "") {
    const parts = author.trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || "";
    const last  = parts.length > 1 ? parts[parts.length - 1] : "";
    return { first, last };
}

function isValidPersonName(author = "") {
    const { first, last } = parseName(author);
    return first.length >= 1 && last.length >= 2; // e.g., "John D" -> false
}


/* -------------------------- Messaging + Persistence ------------------------ */

const dmTemplate = (name, type = 'pool') => {
    const greeting = `Hey${name ? ' ' + name : ''},`;
    const body = type === 'handyman'
        ? `I think I can help out with your handyman or plumbing needs.`
        : `I think I can help out with your pool.`;
    return `${greeting} ${body} What’s the best number to reach you at?`;
};

async function upsertMessage(
    table,
    { url, author, location, city = CITY, leadType, phone = null, email = null, physical_address = null },
    didSendMessage
) {
    if (didSendMessage) {
        await pool.query(
            `INSERT INTO ${table}
         (post_url, author, location, city, lead_type,
          message_sent, message_sent_at, phone, email, physical_address)
       VALUES ($1,$2,$3,$4,$5,true,NOW(),$6,$7,$8)
       ON CONFLICT (post_url) DO UPDATE
         SET message_sent     = EXCLUDED.message_sent,
             message_sent_at  = EXCLUDED.message_sent_at,
             phone            = COALESCE(EXCLUDED.phone, ${table}.phone),
             email            = COALESCE(EXCLUDED.email, ${table}.email),
             physical_address = COALESCE(EXCLUDED.physical_address, ${table}.physical_address)`,
            [url, author, location, city, leadType, phone, email, physical_address]
        );
    } else {
        await pool.query(
            `INSERT INTO ${table}
         (post_url, author, location, city, lead_type, message_sent,
          phone, email, physical_address)
       VALUES ($1,$2,$3,$4,$5,false,$6,$7,$8)
       ON CONFLICT (post_url) DO NOTHING`,
            [url, author, location, city, leadType, phone, email, physical_address]
        );
    }
}

async function saveMessagedPost(post, didSendMessage = false) {
    const { url, author, location, leadType } = post;


    if (!isValidPersonName(post.author)) {
        console.log(`⏭️ Not saving weak name "${post.author}"`);
        return;
    }

    try {
        console.log(
            `💾 Saving: url=${url}, author=${author}, loc=${location}, ` +
            `leadType=${leadType}, sent=${didSendMessage}`
        );
        await upsertMessage('nextdoor_messages', post, didSendMessage);
        await upsertMessage('recent_nextdoor_messages', post, didSendMessage);
    } catch (err) {
        console.error('❌ DB save failed:', err.message);
    }
}

async function pruneOldRecent() {
    await pool.query(`
    DELETE FROM recent_nextdoor_messages
     WHERE message_sent = true
       AND message_sent_at < NOW() - INTERVAL '7 days'
  `);
}

async function getTodaysDMCount(city) {
    const { rows } = await pool.query(
        `SELECT COUNT(*) FROM nextdoor_messages
      WHERE city = $1 AND message_sent = true AND message_sent_at::date = CURRENT_DATE`,
        [city]
    );
    return parseInt(rows[0].count || '0', 10);
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
    } catch { /* non-fatal */ }
}

async function goToPostsTab(page, searchTerm) {
    const ariaTab = page.getByRole('tab', { name: /^Posts$/i });
    if (await ariaTab.count()) { await ariaTab.first().click(); return; }

    const testId = page.locator('[data-testid="tab-posts"]');
    if (await testId.count()) { await testId.first().click(); return; }

    const textLink = page.locator('a,button', { hasText: /^Posts$/i }).first();
    if (await textLink.count()) { await textLink.click(); return; }

    await page.goto(`https://nextdoor.com/search/posts/?query=${encodeURIComponent(searchTerm)}`, { waitUntil: 'domcontentloaded' });
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
    const urls = posts.map(p => p.url);
    const { rows } = await pool.query(
        'SELECT post_url FROM nextdoor_messages WHERE post_url = ANY($1)',
        [urls]
    );
    const seen = new Set(rows.map(r => r.post_url));
    return posts.filter(p => !seen.has(p.url));
}

/* --------------------------- GPT Lead Classifier --------------------------- */
// NEW: just open a post and scrape author/location (no DM)
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

// NEW: actually send the DM once we’ve decided it’s OK to do so
async function sendDMOnProfile(page, messageText) {
    // we assume we’re already on the author’s profile page
    const selectors = [
        'button:has-text("Message")',
        'div[data-part="button"] div:has-text("Message")',
        'text=Message'
    ];
    for (const sel of selectors) {
        try {
            const btn = page.locator(sel).first();
            await btn.waitFor({ timeout: 8000 });
            await btn.click();
            await sleep(800);
            await page.fill('textarea', messageText);
            await page.keyboard.press('Enter');
            return true;
        } catch {}
    }
    return false;
}

async function classifyPosts(posts, labelType = 'pool') {
    if (!posts.length) return [];

    const SYSTEM_PROMPTS = {
        pool: `You’re classifying neighborhood posts. Label "lead" ONLY if the author is seeking pool/spa/hot tub service (cleaning, maintenance, equipment like pump/chlorinator/filter, green pool, quotes or recommendations for a pool pro). 
If it's about plumbing (toilets, sinks, faucets, water heaters, sewer, general leaks not clearly about a pool) or irrigation/sprinklers, label "not_lead".
Return ONLY JSON in input order: [{"label":"lead"|"not_lead","reason":"..."}]. Be strict.`,
        handyman: `You’re classifying neighborhood posts. Label "lead" ONLY if the author is seeking handyman or plumbing help (repairs, leaks, faucets, toilets, water heater, mounting, drywall, doors, tile, general recommendations).
If it's about pool/spa/hot tub maintenance or equipment, label "not_lead".
Return ONLY JSON in input order: [{"label":"lead"|"not_lead","reason":"..."}]. Be strict.`
    };


    const system = SYSTEM_PROMPTS[labelType] || SYSTEM_PROMPTS.pool;
    const user = `Posts:\n${posts.map((p, i) => `#${i + 1}\n${p.text}`).join('\n')}`;

    const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    });

    const raw = resp.choices?.[0]?.message?.content || '[]';
    try { return JSON.parse(raw); }
    catch {
        const m = raw.match(/\[[\s\S]*\]/);
        return m ? JSON.parse(m[0]) : posts.map(() => ({ label: 'not_lead', reason: 'parse error' }));
    }
}

/* ------------------------------ DM utilities ------------------------------ */


/* --------------------------- Melissa (TX only) ---------------------------- */
/** Short-lived Chrome instance just for Melissa lookup. */
async function melissaTX(author) {
    const name = (author || '').trim();
    if (!name || name.split(' ').length < 2) return { phone:null, email:null, physical_address:null };

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
        return { phone:null, email:null, physical_address:null };
    } finally {
        if (b) await b.close();
    }
}


/* --------------------------------- Main ----------------------------------- */

const runNextdoorAutomation = async () => {
    console.log('🏡  Running Nextdoor Automation...');

    // Persistent Chrome profile = stored cookies/session/address
    const useChrome = process.env.USE_CHROME === '1';
    const headless  = process.env.HEADLESS === '1';

    const launchOpts = {
        headless,
        viewport: { width: 1400, height: 900 },
        geolocation: { latitude: 33.0602, longitude: -96.7349 },
        permissions: ['geolocation'],
        timezoneId: 'America/Chicago',
        locale: 'en-US',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        args: [
            '--disable-blink-features=AutomationControlled',
            ...(headless ? ['--no-sandbox','--disable-dev-shm-usage'] : []),
        ]
    };

    const userDataDir = process.env.ND_PROFILE_DIR || path.resolve(__dirname, '../../.nd-profile-wylie');
    const context = await chromium.launchPersistentContext(
        userDataDir,
        useChrome ? { ...launchOpts, channel: 'chrome' } : launchOpts
    );


    await context.addInitScript(() => {
        // light stealth
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = window.chrome || { runtime: {} };
        Object.defineProperty(navigator, 'platform',  { get: () => 'MacIntel' });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    const page = await context.newPage();

    try {
        await ensureLoggedIn(page);

        // prune 7+ day old hot leads
        await pruneOldRecent();

        // Count for today (also re-checked after each DM)
        let dmCountToday = await getTodaysDMCount(CITY);
        console.log(`📊 ${dmCountToday} DMs already sent today in ${CITY}`);

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
            const leads = enriched.filter(p => p.label === 'lead');
            const keywordTighten = (type === 'pool')
                ? (p) => /\b(pool|spa|chlorine|skimmer|pump|filter|backwash|algae|acid|resurface|pebble|tiles?)\b/i.test(p.text)
                : () => true;

            const newLeads = await filterNewLeads(leads.filter(keywordTighten));

            if (!newLeads.length) {
                console.log(`⚠️ No clear new leads for: ${label}`);
                continue;
            }

            for (const [i, lead] of newLeads.entries()) {
                console.log(`(${i + 1}/${newLeads.length}) Visiting -> ${lead.url}`);

                // Always fetch author/location FIRST
                const { author, location } = await getAuthorAndLocation(page, lead.url);
                lead.author = author;
                lead.location = location;
                lead.leadType = type;

                // Enforce real last name before doing anything else
                if (!isValidPersonName(author)) {
                    console.log(`⏭️ Skipping weak name "${author}" (needs a real last name)`);
                    // You said: do NOT add to DB at all for last-initial-only names
                    continue;
                }

                // Build message
                const firstName = (author || '').split(' ')[0] || '';
                const text = dmTemplate(firstName, type);

                // Daily cap check
                let canDM = (await getTodaysDMCount(CITY)) < MAX_DMS_PER_DAY;

                let didSend = false;
                if (canDM) {
                    // Click author name to open profile, then DM
                    try {
                        // ensure we're on the profile page
                        const authorNameLink = page.locator('a[href*="/profile/"] span.Text_detailTitle__1cj4dca1c').first();
                        if (await authorNameLink.count()) {
                            await authorNameLink.click();
                            await sleep(2000);
                        }
                        didSend = await sendDMOnProfile(page, text);
                        console.log(`✅ DM Status: ${didSend ? 'dm_sent' : 'no_message_button'}`);
                    } catch (e) {
                        console.log('⚠️ DM attempt failed, will still consider enrichment/save as needed:', e.message);
                    }
                } else {
                    console.log(`🚫 DM cap (${MAX_DMS_PER_DAY}) reached — will enrich & save without sending.`);
                }

                // Enrichment policy:
                // - If DM sent: run Melissa
                // - If cap reached (or you want to enrich anyway), set ENRICH_WITHOUT_DM=1 to also enrich
                let phone = null, email = null, physical_address = null;
                const enrichAnyway = process.env.ENRICH_WITHOUT_DM === '1';
                if (didSend || enrichAnyway) {
                    const r = await melissaTX(author);
                    console.log('📇 Melissa:', r);
                    phone = r.phone; email = r.email; physical_address = r.physical_address;
                }

                // Save (true if DM sent, else false)
                await saveMessagedPost({
                    url: lead.url,
                    author,
                    location,
                    city: CITY,
                    leadType: type,
                    phone,
                    email,
                    physical_address
                }, didSend);

                await sleep(DM_PAUSE_MS);
            }

        }

    } catch (err) {
        console.error('❌ Fatal error:', err);
    } finally {
        console.log('🧼 Closing browser...');
        await context.close();
        console.log('✅ All automations completed');
    }
};

if (require.main === module) runNextdoorAutomation();
module.exports = runNextdoorAutomation;
