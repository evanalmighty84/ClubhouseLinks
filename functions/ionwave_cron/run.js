require('dotenv').config();
const runIonWaveAutomation = require('./index');

runIonWaveAutomation()
    .then(() => console.log('IonWave automation completed.'))
    .catch((err) => {
        console.error('Error running IonWave automation:', err);
        process.exit(1);
    });
