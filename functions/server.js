
const express = require('express');
const app = express();
// ⭐ ADD THESE TWO LINES BEFORE ANY ROUTES ⭐
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const crmApp = require('./crmIndex'); // crm_function/crmIndex.js should export an app or router
const leadApp = require('./leadindex'); // crm_function/crmIndex.js should export an app or router
const realEstatePipelineApp = require('./realEstatePipelineIndex');

app.use('/server/crm_function/', crmApp);

app.use('/server/lead_function/', leadApp);

app.use('/server/agent_pipeline/', realEstatePipelineApp);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Hello Evan, Server running on port ${PORT}`);
});
