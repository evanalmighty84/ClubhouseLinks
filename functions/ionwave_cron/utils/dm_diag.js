// dm_diag.js
require('dotenv').config();
const { chromium } = require('playwright');

const DM_URL = process.env.DM_TEST_URL || 'https://nextdoor.com/p/TmR_kjbRyn-z?view=detail&init_source=search&query=pool%20cleaner';
const AUTHOR_NAME_HINT = process.env.DM_AUTHOR_HINT || 'Dedee'; // optional partial name

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

(async () => {
    const browser = await chromium.launch({ headless: false });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    const logCounts = async (where) => {
        const counts = {
            msgBtn: await page.locator('button:has-text("Message"), a:has-text("Message"), [role="button"]:has-text("Message"), div.BaseButton__emelwr2:has-text("Message"), div[data-part="button"]:has-text("Message"), div:has(> div[data-part="children"]:has-text("Message"))').count(),
            drawer: await page.getByText(/^Chats$/).count(),
            editorStream: await page.locator('textarea[data-testid="message-input"]').count(),
            editorAny: await page.locator('.str-chat__message-textarea textarea, .str-chat__textarea__textarea, [contenteditable="true"], div[role="textbox"], textarea').count(),
            sendArrow: await page.locator('[role="button"][aria-label="Send message"]').count(),
            composeNew: await page.locator('button:has-text("New message"), [aria-label="New message"]').count(),
        };
        console.log(`🧪 ${where}:`, counts);
    };

    try {
        // Login
        await page.goto('https://nextdoor.com/login', { waitUntil: 'domcontentloaded' });
        await page.fill('input[data-testid="email-address-input"]', process.env.NEXTDOOR_USERNAME);
        await page.fill('input[data-testid="password-input"]', process.env.NEXTDOOR_PASSWORD);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('button[data-testid="signin_button"]')
        ]);

        // Go to test post
        await page.goto(DM_URL, { waitUntil: 'domcontentloaded' });
        await sleep(700);
        await logCounts('after post load');

        // 1) Try click Message on post/profile
        const clicked = await (async () => {
            const sel = 'button:has-text("Message"), a:has-text("Message"), [role="button"]:has-text("Message"), div.BaseButton__emelwr2:has-text("Message"), div[data-part="button"]:has-text("Message"), div:has(> div[data-part="children"]:has-text("Message"))';
            const el = page.locator(sel).first();
            if (await el.count()) { await el.click().catch(()=>{}); await sleep(700); return true; }
            // overflow
            const more = page.locator('button[aria-haspopup="menu"], button[aria-label*="More"], button:has-text("..."), button:has-text("…")').first();
            if (await more.count()) { await more.click().catch(()=>{}); await sleep(200);
                const item = page.locator('text=/^Message(\\s+author)?$/i').first();
                if (await item.count()) { await item.click().catch(()=>{}); await sleep(700); return true; }
            }
            // author profile click
            const author = page.locator('[data-testid="author-name"] a, a[href*="/profile/"]').first();
            if (await author.count()) { await author.click(); await page.waitForLoadState('domcontentloaded'); await sleep(500);
                const el2 = page.locator(sel).first();
                if (await el2.count()) { await el2.click().catch(()=>{}); await sleep(700); return true; }
            }
            return false;
        })();
        await logCounts('after trying Message');

        // 2) If no drawer/editor, try drawer → New message → search by name
        const needCompose = !(await page.locator('textarea[data-testid="message-input"]').count());
        if (needCompose) {
            const drawerHeader = page.getByText(/^Chats$/).first();
            if (await drawerHeader.count()) {
                const compose = page.locator('button:has-text("New message"), [aria-label="New message"]').first();
                if (await compose.count()) { await compose.click().catch(()=>{}); await sleep(400); }
                const drawer = drawerHeader.locator('xpath=ancestor::*[self::section or self::aside or self::div][1]');
                let search = drawer.locator('input[placeholder*="Search"], input[type="search"], input[aria-label*="Search"]').first();
                if (!(await search.count())) search = drawer.locator('input').first();
                if (await search.count()) {
                    await search.fill('');
                    await search.type(AUTHOR_NAME_HINT, { delay: 20 }).catch(()=>{});
                    await sleep(600);
                    const first = drawer.locator('[role="listbox"] [role="option"], ul li, [data-testid*="search-result"]').first();
                    if (await first.count()) { await first.click().catch(()=>{}); await sleep(500); }
                }
            }
        }
        await logCounts('after compose attempt');

        // 3) Dump the DOM I need
        const drawer = page.getByText(/^Chats$/).first().locator('xpath=ancestor::*[self::section or self::aside or self::div][1]');
        const dump = async (loc, name) => {
            if (!loc) return;
            try {
                const html = await loc.evaluate(el => el.outerHTML).catch(()=>null);
                if (html) {
                    const fs = require('fs'); fs.writeFileSync(`${name}.html`, html, 'utf8');
                    console.log(`📝 wrote ${name}.html`);
                }
            } catch {}
        };

        await dump(drawer, 'chat_drawer');
        await dump(page.locator('textarea[data-testid="message-input"]').first(), 'editor_textarea');
        await dump(page.locator('[role="button"][aria-label="Send message"]').first(), 'send_button');

        // 4) Screenshots
        await page.screenshot({ path: 'dm_diag_full.png', fullPage: true });
        console.log('📸 saved dm_diag_full.png');

    } catch (e) {
        console.error('❌ diag error', e);
    } finally {
        await page.close();
        await ctx.close();
        await browser.close();
    }
})();
