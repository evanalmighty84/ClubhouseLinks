const cloudinary = require('cloudinary').v2;
const moment = require('moment');

// Configure Cloudinary
cloudinary.config({
    cloud_name: 'duz4vhtcn',
    api_key: '922468697412882',
    api_secret: 'K-CAP3rlMC-ADlYo093CXaT_Jcc'
});

// Function to fetch and delete old assets
async function deleteOldAssets() {
    try {
        const fiveMonthsAgo = moment().subtract(5, 'months').toISOString();
        let nextCursor = null;

        do {
            // Fetch assets from Cloudinary
            const response = await cloudinary.api.resources({
                type: 'upload',
                max_results: 500,
                next_cursor: nextCursor, // For pagination
            });

            // Filter assets older than 5 months
            const oldAssets = response.resources.filter(asset => moment(asset.created_at).isBefore(fiveMonthsAgo));

            console.log(`Found ${oldAssets.length} assets older than 5 months.`);

            // Delete old assets
            for (let asset of oldAssets) {
                await cloudinary.uploader.destroy(asset.public_id);
                console.log(`Deleted: ${asset.public_id}`);
            }

            // Handle pagination
            nextCursor = response.next_cursor;
        } while (nextCursor);

        console.log("✅ Finished deleting old assets.");
    } catch (error) {
        console.error("❌ Error deleting assets:", error);
    }
}

// Run the function
deleteOldAssets();
