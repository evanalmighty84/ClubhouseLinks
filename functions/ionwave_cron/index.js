require('dotenv').config();
const runIonWaveAutomation = require('./utils/ionwaveAutomation');

(async () => {
    try {
        await runIonWaveAutomation();
    } catch (err) {
        console.error('❌ IonWave automation job failed:', err);
        process.exit(1);
    }
})();
