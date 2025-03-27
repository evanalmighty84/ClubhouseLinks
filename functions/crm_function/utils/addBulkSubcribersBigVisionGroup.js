const pool = require("../db/db"); // Using your existing PostgreSQL connection
const fs = require("fs");
const csv = require("csv-parser");
const filePath = "./2ndEmailSheetWave3.csv"

async function addBulkSubscribers(filePath) {
    try {
        const results = [];
        const userId = 373; // Fixed user_id

        // Read the CSV file and parse its content
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on("data", (row) => {
                    const contactName = row["Contact Name"]; // Mapping CSV column
                    const email = row["Email"]; // Mapping CSV column
                    if (contactName && email) {
                        results.push({ name: contactName, email: email, user_id: userId });
                    }
                })
                .on("end", resolve)
                .on("error", reject);
        });

        console.log(`✅ Parsed ${results.length} subscribers from CSV file.`);

        // Insert data into the PostgreSQL database
        for (const row of results) {
            await pool.query(
                "INSERT INTO subscribers (email, name, user_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, email) DO NOTHING",
                [row.email, row.name, row.user_id]
            );

        }

        console.log("✅ All subscribers added successfully!");
    } catch (error) {
        console.error("❌ Error adding subscribers:", error);
    }
}

addBulkSubscribers(filePath);

module.exports = addBulkSubscribers;
