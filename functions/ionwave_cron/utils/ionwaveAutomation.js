const { chromium } = require('playwright');

const runIonWaveAutomation = async () => {
    console.log('🚀 Starting IonWave automation job...');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://supplier.ionwave.net/', { waitUntil: 'networkidle' });
    console.log('✅ Loaded login page');

    await page.fill('#txtUserName', process.env.IONWAVE_USERNAME);
    await page.fill('#txtPassword', process.env.IONWAVE_PASSWORD);
    console.log('🔐 Credentials entered');

    await page.click('#btnLogin');
    await page.waitForSelector('text=My Bid Invitations', { timeout: 10000 });
    console.log('✅ Logged in successfully');

    const bidLink = await page.$eval('a:has-text("My Bid Invitations")', el => el.href);
    console.log(`📨 Found "My Bid Invitations" link, navigating to: ${bidLink}`);
    await page.goto(bidLink, { waitUntil: 'networkidle' });
    console.log('📥 Navigated to My Bid Invitations');

    // Wait for the bids table
    await page.waitForSelector('table');

    // Extract structured data
    const bids = await page.$$eval('table tbody tr', rows => {
        return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length < 8) return null;
            return {
                title: cells[0].innerText.trim(),         // Was agency
                bidNumber: cells[1].innerText.trim(),     // Was bid #
                agency: cells[2].innerText.trim(),        // Was title
                projectName: cells[3].innerText.trim(),   // Was issue date
                issueDate: cells[4].innerText.trim(),     // Was close date
                timeLeft: cells[5].innerText.trim(),      // Correct
                bidStatus: cells[6].innerText.trim(),     // Correct
                responseStatus: cells[7].innerText.trim() // Correct
            };

        }).filter(Boolean);
    });

    await browser.close();
    console.log('🧼 Browser closed, job completed successfully');
    console.log('✅ Parsed Bids:', bids.length);

    return bids;
};

module.exports = runIonWaveAutomation;
