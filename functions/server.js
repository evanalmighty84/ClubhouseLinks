const express = require('express');
const app = express();
const crmApp = require('./index'); // crm_function/index.js should export an app or router

app.use('/server/crm_function/', crmApp);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
