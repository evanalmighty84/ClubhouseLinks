const pool = require("../db/db");
const fs = require("fs");
const csv = require("csv-parser");

const filePath = "./NextLevelHvac.csv"; // Update this path as needed

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
                    headers: [
                        "Full Name", "Company", "Email Address",
                        "Registration Date", "Registration Time", "ASI", "RSI", "ESI", "PSI",
                        "Attendee Category", "col1", "col2", "col3"
                    ],
                    skipLines: 1
                }))
                .on("data", (row) => {
                    const name = row["Full Name"]?.trim();
                    const company = row["Company"]?.trim();
                    const email = row["Email Address"]?.trim().toLowerCase();

                    if (name && email) {
                        results.push({
                            name,
                            company: company || null,
                            email,
                            user_id: userId
                        });
                    } else {
                        console.warn(`⚠️ Skipping row with missing name or email: ${JSON.stringify(row)}`);
                        skippedCount++;
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
            const existing = await pool.query(
                "SELECT id FROM subscribers WHERE email = $1 AND user_id = $2",
                [row.email, row.user_id]
            );

            if (existing.rows.length > 0) {
                console.log(`⚠️ Skipping: ${row.email} (Already Exists)`);
                skippedCount++;
                continue;
            }

            console.log(`📤 Inserting: ${row.name} (${row.email})`);
            await pool.query(
                `INSERT INTO subscribers 
                (email, name, company, user_id, customer, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, 'Unconfirmed', NOW(), NOW())`,
                [row.email, row.name, row.company, row.user_id]
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
