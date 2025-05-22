const addBulkSubscribers = require("./addBulkSubscribersOurBenefitCoach");

const filePath = process.argv[2]; // Get file path from CLI arguments

if (!filePath) {
    console.error("❌ Please provide the CSV file path!");
    process.exit(1);
}

addBulkSubscribers(filePath)
    .then(() => console.log("✅ Bulk upload completed!"))
    .catch((error) => console.error("❌ Upload failed:", error));
