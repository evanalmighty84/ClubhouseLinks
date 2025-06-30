const runIonWaveAutomation = require('../ionwave_cron/utils/ionwaveAutomation');
const cheerio = require('cheerio');
exports.getIonWaveBids = async (req, res) => {
    try {
        const html = await runIonWaveAutomation();
        const $ = cheerio.load(html);

        const bids = [];

        $('.vendorHomeTile_Container').each((i, el) => {
            const count = $(el).find('.vendorHomeTile_Count').text().trim();
            const title = $(el).find('.vendorHomeTile_Title').text().trim();
            const link = $(el).closest('a').attr('href');

            bids.push({ count, title, link });
        });

        res.status(200).json({ bids });
    } catch (err) {
        console.error('❌ Failed to get IonWave bids:', err.message);
        res.status(500).send({ error: 'Failed to fetch IonWave bid data' });
    }
};

