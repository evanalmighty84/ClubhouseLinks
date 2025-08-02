require('dotenv').config();
const runIonWaveAutomation = require('./utils/ionwaveAutomation');

(async () => {
    console.log('🎯 NODE_ENV:', process.env.NODE_ENV);
    console.log('🎯 Playwright path:', require('playwright').chromium.executablePath());
    try {
        await runIonWaveAutomation();
    } catch (err) {
        console.error('❌ IonWave automation job failed :(:', err);
        process.exit(1);
    }
})();
