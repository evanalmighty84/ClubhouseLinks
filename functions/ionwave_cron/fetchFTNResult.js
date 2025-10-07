// ftn_manual_playwright.mjs
// Usage: node ftn_manual_playwright.mjs "First" "Last" "TX" "City" "Neighborhood"
// Example: node ftn_manual_playwright.mjs Isiah Ichmel TX Allen "Heritage Estates"

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { chromium } from 'playwright';

const NAV_TIMEOUT_MS = 45000;
const STEALTH_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const USER_DATA_DIR = process.env.ND_PROFILE_DIR || path.join(process.cwd(), 'nd-ftn-profile');
const STORAGE_STATE_FILE = path.join(USER_DATA_DIR, 'storageState.json');

function promptEnter(msg = 'Press ENTER to continue') {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(`${msg}\n`, () => { rl.close(); resolve(); }));
}

async function isCaptchaPresent(page) {
    // Run inside page to check for common captcha artifacts
    return await page.evaluate(() => {
        try {
            const bodyText = (document.body && document.body.innerText) ? document.body.innerText.toLowerCase() : '';
            // look for common widget iframes or markup
            const iframe = Array.from(document.querySelectorAll('iframe')).find(ifr => {
                const src = ifr.getAttribute('src') || '';
                return src.includes('hcaptcha') || src.includes('api2/anchor') || src.includes('turnstile') || src.includes('recaptcha');
            });
            const hasHcaptchaDiv = !!document.querySelector('.h-captcha, #h-captcha, [data-hcaptcha]');
            const hasCaptchaForm = !!document.querySelector('form#captchaForm, form[action*="captchasubmit"], [id^="captcha"]');
            const textIndicators = bodyText.includes('verify you are human') || bodyText.includes('are you a human') || bodyText.includes('please verify') || bodyText.includes('please complete the captcha');
            return Boolean(iframe || hasHcaptchaDiv || hasCaptchaForm || textIndicators);
        } catch (e) {
            return false;
        }
    });
}

async function waitForCaptchaToDisappear(page, timeoutMs = 5 * 60 * 1000) {
    const start = Date.now();
    // check every 1.5s
    while (Date.now() - start < timeoutMs) {
        const present = await isCaptchaPresent(page);
        if (!present) return true;
        await new Promise(r => setTimeout(r, 1500));
    }
    return false;
}

function extractPhone(text) {
    // simple phone regex, returns first match normalized
    const m = text.match(/(\+?\d{1,2}[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    return m ? m[0].trim() : null;
}

async function run() {
    const [,, firstArg, lastArg, stateArg, baseCityArg, neighborhoodArg] = process.argv;
    const first = firstArg || 'Isiah';
    const last = lastArg || 'Ichmel';
    const state = (stateArg || 'TX').toUpperCase();
    const baseCity = baseCityArg || 'Allen';
    const neighborhood = neighborhoodArg || 'Heritage Estates';

    console.log('🎯 Searching for:', { first, last, state, baseCity, neighborhood });
    console.log('📁 userDataDir:', USER_DATA_DIR);

    // ensure dir exists
    try { fs.mkdirSync(USER_DATA_DIR, { recursive: true }); } catch (e) {}

    // launch persistent context so cookies persist across runs
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        args: ['--disable-dev-shm-usage', '--ignore-certificate-errors'],
        userAgent: STEALTH_UA,
        viewport: { width: 1400, height: 900 },
        locale: 'en-US',
        timezoneId: 'America/Chicago',
    });

    context.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    context.setDefaultTimeout(NAV_TIMEOUT_MS);

    const page = await context.newPage();

    try {
        // 1) Navigate to homepage (this will commonly show Cloudflare/hCaptcha if blocked)
        console.log('🌐 Navigating to FamilyTreeNow homepage...');
        await page.goto('https://www.familytreenow.com/', { waitUntil: 'domcontentloaded' });

        // 2) Detect CAPTCHA
        const captchaNow = await isCaptchaPresent(page);
        if (captchaNow) {
            console.log('⚠️ CAPTCHA detected on the homepage. Please solve it in the opened browser window.');

            // if storage state exists (previous solved session), try loading it
            if (fs.existsSync(STORAGE_STATE_FILE)) {
                console.log('📥 Found saved storage state. Loading it and reloading page...');
                try {
                    await context.addCookies(JSON.parse(fs.readFileSync(STORAGE_STATE_FILE, 'utf8')).cookies || []);
                } catch (e) {
                    // ignore
                }
                await page.reload({ waitUntil: 'domcontentloaded' });
                if (!(await isCaptchaPresent(page))) {
                    console.log('✅ CAPTCHA bypassed using saved session.');
                }
            }

            // If still has captcha: pause for manual solve
            if (await isCaptchaPresent(page)) {
                console.log('🖱️ Please interact with the browser and solve the CAPTCHA. When done, press ENTER here to continue.');
                await promptEnter('Press ENTER after you solve the captcha in the browser (or type "abort" and ENTER to stop)');
                // re-check
                if (await isCaptchaPresent(page)) {
                    console.log('⏳ CAPTCHA still present after ENTER. Waiting up to 3 minutes for it to disappear automatically...');
                    const solved = await waitForCaptchaToDisappear(page, 3 * 60 * 1000);
                    if (!solved) {
                        console.warn('❌ CAPTCHA still present. Exiting.');
                        await context.close();
                        return;
                    }
                }
                console.log('✅ CAPTCHA no longer detected — continuing.');
            }
        } else {
            console.log('✅ No CAPTCHA detected on homepage.');
        }

        // Optionally save storage state so future runs reuse session
        try {
            await context.storageState({ path: STORAGE_STATE_FILE });
            console.log('💾 Saved storage state to', STORAGE_STATE_FILE);
        } catch (e) { /* ignore */ }

        // 3) Fill the search form (prefer humanized typing)
        console.log('⌨️ Filling search form...');
        // some pages may render form fields with different IDs — attempt multiple selectors
        const firstSelectorCandidates = ['#First', 'input[name="first"]', 'input[placeholder*="First"]', 'input[id*="first"]'];
        const lastSelectorCandidates = ['#Last', 'input[name="last"]', 'input[placeholder*="Last"]', 'input[id*="last"]'];
        const citySelectorCandidates = ['#CityStateZip', 'input[name="citystatezip"]', 'input[placeholder*="City"]', 'input[id*="CityStateZip"]'];

        const tryFill = async (cands, text) => {
            for (const s of cands) {
                try {
                    if (await page.$(s)) {
                        await page.fill(s, text);
                        return true;
                    }
                } catch (e) {}
            }
            return false;
        };

        await tryFill(firstSelectorCandidates, first);
        await tryFill(lastSelectorCandidates, last);
        await tryFill(citySelectorCandidates, `${baseCity}, ${state}`);

        // 4) Submit the form by clicking the search button if present, otherwise build URL and goto
        const submitSelCandidates = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Search")', 'a:has-text("Search")'];
        let submitted = false;
        for (const sel of submitSelCandidates) {
            const el = await page.$(sel);
            if (el) {
                console.log('🖱️ Clicking submit selector:', sel);
                try { await el.click({ timeout: 10000 }); submitted = true; break; } catch (e) { /* continue */ }
            }
        }

        if (!submitted) {
            // fallback: build search URL and navigate
            const searchUrl = new URL('/search/genealogy/results', 'https://www.familytreenow.com');
            if (first) searchUrl.searchParams.set('first', first);
            if (last) searchUrl.searchParams.set('last', last);
            searchUrl.searchParams.set('citystatezip', `${baseCity}, ${state}`);
            console.log('🌐 Navigating directly to search results:', searchUrl.toString());
            await page.goto(searchUrl.toString(), { waitUntil: 'domcontentloaded' });
        } else {
            // wait for navigation or DOM update
            try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }); } catch (e) { /* maybe partial update */ }
        }

        // 5) If Cloudflare prompts again on results, detect and pause again
        if (await isCaptchaPresent(page)) {
            console.log('⚠️ CAPTCHA detected on the search results page. Please solve it in the browser. Press ENTER when done.');
            await promptEnter();
            if (await isCaptchaPresent(page)) {
                console.warn('❌ CAPTCHA still present on results — aborting.');
                await context.close();
                return;
            }
        }

        // 6) Pick first reasonable result
        console.log('🔍 Locating result items...');
        // Try a range of selectors to find the results list
        const candidates = [
            'table tbody tr',
            '.search-results .result',
            '.results .result',
            'ul.results > li',
            '.people-results li',
            '.content .result',
            '.people-record'
        ];

        let resultsSel = null;
        for (const sel of candidates) {
            const c = await page.$(sel);
            if (c) { resultsSel = sel; break; }
        }

        if (!resultsSel) {
            console.warn('⚠️ No standard result container found. Dumping some anchors for inspection...');
            const anchors = await page.$$eval('a[href]', els => els.slice(0,50).map(a => a.href));
            console.log('🔗 Sample anchors:', anchors.slice(0,30));
            await context.close();
            return;
        }

        console.log('✅ Using results selector:', resultsSel);

        // find first clickable detail link inside the first result row
        const firstRow = await page.$(resultsSel);
        const detailLink = await firstRow?.$('a:has-text("View"), a:has-text("Details"), a[href*="/record/"], a[href*="/profile/"]');

        if (!detailLink) {
            console.warn('⚠️ No detail link found inside first result. Trying fallback to first anchor in row.');
            const fallbackHref = await firstRow?.$('a');
            if (!fallbackHref) { console.warn('❌ No anchors inside row. Exiting.'); await context.close(); return; }
            await fallbackHref.click();
        } else {
            console.log('🖱️ Clicking detail link...');
            await detailLink.click();
        }

        // wait for detail page load
        try {
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e) {
            // some pages update via JS; add a short wait
            await page.waitForTimeout(1500);
        }

        // 7) Scrape phone, email, address from the detail page
        console.log('📋 Scraping detail page...');

        // Common candidate selectors for phone/email/address
        const phoneSelectors = [
            'a[href^="tel:"]',
            'a[href*="phone="]',
            'div:has-text("Phone") a',
            'li:has-text("Phone")',
            '.phone', '.phones', '.phone-number', '.contact-phone'
        ];

        const emailSelectors = [
            'a[href^="mailto:"]',
            'a:has-text("@")',
            '.email', '.emails', '.contact-email'
        ];

        const addressSelectors = [
            'address', '.address', '.addresses', '[data-field="address"]', 'div:has-text("Address")'
        ];

        // helper to fetch innerText if selector exists
        const getTextFromSelectors = async (selList) => {
            for (const sel of selList) {
                try {
                    const el = await page.$(sel);
                    if (el) {
                        const txt = (await el.innerText()).trim();
                        if (txt) return txt;
                    }
                } catch (e) {}
            }
            return null;
        };

        const rawPhone = await getTextFromSelectors(phoneSelectors);
        const phone = rawPhone ? extractPhone(rawPhone) : null;
        const email = await getTextFromSelectors(emailSelectors);
        const address = await getTextFromSelectors(addressSelectors);

        const result = { phone, email, physical_address: address || null };
        console.log('✅ Scrape result:', result);

        // Save storage state again after successful run
        try {
            await context.storageState({ path: STORAGE_STATE_FILE });
            console.log('💾 Updated storage state saved to', STORAGE_STATE_FILE);
        } catch (e) {}

        await context.close();
        return result;

    } catch (err) {
        console.error('❌ Error during flow:', err);
        try { await context.close(); } catch (e) {}
    }
}

run();
