// index.js
require('dotenv').config();
const { chromium } = require('playwright');
const OpenAI = require('openai');
const pool = require('./../../db/db');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DM_PAUSE_MS = 1500;
const CITY = 'The Colony';

const SEARCH_TERMS = [
    { label: 'Pool Cleaner', query: 'pool cleaner', type: 'pool' },
    { label: 'Pool Maintenance', query: 'pool maintenance', type: 'pool' },
    { label: 'Handyman Plumber', query: 'handyman plumber', type: 'handyman', needsMostRecent: true }
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const dmTemplate = (name, type = 'pool') => {
    const greeting = `Hey${name ? ' ' + name : ''},`;
    const body = type === 'handyman'
        ? `I think I can help out with your handyman or plumbing needs.`
        : `I think I can help out with your pool.`;
    return `${greeting} ${body} What’s the best number to reach you at?`;
};

async function clickMostRecentFilter(page) {
    try {
        // Click the "Sort By" dropdown (it's a <div>, not a <button>)
        const sortByDropdown = page.locator('div[role="button"][aria-label="Sort By"]');
        await sortByDropdown.waitFor({ timeout: 8000 });
        await sortByDropdown.click();
        console.log('📂 Opened "Sort By" filter');

        // Wait a moment for the menu to render
        await page.waitForTimeout(1000);

        // Click "Most Recent" from the dropdown options
        const mostRecentOption = page.locator('div[role="menuitem"] span:text("Most Recent")');
        await mostRecentOption.waitFor({ timeout: 5000 });
        await mostRecentOption.click();
        console.log('✅ Clicked "Most Recent" filter');

        // Let results reload
        await page.waitForTimeout(2000);
    } catch (err) {
        console.warn('⚠️ Could not click Most Recent filter:', err.message);
    }
}



async function filterNewLeads(posts) {
    const urls = posts.map(p => p.url);
    const { rows } = await pool.query(
        'SELECT post_url FROM nextdoor_messages WHERE post_url = ANY($1)',
        [urls]
    );
    const seenUrls = new Set(rows.map(row => row.post_url));
    return posts.filter(p => !seenUrls.has(p.url));
}

async function saveMessagedPost(post) {
    const { url, author, location, city = 'Allen', leadType } = post;

    try {
        console.log(`💾 Saving to DB: URL=${url}, Author=${author}, Location=${location}, LeadType=${leadType}`);

        await pool.query(
            `INSERT INTO nextdoor_messages (post_url, author, location, city, lead_type)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (post_url) DO NOTHING`,
            [url, author, location, city, leadType]
        );
    } catch (err) {
        console.error('❌ Failed to save messaged post:', err.message);
    }
}


async function goToPostsTab(page, searchTerm) {
    const ariaTab = page.getByRole('tab', { name: /^Posts$/i });
    if (await ariaTab.count()) { await ariaTab.first().click(); return; }

    const testId = page.locator('[data-testid="tab-posts"]');
    if (await testId.count()) { await testId.first().click(); return; }

    const tablist = page.locator('div[role="tablist"][aria-orientation="horizontal"]');
    if (await tablist.count()) {
        await tablist.evaluate(el => el.scrollLeft = el.scrollWidth);
        await sleep(200);
    }

    const textLink = page.locator('a,button', { hasText: /^Posts$/i }).first();
    if (await textLink.count()) { await textLink.click(); return; }

    await page.goto(`https://nextdoor.com/search/posts/?query=${encodeURIComponent(searchTerm)}`, { waitUntil: 'domcontentloaded' });
}

async function scrapePostsOnPage(page, limit = 30) {
    for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 1600);
        await sleep(350);
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

async function classifyPosts(posts, labelType = 'pool') {
    if (!posts.length) return [];

    const SYSTEM_PROMPTS = {
        pool: `Label each post as "lead" if the author is seeking pool service/cleaning/repair or a recommendation/quote; otherwise "not_lead". Return ONLY JSON in input order: [{"label":"lead"|"not_lead","reason":"..."}]. Be strict.`,
        handyman: `Label each post as "lead" if the author is seeking handyman or plumbing services, repairs, help with fixtures, installations, or recommendations; otherwise "not_lead". Return ONLY JSON in input order: [{"label":"lead"|"not_lead","reason":"..."}]. Be strict.`
    };

    const system = SYSTEM_PROMPTS[labelType] || SYSTEM_PROMPTS.pool;
    const user = `Posts:\n${posts.map((p, i) => `#${i + 1}\n${p.text}`).join('\n')}`;

    const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    });

    const raw = resp.choices?.[0]?.message?.content || '[]';
    try {
        return JSON.parse(raw);
    } catch {
        const m = raw.match(/\[[\s\S]*\]/);
        return m ? JSON.parse(m[0]) : posts.map(() => ({ label: 'not_lead', reason: 'parse error' }));
    }
}

const sendDM = async (page, postUrl, messageText) => {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    let author = 'UNKNOWN';
    let location = 'UNKNOWN';

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

    try {
        const authorNameLink = page.locator('a[href*="/profile/"] span.Text_detailTitle__1cj4dca1c').first();
        await authorNameLink.waitFor({ timeout: 10000 });
        await authorNameLink.click();
        await sleep(3000);
    } catch {
        return { status: 'author_click_failed', author, location };
    }

    const buttonSelectors = [
        'button:has-text("Message")',
        'div[data-part="button"] div:has-text("Message")',
        'text=Message'
    ];

    for (const selector of buttonSelectors) {
        try {
            const messageButton = page.locator(selector);
            await messageButton.first().waitFor({ timeout: 10000 });
            await messageButton.first().click();
            await sleep(1000);
            await page.fill('textarea', messageText);
            await page.keyboard.press('Enter');
            return { status: 'dm_sent', author, location };
        } catch {}
    }

    return { status: 'no_message_button', author, location };
};

const runNextdoorAutomation = async () => {
    console.log('🚀 Starting Nextdoor automation...');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    try {
        await page.goto('https://nextdoor.com/login', { waitUntil: 'domcontentloaded' });
        await page.fill('input[data-testid="email-address-input"]', process.env.NEXTDOOR_USERNAME);
        await page.fill('input[data-testid="password-input"]', process.env.NEXTDOOR_PASSWORD);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('button[data-testid="signin_button"]')
        ]);
        console.log('✅ Logged in');

        for (const { label, query, type, needsMostRecent } of SEARCH_TERMS) {
            console.log(`🔍 Searching for: ${label}`);

            await page.waitForSelector('input[aria-label="Search Nextdoor"]', { timeout: 15000 });
            await page.fill('input[aria-label="Search Nextdoor"]', query);
            await page.keyboard.press('Enter');
            await page.waitForLoadState('domcontentloaded');
            await sleep(4000);

            await goToPostsTab(page, query);
            if (needsMostRecent) await clickMostRecentFilter(page);
            await sleep(3000);

            const posts = await scrapePostsOnPage(page, 30);
            const labels = await classifyPosts(posts, type);
            const enriched = posts.map((p, i) => ({ ...p, ...(labels[i] || {}) }));
            const leads = enriched.filter(p => p.label === 'lead');
            const newLeads = await filterNewLeads(leads);

            if (!newLeads.length) {
                console.log(`⚠️ No clear leads found for: ${label}`);
                continue;
            }

            for (const [i, lead] of newLeads.entries()) {
                const name = (lead.author || '').split(' ')[0] || '';
                const text = dmTemplate(name, type);
                console.log(`(${i + 1}/${newLeads.length}) Contacting: ${lead.url}`);

                try {
                    const { status, author, location } = await sendDM(page, lead.url, text);
                    console.log(`✅ DM Status: ${status}`);
                    lead.author = author;
                    lead.location = location;
                    lead.leadType = type;
                    await saveMessagedPost(lead);
                } catch (err) {
                    console.error(`❌ DM failed: ${err.message}`);
                    try {
                        await page.screenshot({ path: `dm_fail_${i + 1}.png`, fullPage: true });
                    } catch {}
                }

                await sleep(DM_PAUSE_MS);
            }
        }

    } catch (err) {
        console.error('❌ Fatal error:', err);
    } finally {
        console.log('🧼 Closing browser...');
        await browser.close();
        console.log('✅ All automations completed');
    }
};

if (require.main === module) runNextdoorAutomation();
module.exports = runNextdoorAutomation;
