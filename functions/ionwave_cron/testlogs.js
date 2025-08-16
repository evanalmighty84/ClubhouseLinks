/**
 * Nextdoor pool-service lead finder + DM sender
 * ---------------------------------------------
 * ENV required:
 *   NEXTDOOR_USERNAME
 *   NEXTDOOR_PASSWORD
 * Optional:
 *   OPENAI_API_KEY  (only if you decide to use classifyPost() with OpenAI)
 *
 * Run:
 *   node index.js
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ---------- Config ----------
const DM_TEXT = `Hey, I think I can help out with your pool. What’s the best number to reach you at?`;
const SEARCH_QUERY = 'pool cleaner';
const MAX_POSTS = 10;               // how many posts to attempt
const OUT_DIR = path.resolve(process.cwd(), 'nd_out');

// ---------- Simple logger helpers ----------
const t = () => new Date().toISOString().slice(11, 23);
const i = (msg) => console.log(`i  [${t()}] ${msg}`);
const ok = (msg) => console.log(`✅ [${t()}] ${msg}`);
const w = (msg) => console.log(`△ [${t()}] ${msg}`);
const e = (msg) => console.log(`❌ [${t()}] ${msg}`);
const h = (title) => console.log(`\n========== ${title} ==========\n`);
const zzz = (ms) => new Promise(res => setTimeout(res, ms));

async function shot(page, name) {
    try {
        if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
        const file = path.join(OUT_DIR, `${name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`📸 Saved ${file}`);
    } catch (err) {
        w(`Could not save screenshot: ${err.message}`);
    }
}

// ---------- Low-level UI helpers ----------
async function waitForEditor(page, timeout = 6000) {
    // Chat editor textarea
    const editor = page.locator('textarea[data-testid="message-input"], textarea[aria-label="Send a message"]').first();
    try {
        await editor.waitFor({ state: 'visible', timeout });
        return editor;
    } catch {
        return null;
    }
}

async function getDrawer(page) {
    // The right-bottom drawer titled "Chats"
    const drawer = page.locator('div:has(> div:has-text("Chats"))').filter({ hasText: 'Chats' }).last();
    return (await drawer.count()) ? drawer : null;
}

async function expandDrawer(page) {
    const drawer = await getDrawer(page);
    if (!drawer) return null;

    // Try to expand if collapsed (there is often a caret button)
    const caret = drawer.locator('button,[role="button"]').filter({ has: page.locator('svg') }).first();
    try { await caret.click({ timeout: 500 }).catch(() => {}); } catch {}
    return drawer;
}

async function sniffAuthorName(page) {
    i('Sniffing author name from page…');
    // 1) direct /profile/ link
    let a = page.locator('a[href*="/profile/"]').first();
    if (await a.count()) {
        const t = (await a.textContent() || '').trim();
        if (t) { ok(`Author: ${t}`); return t; }
    }
    // 2) prominent name text near top
    const nameish = page.locator(':text-matches("^[A-Z][a-z]+\\s+[A-Z]", "i")').first();
    if (await nameish.count()) {
        const t = (await nameish.textContent() || '').trim();
        if (t) { ok(`Author (fallback): ${t}`); return t; }
    }
    w('Could not sniff author name.');
    return '';
}

// ---------- Create-a-chat dialog driver ----------
async function handleCreateChatDialog(page, recipientName) {
    i('Create-chat: waiting for dialog…');
    const dialog = page.locator('[role="dialog"]', { hasText: 'Create a chat' }).last();
    await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (!await dialog.isVisible()) { w('Create-chat: dialog not visible.'); await shot(page, 'create_chat_no_dialog'); return false; }

    // Search input
    let search = dialog.locator('input[data-testid="create-channel-user-search-input"]').first();
    if (!(await search.count())) search = dialog.locator('input[aria-label*="Search neighbors"]').first();
    if (!(await search.count())) search = dialog.locator('input[placeholder*="Add"]').first();
    if (!(await search.count())) { w('Create-chat: search input not found.'); await shot(page, 'create_chat_no_input'); return false; }

    let nameToType = (recipientName || '').trim();
    if (!nameToType) nameToType = await sniffAuthorName(page);
    if (!nameToType) { w('Create-chat: no recipient name to type.'); await shot(page, 'create_chat_no_name'); return false; }

    i(`Create-chat: typing "${nameToType}"…`);
    await search.click();
    await search.fill('');
    await search.type(nameToType, { delay: 18 });
    await zzz(450);

    // Select first result
    i('Create-chat: selecting first result…');
    let result = dialog.locator('[role="group"] [role="button"]').first();
    if (!(await result.count())) result = dialog.locator('[role="listbox"] [role="option"]').first();
    if (!(await result.count())) result = dialog.locator('ul li, [data-testid*="search-result"]').first();

    if (await result.count()) {
        await result.click().catch(()=>{});
        ok('Create-chat: selected a result.');
    } else {
        w('Create-chat: no visible result, trying keyboard…');
        await search.press('ArrowDown').catch(()=>{});
        await search.press('Enter').catch(()=>{});
    }
    await zzz(400);

    // Next button
    i('Create-chat: clicking Next…');
    let next = dialog.getByRole('button', { name: /^Next$/i }).first();
    if (!(await next.count())) next = dialog.locator('button:has(div[data-part="children"]:text("Next"))').first();
    if (!(await next.count())) { w('Create-chat: Next not found.'); await shot(page, 'create_chat_no_next'); return false; }

    const el = await next.elementHandle().catch(()=>null);
    if (el) {
        await page.waitForFunction(e => !e.getAttribute('aria-disabled'), el, { timeout: 4000 }).catch(()=>{});
    }
    await next.click().catch(()=>{});
    await zzz(600);

    // Editor should appear
    const editor = await waitForEditor(page, 6000);
    if (!editor) { w('Create-chat: editor not visible after Next.'); await shot(page, 'create_chat_no_editor'); return false; }

    ok('Create-chat: editor ready.');
    return true;
}

// ---------- Compose via drawer route ----------
async function composeInDrawer(page, authorName) {
    i('Drawer route: Compose → New message…');
    const drawer = (await expandDrawer(page)) || (await getDrawer(page));
    if (!drawer) { w('Drawer route: drawer not found.'); return false; }

    // "New message" or pencil icon
    let compose = drawer.locator('[aria-label*="New message"], [title*="New message"], [aria-label*="Compose"], [title*="Compose"]').first();
    if (!(await compose.count())) {
        const icon = drawer.locator('svg[data-icon*="compose"], svg[data-icon*="edit"], svg[data-icon*="pencil"]').first();
        if (await icon.count()) {
            const h = await icon.elementHandle();
            const clickable = await h.evaluateHandle(node => {
                let el = node;
                const clicky = e => e && (e.tagName === 'BUTTON' || e.getAttribute('role') === 'button' || (e.getAttribute && e.getAttribute('data-part') === 'tapArea'));
                while (el && el !== document.body) { if (clicky(el)) return el; el = el.parentElement; }
                return node;
            });
            await clickable.asElement().click().catch(()=>{});
        } else {
            compose = drawer.locator(':scope button,[role="button"],[data-part="tapArea"]').nth(0);
            if (await compose.count()) await compose.click().catch(()=>{});
        }
    } else {
        await compose.click().catch(()=>{});
    }
    await zzz(300);

    // Handle dialog or direct editor
    if (await page.locator('[role="dialog"]', { hasText: 'Create a chat' }).count()) {
        return await handleCreateChatDialog(page, authorName);
    }
    const editor = await waitForEditor(page, 5000);
    if (editor) { ok('Drawer route: editor already open.'); return true; }

    w('Drawer route: neither dialog nor editor appeared.');
    await shot(page, 'compose_no_editor_or_dialog');
    return false;
}

// ---------- DM core flow ----------
async function sendDM(page, postUrl, text, authorProfileUrl = '', authorName = '') {
    h('BLOCK D: DM SINGLE LEAD');
    i(`Navigating to post: ${postUrl}`);
    await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

    // 1) Try inline "Message" (e.g., hover card menu or profile quick action)
    i('Trying hover-card → Message…');
    // a) direct visible button
    let msgBtn = page.getByRole('button', { name: /^Message$/i }).first();
    if (!await msgBtn.count()) {
        // b) nested div-based button
        msgBtn = page.locator('button:has-text("Message"), [role="button"]:has-text("Message")').first();
    }

    if (await msgBtn.count()) {
        await msgBtn.click().catch(()=>{});
        ok('Clicked Message via role=button');
        i('Ensuring Chats drawer is expanded…');
        await expandDrawer(page);
    } else {
        w('Message button not found on post. Falling back routes…');

        // 2) Go to author profile and try there
        if (authorProfileUrl) {
            i('Going to profile → Message…');
            await page.goto(authorProfileUrl, { waitUntil: 'domcontentloaded' });
            const pMsg = page.getByRole('button', { name: /^Message$/i }).first();
            if (await pMsg.count()) {
                await pMsg.click().catch(()=>{});
                ok('Clicked Message on profile');
            } else {
                w('Profile: Message not found.');
            }
        }

        // 3) Drawer compose route (guaranteed present)
        i('Trying drawer → New message…');
        const okDrawer = await composeInDrawer(page, authorName);
        if (!okDrawer) {
            e('Compose/New message not found.');
            await shot(page, 'dm_no_message_button');
            return false;
        }
    }

    // Wait for chat editor
    const editor = await waitForEditor(page, 7000);
    if (!editor) {
        e('No message composer found');
        await shot(page, 'dm_no_composer');
        return false;
    }

    // Type and send
    i('Typing DM text…');
    await editor.click();
    await editor.fill(text);
    await zzz(200);

    // Try send button first
    let sendBtn = page.getByRole('button', { name: /Send message/i }).first();
    if (!await sendBtn.count()) {
        // arrow icon within the editor container
        sendBtn = page.locator('[aria-label="Send message"], [data-testid="send-button"]').first();
    }

    if (await sendBtn.count()) {
        await sendBtn.click().catch(()=>{});
    } else {
        // Fallback: Enter to send
        await editor.press('Enter').catch(()=>{});
    }

    ok('DM sent (or attempted send).');
    return true;
}

// ---------- Search + collect post links ----------
async function searchPosts(page, query) {
    h('BLOCK B: SEARCH');
    i('Waiting for search input…');
    const search = page.locator('input[aria-label="Search Nextdoor"]').first();
    await search.waitFor({ state: 'visible', timeout: 15000 });
    await search.click();
    await search.fill(query);
    await search.press('Enter');
    await page.waitForLoadState('domcontentloaded');
    ok('Search results loaded.');

    // Click the "Posts" tab explicitly
    i('Switching to Posts tab…');
    let postsTab = page.locator('a[data-testid="tab-posts"]').first();
    if (!await postsTab.count()) postsTab = page.locator('a[role="tab"][id$="-posts"]').first();
    if (!await postsTab.count()) postsTab = page.locator('a:has(span:has-text("Posts"))').first();

    if (await postsTab.count()) {
        await Promise.all([
            page.waitForLoadState('domcontentloaded'),
            postsTab.click()
        ]);
        ok('Posts tab opened.');
    } else {
        w('Posts tab element not found; hoping we are already on Posts.');
    }

    await zzz(800);

    // Collect post detail links
    const links = await page.$$eval('a[href*="/p/"]', as => {
        const seen = new Set();
        return as
            .map(a => a.getAttribute('href'))
            .filter(Boolean)
            .map(u => (u.startsWith('http') ? u : `https://nextdoor.com${u}`))
            .filter(u => { if (seen.has(u)) return false; seen.add(u); return true; });
    });

    ok(`Found ${links.length} potential post links.`);
    return links.slice(0, MAX_POSTS);
}

// ---------- Optional: simple classifier (stubbed to "true") ----------
async function classifyPost(_text) {
    // For now we assume it's a lead; wire to OpenAI if desired.
    return { isLead: true, reason: 'Seeking pool service or related help.' };

    /* Example (uncomment if you want the real thing):
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Decide if the post is someone looking for pool service.\n\nPost:\n"""${_text}"""\n\nReturn JSON: {"isLead": boolean, "reason": string}`;
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0
    });
    try {
      const json = JSON.parse(r.choices[0].message.content.trim());
      return json;
    } catch {
      return { isLead: true, reason: 'Fallback: assume lead.' };
    }
    */
}

// ---------- Login ----------
async function login(page) {
    h('BLOCK A: LOGIN');
    await page.goto('https://nextdoor.com/login', { waitUntil: 'domcontentloaded' });
    i('Login page loaded.');

    await page.fill('input[data-testid="email-address-input"]', process.env.NEXTDOOR_USERNAME);
    await page.fill('input[data-testid="password-input"]', process.env.NEXTDOOR_PASSWORD);

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click('button[data-testid="signin_button"]')
    ]);

    // Confirm home loaded
    await page.waitForSelector('input[aria-label="Search Nextdoor"]', { timeout: 15000 });
    ok('Logged in & dashboard ready.');
}

// ---------- Main ----------
async function run() {
    h('BLOCK 0: START');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await login(page);

        const postLinks = await searchPosts(page, SEARCH_QUERY);
        if (!postLinks.length) {
            w('No post links found on Posts tab.');
            await shot(page, 'no_posts_found');
            return;
        }

        h('BLOCK C: CLASSIFY & PRINT');
        let leads = [];
        for (let idx = 0; idx < postLinks.length; idx++) {
            const url = postLinks[idx];
            // Open each quickly to grab a snippet (lightweight)
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            const snippet = await page.locator('[data-testid="post-body"], [data-testid*="post"]')
                .first().textContent().catch(()=>'');

            const { isLead, reason } = await classifyPost(snippet || '');
            console.log(`#${idx + 1} ${url}`);
            console.log(`Reason: ${reason}`);
            console.log(`DM: ${DM_TEXT}\n`);

            if (isLead) leads.push({ url, reason });
            await zzz(150);
        }

        if (!leads.length) { w('No qualifying leads after classification.'); return; }

        h('BLOCK D: DM LOOP');
        for (let j = 0; j < leads.length; j++) {
            const { url } = leads[j];
            console.log(`( ${j + 1}/${leads.length} ) Contacting: ${url}`);

            // Try to sniff author name/profile if we can
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            let authorName = await sniffAuthorName(page);
            // Try to derive profile url from author link
            let authorProfileUrl = '';
            const authorLinkHandle = await page.locator('a[href*="/profile/"]').first();
            if (await authorLinkHandle.count()) {
                authorProfileUrl = await authorLinkHandle.getAttribute('href');
                if (authorProfileUrl && !authorProfileUrl.startsWith('http')) {
                    authorProfileUrl = `https://nextdoor.com${authorProfileUrl}`;
                }
            }

            const success = await sendDM(page, url, DM_TEXT, authorProfileUrl, authorName);
            if (!success) {
                e('DM failed: No message button/composer found (all routes tried)');
                await shot(page, `dm_fail_${j + 1}`);
            }

            // Be gentle
            await zzz(1200);
        }
    } catch (err) {
        e(`Fatal error: ${err.message}`);
        await shot(page, 'fatal_error');
    } finally {
        await browser.close();
        ok('Browser closed');
        h('SUMMARY');
    }
}

if (require.main === module) {
    run();
}

module.exports = { run };
