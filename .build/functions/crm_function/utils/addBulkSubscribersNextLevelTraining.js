const pool = require("../db/db");
const fs = require("fs");
const csv = require("csv-parser");

const filePath = "./NLT Business Owner Power30 Registration (Responses) - Form Responses 1.csv";

async function addBulkSubscribers(filePath) {
    try {
        console.log(`📂 Reading CSV file: ${filePath}`);

        const results = [];
        const userId = 473;
        let addedCount = 0;
        let skippedCount = 0;

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on("headers", (headers) => {
                    headers = headers.map(h => h.replace(/^\uFEFF/, "").trim());
                    console.log(`📌 Detected Headers: ${headers.join(", ")}`);
                })
                .on("data", (row) => {
                    let cleanRow = {};
                    Object.keys(row).forEach(key => {
                        cleanRow[key.trim()] = row[key];
                    });

                    const contactName = cleanRow["FIRST AND LAST NAME"] ? String(cleanRow["FIRST AND LAST NAME"]).trim() : "";
                    const email = cleanRow["BUSINESS EMAIL ADDRESS"] ? String(cleanRow["BUSINESS EMAIL ADDRESS"]).trim() : null;

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
addBulkSubscribers(filePath);

module.exports = addBulkSubscribers;
