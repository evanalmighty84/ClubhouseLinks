const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');

const runIonWaveAutomation = async () => {
    const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto('https://supplier.ionwave.net/', { waitUntil: 'networkidle0' });

    await page.type('input[name="UserName"]', process.env.IONWAVE_USERNAME);
    await page.type('input[name="Password"]', process.env.IONWAVE_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Click "My Bid Invitations"
    await page.evaluate(() => {
        const bids = Array.from(document.querySelectorAll('div')).find(div =>
            div.textContent.includes('My Bid Invitations')
        );
        if (bids) bids.click();
    });

    await page.waitForTimeout(3000);

    // Placeholder for Heroku API call
    // const axios = require('axios');
    // await axios.get('https://crm-function-app.herokuapp.com/api/your-endpoint');

    await browser.close();
};

module.exports = runIonWaveAutomation;
