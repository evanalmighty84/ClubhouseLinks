require('dotenv').config(); // Load environment variables
const cronJob = require('../../warmlist_cron'); // Adjust path to your cron file

// Mock `cronDetails` and `context` objects
const mockCronDetails = { name: 'top-of-mind-list-cron' };
const mockContext = {
    closeWithSuccess: () => console.log('Context: Success'),
    closeWithFailure: () => console.log('Context: Failure'),
};

// Run the cron job
(async () => {
    console.log('Starting the cron job test...');
    await cronJob(mockCronDetails, mockContext);
    console.log('Cron job test completed.');
})();
