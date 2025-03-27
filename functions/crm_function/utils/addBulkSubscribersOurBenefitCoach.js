const pool = require("../db/db");
const fs = require("fs");
const csv = require("csv-parser");

const filePath = "./2ndEmailSheet.csv";

async function addBulkSubscribersOurBenefitCoach(filePath) {
    try {
        console.log(`📂 Reading CSV file: ${filePath}`);

        const results = [];
        const userId = 373;
        let addedCount = 0;
        let skippedCount = 0;

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on("headers", (headers) => {
                    // Trim headers to remove leading/trailing spaces and BOM
                    headers = headers.map(h => h.replace(/^\uFEFF/, "").trim());
                    console.log(`📌 Detected Headers: ${headers.join(", ")}`);
                })
                .on("data", (row) => {
                    // Trim keys to avoid extra spaces issue
                    let cleanRow = {};
                    Object.keys(row).forEach(key => {
                        cleanRow[key.trim()] = row[key];
                    });

                    const email = cleanRow["Email"] ? String(cleanRow["Email"]).trim() : null;
                    const firstName = cleanRow["firstName"] ? String(cleanRow["firstName"]).trim() : "";
                    const lastName = cleanRow["lastName"] ? String(cleanRow["lastName"]).trim() : "";
                    const contactName = `${firstName} ${lastName}`.trim();

                    if (email && contactName) {
                        results.push({ name: contactName, email: email, user_id: userId });
                    } else {
                        console.warn(`⚠️ Skipping row with missing data: ${JSON.stringify(cleanRow)}`);
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

        console.log(`📊 Parsed ${results.length} subscribers.`);

        if (results.length === 0) {
            console.log("⚠️ No valid subscribers found. Exiting.");
            return;
        }

        // Insert only new subscribers
        for (const row of results) {
            console.log(`🔎 Checking if ${row.email} exists...`);
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
                `INSERT INTO subscribers (email, name, user_id, customer, created_at, updated_at)
                 VALUES ($1, $2, $3, 'Unconfirmed', NOW(), NOW())`,
                [row.email, row.name, row.user_id]
            );

            addedCount++;
        }

        console.log(`🎉 Import Completed: ${addedCount} added, ${skippedCount} skipped.`);
    } catch (error) {
        console.error("❌ Error adding subscribers:", error);
    }
}

// Run the function
addBulkSubscribersOurBenefitCoach(filePath);

module.exports = addBulkSubscribersOurBenefitCoach;
