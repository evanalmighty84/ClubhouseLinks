require('dotenv').config();
const { chromium } = require('playwright');
const runIonWaveAutomation = require('./utils/ionwaveAutomation');
const runAutomation = require('./utils/recent/nextdoorAutomationWylie');
const { runMelissaAutomation }= require('./utils/melissaLookup');

(async () => {
    try {
        console.log('🚀 NODE_ENV:', process.env.NODE_ENV);
        console.log('🧪 Playwright path:', chromium.executablePath());

/*        console.log('\n📩 Running IonWave Automation...');
        await runIonWaveAutomation();*/

      console.log('\n🏘️ Running Nextdoor Automation...');
        await runAutomation();

/*        console.log('running Melissa Automation')
        await runMelissaAutomation();*/

        console.log('\n✅ All automations completed');
    } catch (err) {
        console.error('❌ Automation failed:', err?.message || err);
        console.error('❌ Full stack:', err?.stack);
        process.exit(1);
    }
})();
