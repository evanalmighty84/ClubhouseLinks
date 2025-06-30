const { chromium } = require('playwright');

const runIonWaveAutomation = async () => {
    console.log('🚀 Starting IonWave automation job...');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://supplier.ionwave.net/', { waitUntil: 'networkidle' });
    console.log('✅ Loaded login page');

    await page.waitForSelector('#txtUserName');
    await page.fill('#txtUserName', process.env.IONWAVE_USERNAME);

    await page.waitForSelector('#txtPassword');
    await page.fill('#txtPassword', process.env.IONWAVE_PASSWORD);

    console.log('🔐 Credentials entered');

    await page.click('#btnLogin');
    await page.waitForSelector('text=My Bid Invitations', { timeout: 10000 });
    console.log('✅ Logged in successfully');

    const clicked = await page.evaluate(() => {
        const bids = Array.from(document.querySelectorAll('div')).find(div =>
            div.textContent.includes('My Bid Invitations')
        );
        if (bids) {
            bids.click();
            return true;
        }
        return false;
    });

    console.log(clicked ? '📨 Clicked "My Bid Invitations"' : '⚠️ Could not find "My Bid Invitations" button');

    await page.waitForSelector('#divPageMain', { timeout: 10000 });
    const pageMainHTML = await page.$eval('#divPageMain', el => el.innerHTML);

    await browser.close();
    console.log('🧼 Browser closed, job completed successfully');

    return pageMainHTML;
};

module.exports = runIonWaveAutomation;
