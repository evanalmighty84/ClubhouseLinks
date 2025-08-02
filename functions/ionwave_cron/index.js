require('dotenv').config();
const runIonWaveAutomation = require('./utils/ionwaveAutomation');

(async () => {
    try {
        console.log('🚀 NODE_ENV:', process.env.NODE_ENV);
        console.log('🧪 Playwright path:', require('playwright').chromium.executablePath());

        await runIonWaveAutomation();
    } catch (err) {
        console.error('❌ Full IonWave error:', err?.message || err);
        console.error('❌ Full stack:', err?.stack);
        process.exit(1);
    }
})();

