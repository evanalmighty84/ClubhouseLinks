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

    // Extract structured data (WITHOUT calculating timeLeft yet)
    const rawBids = await page.$$eval('table tbody tr', rows => {
        return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length < 8) return null;
            return {
                title: cells[0].innerText.trim(),
                bidNumber: cells[1].innerText.trim(),
                agency: cells[2].innerText.trim(),
                projectName: cells[3].innerText.trim(),
                issueDate: cells[4].innerText.trim(),
                closeDate: cells[5].innerText.trim(),
                bidStatus: cells[6].innerText.trim(),
                responseStatus: cells[7].innerText.trim()
            };
        }).filter(Boolean);
    });

    await browser.close();
    console.log('🧼 Browser closed');

    // Now calculate timeLeft in Node context
    const bids = rawBids.map(bid => ({
        ...bid,
        timeLeft: calculateTimeLeft(bid.closeDate)
    }));

    console.log('✅ Parsed Bids:', bids.length);
    return bids;
};

// Node-side time diff calculator
function calculateTimeLeft(closeDateStr) {
    if (!closeDateStr) return 'Unknown';
    const trimmed = closeDateStr.replace(/\(.*?\)/, '').trim();
    const parsedDate = new Date(`${trimmed} UTC-5`);

    const now = new Date();
    const diffMs = parsedDate - now;

    if (diffMs <= 0) return 'Closed';

    const diffMins = Math.floor(diffMs / 1000 / 60);
    const days = Math.floor(diffMins / 1440);
    const hours = Math.floor((diffMins % 1440) / 60);
    const minutes = diffMins % 60;

    return `${days}d ${hours}h ${minutes}m`;
}

module.exports = runIonWaveAutomation;
