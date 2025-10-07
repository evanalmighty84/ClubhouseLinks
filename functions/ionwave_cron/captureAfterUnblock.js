// captureAfterUnblock.js
// Usage:
//   node captureAfterUnblock.js [profile_dir] [target_url]
// OR set in .env: PROFILE_DIR and TARGET_URL
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const profileDir = process.argv[2] || process.env.PROFILE_DIR || './ftn-profile';
const target = process.argv[3] || process.env.TARGET_URL || 'https://www.familytreenow.com/search/genealogy/results?first=Michael&last=Dressel&citystatezip=Plano,+TX';

const OUT_STATE = path.resolve(process.cwd(), 'ftn_storage.json');
const OUT_SCREEN = path.resolve(process.cwd(), 'ftn_unblocked.png');

(async () => {
    console.log('Profile directory:', profileDir);
    console.log('Target URL:', target);

    // Launch persistent context that shares the profile directory.
    // This will open a browser window that uses the same user data as the session you left open.
    const context = await chromium.launchPersistentContext(profileDir, {
        headless: false, // visible so you can inspect if needed
        args: ['--ignore-certificate-errors'],
    });

    try {
        const page = await context.newPage();

        // Navigate to the target to make sure the profile is loaded in this context
        console.log('Navigating to target...');
        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});

        // Wait a short moment to let dynamic content finish loading
        await page.waitForTimeout(1500);

        // Heuristic: wait until page body has some text that looks like the results page.
        // If that times out, we'll still capture whatever is visible.
        try {
            await page.waitForFunction(() => {
                const txt = (document.body && document.body.innerText) || '';
                return txt.includes('Records for') || txt.includes('Search Criteria') || txt.length > 500;
            }, { timeout: 5000 });
            console.log('Page looks unblocked / loaded.');
        } catch (e) {
            console.warn('Did not detect expected page text within timeout — still capturing current view.');
        }

        // Save screenshot
        await page.screenshot({ path: OUT_SCREEN, fullPage: true });
        console.log('Saved screenshot ->', OUT_SCREEN);

        // Save storage (cookies + localStorage)
        await context.storageState({ path: OUT_STATE });
        console.log('Saved storage state ->', OUT_STATE);

        // Optionally print a few cookies to help confirm capture
        const cookies = await context.cookies();
        console.log('Cookies captured (top 8):', cookies.slice(0, 8).map(c => ({ name: c.name, domain: c.domain })));

        console.log('\n✅ Capture complete. Use ftn_storage.json with Playwright storageState on future runs:');
        console.log(`   const context = await chromium.launchPersistentContext('./some-profile', { storageState: '${OUT_STATE}', ... });`);

    } catch (err) {
        console.error('Error during capture:', err);
        try {
            // best-effort save before exit
            await context.storageState({ path: OUT_STATE });
            console.log('Saved storage state despite error ->', OUT_STATE);
        } catch (e) { /* ignore */ }
    } finally {
        console.log('Leaving browser open so you can inspect the current window. Close manually when done.');
        // do NOT call context.close() so you can inspect the same browser session if you want.
    }
})();
