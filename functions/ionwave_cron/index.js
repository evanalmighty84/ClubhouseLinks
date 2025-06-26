const puppeteer = require('puppeteer');

const runIonWaveAutomation = async () => {
    console.log('🚀 Starting IonWave automation job...');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto('https://supplier.ionwave.net/', { waitUntil: 'networkidle0' });
    console.log('✅ Loaded login page');

    await page.type('input[name="UserName"]', process.env.IONWAVE_USERNAME);
    await page.type('input[name="Password"]', process.env.IONWAVE_PASSWORD);
    console.log('🔐 Credentials entered');

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
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

    await page.waitForTimeout(3000);
    await browser.close();
    console.log('🧼 Browser closed, job completed successfully');
};

module.exports = runIonWaveAutomation;
