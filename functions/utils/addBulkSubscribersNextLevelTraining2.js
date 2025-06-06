const pool = require("../db/db");
const fs = require("fs");
const csv = require("csv-parser");

const filePath = "./EXPO-ESI-Registration.csv"; // Update if needed

async function addBulkSubscribers(filePath) {
    try {
        console.log(`📂 Reading CSV file: ${filePath}`);

        const results = [];
        const userId = 473;
        let addedCount = 0;
        let skippedCount = 0;

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv({
                    headers: ["Company", "City", "State", "Email", "x1", "x2", "x3", "x4", "x5"],
                    skipLines: 0 // don't treat first row as headers, use ours
                }))
                .on("data", (row) => {
                    const company = row["Company"]?.trim() || "";
                    const city = row["City"]?.trim() || "";
                    const state = row["State"]?.trim() || "";
                    const email = row["Email"]?.trim().toLowerCase() || "";

                    const physicalAddress = `${city}, ${state}`.trim();

                    if (company && email) {
                        results.push({
                            name: company,
                            email,
                            user_id: userId,
                            physical_address: physicalAddress
                        });
                    } else {
                        skippedCount++;
                        console.warn(`⚠️ Skipping row with missing data: ${JSON.stringify(row)}`);
                    }
                })
                .on("end", () => {
                    console.log("✅ CSV processing complete.");
                    resolve();
                })
                .on("error", (err) => {
                    console.error("❌ CSV parsing error:", err);
                    reject(err);
                });
        });

        console.log(`📊 Parsed ${results.length} valid subscribers.`);

        for (const row of results) {
            const checkExisting = await pool.query(
                "SELECT id FROM subscribers WHERE email = $1 AND user_id = $2",
                [row.email, row.user_id]
            );

            if (checkExisting.rows.length > 0) {
                console.log(`⚠️ Skipping: ${row.email} (Already Exists)`);
                skippedCount++;
                continue;
            }

            console.log(`📤 Inserting: ${row.name} (${row.email})`);
            await pool.query(
                `INSERT INTO subscribers 
                (email, name, user_id, customer, physical_address, created_at, updated_at)
                VALUES ($1, $2, $3, 'Unconfirmed', $4, NOW(), NOW())`,
                [row.email, row.name, row.user_id, row.physical_address]
            );

            addedCount++;
        }

        console.log(`🎉 Import Completed: ${addedCount} added, ${skippedCount} skipped.`);
    } catch (error) {
        console.error("❌ Error adding subscribers:", error);
    }
}

addBulkSubscribers(filePath);

module.exports = addBulkSubscribers;
