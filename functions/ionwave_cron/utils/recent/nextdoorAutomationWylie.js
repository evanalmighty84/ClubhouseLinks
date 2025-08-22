
require('dotenv').config();
const { chromium } = require('playwright');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey:'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'})

function dmTemplate(name) {
    return `Hey${name ? ' ' + name : ''}, I think I can help out with your pool. What’s the best number to reach you at?`;
}

async function maybeDismissOverlays(page) {
    // Cookie / consent / “allow location” interstitials sometimes cover the tabs.
    const candidates = [
        'button:has-text("Accept")',
        'button:has-text("Agree")',
        'button:has-text("Got it")',
        'button:has-text("Allow")',
        'button[aria-label*="accept"]',
    ];
    for (const sel of candidates) {
        const el = page.locator(sel).first();
        if (await el.count().catch(() => 0)) {
            await el.click({ timeout: 1000 }).catch(() => {});
            await page.waitForTimeout(300);
        }
    }
}

async function goToPostsTab(page) {
    // 1) Prefer ARIA role
    const ariaTab = page.getByRole('tab', { name: /^Posts$/i });
    if (await ariaTab.count().catch(() => 0)) {
        await ariaTab.first().click();
        return 'clicked aria tab';
    }

    // 2) data-testid fallback
    const testId = page.locator('[data-testid="tab-posts"]');
    if (await testId.count().catch(() => 0)) {
        await testId.first().click();
        return 'clicked data-testid';
    }

    // 3) If tablist exists but tab is off-screen, scroll it
    const tablist = page.locator('div[role="tablist"][aria-orientation="horizontal"]');
    if (await tablist.count().catch(() => 0)) {
        await tablist.evaluate(el => { el.scrollLeft = el.scrollWidth; });
        await page.waitForTimeout(200);
        const link = tablist.getByRole('tab', { name: /^Posts$/i });
        if (await link.count().catch(() => 0)) {
            await link.first().click();
            return 'scrolled & clicked';
        }
        // generic descendant text finder
        const textLink = tablist.locator('a,button', { hasText: /^Posts$/i });
        if (await textLink.count().catch(() => 0)) {
            await textLink.first().click();
            return 'scrolled & clicked (text)';
        }
    }

    // 4) Final fallback: navigate straight to the Posts results
    const url = new URL(page.url());
    const q = url.searchParams.get('query') || 'pool cleaner';
    const base = `${url.origin || 'https://nextdoor.com'}`;
    const target = `${base}/search/posts/?query=${encodeURIComponent(q)}`;
    await page.goto(target, { waitUntil: 'domcontentloaded' });
    return 'direct nav to /search/posts';
}

async function scrapePostsOnPage(page, limit = 30) {
    await page.waitForTimeout(800);
    for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 1600);
        await page.waitForTimeout(300);
    }

    const posts = await page.$$eval('a[href*="/p/"], a[href*="/posting/"]', (links) => {
        const seen = new Set();
        const out = [];
        for (const a of links) {
            const href = a.getAttribute('href');
            if (!href) continue;
            const abs = href.startsWith('http') ? href : new URL(href, location.origin).href;
            if (seen.has(abs)) continue;
            seen.add(abs);
            const root = a.closest('article') || a.closest('[role="article"]') || a;
            const text = (root?.innerText || '').replace(/\s+/g, ' ').trim();
            const authorEl =
                root?.querySelector('[data-testid="author-name"]') ||
                root?.querySelector('a[href*="/profile/"], [class*="author"]');
            const author = (authorEl?.textContent || '').trim();
            if (text && text.length > 20) out.push({ url: abs, text, author });
        }
        return out;
    });

    return posts.slice(0, limit);
}

async function classifyPosts(posts) {
    if (!posts.length) return [];
    const system = `Label each post as "lead" if the author is seeking pool service/cleaning/repair or a recommendation/quote; otherwise "not_lead". Return ONLY JSON array in input order: [{"label":"lead"|"not_lead","reason":"..."}]. Be strict.`;
    const user = `Posts:\n${posts.map((p, i) => `#${i + 1}\n${p.text}`).join('\n')}`;

    const resp = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        .chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ]
        });

    const raw = resp.choices?.[0]?.message?.content || '[]';
    try { return JSON.parse(raw); }
    catch { const m = raw.match(/\[[\s\S]*\]/); return m ? JSON.parse(m[0]) : posts.map(() => ({ label: 'not_lead', reason: 'parse error' })); }
}

const runNextdoorAutomation = async () => {
    console.log('🚀 Starting Nextdoor automation...');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } }); // wide so tabs don't collapse
    const page = await context.newPage();

    try {
        // Login
        await page.goto('https://nextdoor.com/login', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('input[data-testid="email-address-input"]', { timeout: 15000 });
        await page.fill('input[data-testid="email-address-input"]', process.env.NEXTDOOR_USERNAME);
        await page.fill('input[data-testid="password-input"]', process.env.NEXTDOOR_PASSWORD);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('button[data-testid="signin_button"]')
        ]);

        await page.waitForSelector('input[aria-label="Search Nextdoor"]', { timeout: 20000 });
        console.log('✅ Logged in');

        // Search
        await page.fill('input[aria-label="Search Nextdoor"]', 'pool cleaner');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('domcontentloaded');
        await maybeDismissOverlays(page);

        // Posts tab (robust)
        const how = await goToPostsTab(page);
        console.log('🧭 Posts navigation via:', how);
        await page.waitForLoadState('domcontentloaded');
        await maybeDismissOverlays(page);

        // Scrape + classify
        const posts = await scrapePostsOnPage(page, 30);
        console.log(`📄 Collected ${posts.length} posts`);
        const labels = await classifyPosts(posts);
        const enriched = posts.map((p, i) => ({ ...p, ...(labels[i] || {}) }));

        const leads = enriched.filter(p => p.label === 'lead');
        console.log(`\n🎯 Leads detected: ${leads.length}`);
        for (const [i, lead] of leads.entries()) {
            const first = (lead.author || '').split(' ')[0] || '';
            console.log(`\n#${i + 1}  ${lead.url}`);
            console.log(`Reason: ${lead.reason}`);
            console.log(`DM: ${dmTemplate(first)}`);
        }

        if (!leads.length) console.log('\n(No clear pool-service asks found. Try a different query or load more results.)');

    } catch (err) {
        console.error('❌ Error:', err);
        try { await page.screenshot({ path: 'posts_tab_fail.png', fullPage: true }); console.log('📸 Saved posts_tab_fail.png'); } catch {}
    } finally {
        await browser.close();
        console.log('🧼 Browser closed');
    }
};

if (require.main === module) runNextdoorAutomation();
module.exports = runNextdoorAutomation;