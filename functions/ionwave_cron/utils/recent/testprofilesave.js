// nd_login_and_save_state.js
// Logs into Nextdoor using env creds, then saves cookies/localStorage to nd-storage.json.
// Portable: uses /data on Railway, OS tmp locally.

const { chromium } = require('playwright');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

(async () => {
    // ======== CONFIG via ENV ========
    const SLOT = (process.env.RUN_SLOT || 'morning').toLowerCase();   // "morning" | "afternoon"
    const HEADLESS = process.env.HEADLESS === '1';                    // set 0 to debug interactively
    const USE_CHROME = process.env.USE_CHROME === '1';
    const USER = process.env.NEXTDOOR_USERNAME || process.env.NEXTDOOR_EMAIL;
    const PASS = process.env.NEXTDOOR_PASSWORD;
    const PROXY_URL =
        process.env[`PROXY_URL_${SLOT.toUpperCase()}`] ||
        process.env.PROXY_URL || ''; // e.g. http://centerbeam.proxy.rlwy.net:54829 or http://user:pass@host:port
    // =================================

    if (!USER || !PASS) {
        console.error('❌ Set NEXTDOOR_USERNAME and NEXTDOOR_PASSWORD in env.');
        process.exit(1);
    }

    // Portable profile dir: /data on Railway; OS tmp locally
    const baseDefault = fs.existsSync('/data') ? '/data' : os.tmpdir();
    let ND_PROFILE_DIR =
        process.env[`ND_PROFILE_DIR_${SLOT.toUpperCase()}`] ||
        process.env.ND_PROFILE_DIR ||
        path.join(baseDefault, `.nd-profile-${SLOT}`);

    try {
        fs.mkdirSync(ND_PROFILE_DIR, { recursive: true });
    } catch (err) {
        console.warn(`⚠️ Failed to ensure ${ND_PROFILE_DIR}: ${err.message}`);
        ND_PROFILE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), `.nd-profile-${SLOT}-`));
    }
    console.log(`📁 Profile dir: ${ND_PROFILE_DIR}`);
    console.log(`🌐 Proxy: ${PROXY_URL ? 'enabled' : 'disabled'} ${PROXY_URL ? `(${PROXY_URL})` : ''}`);
    console.log(`🧪 Headless: ${HEADLESS ? 'yes' : 'no'} | Chrome channel: ${USE_CHROME ? 'yes' : 'no'}`);

    const baseLaunchOpts = {
        headless: HEADLESS,
        viewport: { width: 1400, height: 900 },
        geolocation: { latitude: 33.0602, longitude: -96.7349 },
        permissions: ['geolocation'],
        timezoneId: 'America/Chicago',
        locale: 'en-US',
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        args: [
            '--disable-blink-features=AutomationControlled',
            ...(HEADLESS ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
        ],
        ...(PROXY_URL ? { proxy: { server: PROXY_URL } } : {}),
    };

    const opts = USE_CHROME ? { ...baseLaunchOpts, channel: 'chrome' } : baseLaunchOpts;
    const context = await chromium.launchPersistentContext(ND_PROFILE_DIR, opts);

    // Minimal stealth
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // @ts-ignore
        window.chrome = window.chrome || { runtime: {} };
        Object.defineProperty(navigator, 'platform',  { get: () => 'MacIntel' });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    const page = await context.newPage();
    page.setDefaultTimeout(45_000);
    page.setDefaultNavigationTimeout(60_000);

    // Helper: find first existing selector
    const findFirst = async (p, arr) => {
        for (const s of arr) if (await p.locator(s).first().count()) return s;
        return null;
    };

    try {
        // Go to login with redirect to feed
        await page.goto('https://nextdoor.com/login/?next=/news_feed/', { waitUntil: 'domcontentloaded' });

// Detect the "blank card" / Join Nextdoor interstitial
        if (await page.locator('text=New here? Join Nextdoor').count()) {
            console.log('ℹ️ Got join page, forcing reload of login form...');
            await page.goto('https://nextdoor.com/login/?allow_login=true&next=/news_feed/', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1500);
        }


        // Accept cookie/consent if present
        try {
            const acceptSel = [
                'button:has-text("Accept")',
                'button:has-text("I agree")',
                'button:has-text("Allow all")',
                '[data-testid="cookie-accept"]',
            ];
            const b = page.locator(acceptSel.join(', ')).first();
            if (await b.count()) await b.click({ timeout: 2000 }).catch(() => {});
        } catch {}

        // Resolve login selectors
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

        const emailSel = await findFirst(page, emailSelectors);
        const passSel  = await findFirst(page, passSelectors);
        const btnSel   = await findFirst(page, loginBtnSelectors);

        if (!emailSel || !passSel || !btnSel) {
            // Already logged in?
            if (await page.locator('[data-testid="home-feed"], input[aria-label="Search Nextdoor"]').first().count()) {
                console.log('✅ Already on feed');
            } else {
                throw new Error('Login form not found. Selectors may have changed.');
            }
        } else {
            console.log(`🔐 Using login selectors: email="${emailSel}", pass="${passSel}", btn="${btnSel}"`);

            // Human-ish typing
            await page.locator(emailSel).click();
            await page.keyboard.type(USER, { delay: 40 });
            await page.locator(passSel).click();
            await page.keyboard.type(PASS, { delay: 45 });

            // Click and wait for any success signal
            await Promise.allSettled([page.click(btnSel)]);
            await Promise.race([
                page.waitForURL(/news_feed|choose_address|login/i, { timeout: 60000 }),
                page.waitForLoadState('domcontentloaded',          { timeout: 60000 }),
                page.waitForSelector('[data-testid="home-feed"], input[aria-label="Search Nextdoor"]', { timeout: 60000 }),
            ]);
            console.log('➡️ Post-login URL:', page.url());

            // If still on login, capture hint and bail
            if (/\/login/i.test(page.url())) {
                const errSel = [
                    '[data-testid="signin_error"]',
                    '[role="alert"]',
                    'div:has-text("verify")',
                    'div:has-text("suspicious")',
                    'div:has-text("couldn’t sign you in")',
                    'div:has-text("Incorrect")',
                ].join(', ');
                let errText = '';
                try { errText = await page.locator(errSel).first().innerText({ timeout: 1500 }); } catch {}
                try { await page.screenshot({ path: `login_stuck_${Date.now()}.png`, fullPage: true }); } catch {}
                console.log('📸 Saved screenshot; still on login page.');
                if (errText) console.log('🔎 Login error text:', errText);

                // Show cookie names so we see if any auth cookie was set
                const cookies = await context.cookies();
                const ndCookies = cookies.filter(c => /\.?nextdoor\.com$/.test(c.domain));
                console.log('🍪 ND cookies:', ndCookies.map(c => c.name).join(', ') || '(none)');

                throw new Error('Login rejected or blocked (likely IP reputation).');
            }
        }

        // At this point, we should be at feed (or allowed through).
        // Save storage state for reuse.
        const storagePath = process.env.ND_STORAGE_PATH || path.join(process.cwd(), 'nd-storage.json');
        await context.storageState({ path: storagePath });
        console.log(`💾 Saved storage state to ${storagePath}`);

    } catch (err) {
        console.error('❌ Test failed:', err.message);
    } finally {
        console.log('⏳ Waiting 30s before closing (debug mode)…');
        await new Promise(r => setTimeout(r, 30_000));
        await context.close();
        console.log('✅ Done');
    }
})();
