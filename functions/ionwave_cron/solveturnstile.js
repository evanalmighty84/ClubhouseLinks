import { chromium } from 'playwright';
import { Solver } from '@2captcha/captcha-solver';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const solver = new Solver(process.env.TWOCAPTCHA_API_KEY);
const TARGET_URL =
    'https://www.familytreenow.com/search/genealogy/results?first=William&last=Ligon&citystatezip=Plano,+TX';

(async () => {
    const context = await chromium.launchPersistentContext('./ftn-profile', {
        headless: false,
        args: ['--ignore-certificate-errors'],
    });

    const page = await context.newPage();

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('framenavigated', (frame) => {
        console.log('📦 Frame navigated to:', frame.url());
    });

    try {
        console.log('🌐 Visiting:', TARGET_URL);
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log('🔎 Waiting for Turnstile to load...');
        await page.waitForFunction(() => !!window.turnstile, { timeout: 20000 });

        console.log('🛡 Turnstile is present — attempting to hook render()');

        const captchaData = await page.evaluate(() => {
            return new Promise((resolve, reject) => {
                let attempts = 0;
                const i = setInterval(() => {
                    attempts++;
                    if (window.turnstile) {
                        clearInterval(i);
                        try {
                            window.turnstile.render = (a, b) => {
                                const payload = {
                                    type: 'TurnstileTaskProxyless',
                                    websiteKey: b.sitekey,
                                    websiteURL: window.location.href,
                                    data: b.cData,
                                    pagedata: b.chlPageData,
                                    action: b.action,
                                    userAgent: navigator.userAgent,
                                };
                                window.tsCallback = b.callback;
                                resolve(payload);
                                return 'hooked';
                            };
                        } catch (e) {
                            reject(e);
                        }
                    } else if (attempts > 200) {
                        clearInterval(i);
                        reject(new Error('Turnstile did not load in time.'));
                    }
                }, 50);
            });
        });

        console.log('✅ CAPTCHA config extracted. Sending to 2Captcha...');
        const { data: token } = await solver.solve(captchaData);
        console.log('🔓 Token solved:', token.slice(0, 12), '...');

        // Inject token and call callback
        await page.evaluate((token) => {
            try {
                const hidden = document.querySelector('input[name="cf-turnstile-response"]');
                if (hidden) hidden.value = token;

                if (window.tsCallback && typeof window.tsCallback === 'function') {
                    window.tsCallback(token);
                } else {
                    console.warn('⚠️ window.tsCallback not found — fallback submit triggered.');
                    const forms = Array.from(document.forms || []);
                    if (forms.length > 0) {
                        forms[0].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    }
                }
            } catch (err) {
                console.error('❌ Injection failed:', err);
            }
        }, token);

        // Wait for results to load
        await Promise.race([
            page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => {}),
            page.waitForSelector('text=No records found', { timeout: 15000 }).catch(() => {}),
        ]);

        // Save browser state
        await context.storageState({ path: 'ftn_storage.json' });
        console.log('💾 Cookies saved to ftn_storage.json and session persisted in ftn-profile/');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        console.log('✅ Script complete. Inspect browser manually if needed.');
        // await context.close(); // optional: leave browser open
    }
})();
