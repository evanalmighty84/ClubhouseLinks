const runIonWaveAutomation = require('../ionwave_cron/utils/ionwaveAutomation');

exports.getIonWaveBids = async (req, res) => {
    try {
        // Directly returns structured bid data now
        const bids = await runIonWaveAutomation();

        console.log(`✅ Controller received ${bids.length} bids`);

        res.status(200).json({ success: true, bids });
    } catch (err) {
        console.error('❌ Failed to get IonWave bids:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};
