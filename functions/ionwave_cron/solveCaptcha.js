// solveWithProxy.js
import { chromium } from 'playwright';
import { Solver } from '@2captcha/captcha-solver';
import dotenv from 'dotenv';
import { get2CaptchaProxy } from './getProxyFrom2Captcha.js';

dotenv.config();
const solver = new Solver(process.env.TWOCAPTCHA_API_KEY);

const TARGET_URL = 'https://www.familytreenow.com/search/genealogy/results?first=Michael&last=Dressel&citystatezip=Plano,+TX';

(async () => {
    const proxy = await get2CaptchaProxy(); // format: user:pass@host:port
    const [username, rest] = proxy.split(':');
    const [password, hostport] = rest.split('@');

    const context = await chromium.launchPersistentContext('./ftn-profile', {
        headless: false,
        proxy: {
            server: 'http://' + hostport,
            username,
            password,
        },
        args: ['--ignore-certificate-errors'],
    });

    const page = await context.newPage();

    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => !!window.turnstile, { timeout: 20000 });

    const captchaData = await page.evaluate(() => {
        return new Promise((resolve) => {
            const i = setInterval(() => {
                if (window.turnstile) {
                    clearInterval(i);
                    window.turnstile.render = (a, b) => {
                        window.tsCallback = b.callback;
                        resolve({
                            type: 'TurnstileTask',
                            websiteKey: b.sitekey,
                            websiteURL: window.location.href,
                            data: b.cData,
                            pagedata: b.chlPageData,
                            action: b.action,
                            userAgent: navigator.userAgent,
                        });
                        return 'hooked';
                    };
                }
            }, 50);
        });
    });

    const { data: token } = await solver.solve({
        ...captchaData,
        proxy: `http://${proxy}`, // must match CAPTCHA IP to browsing IP
    });

    await page.evaluate((token) => {
        const hidden = document.querySelector('input[name="cf-turnstile-response"]');
        if (hidden) hidden.value = token;
        if (window.tsCallback) window.tsCallback(token);
    }, token);

    await page.waitForTimeout(3000);
    await context.storageState({ path: 'ftn_storage.json' });

    console.log('🎉 Done — token injected and cookies saved.');
})();
