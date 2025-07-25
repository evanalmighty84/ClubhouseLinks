const pool = require("../db/db");
const fs = require("fs");
const csv = require("csv-parser");

const filePath = "./CrystalRiverLendingContactList.csv";

async function addBulkSubscribers(filePath) {
    try {
        console.log(`📂 Reading CSV file: ${filePath}`);

        const results = [];
        const userId = 769;
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

                    const email = cleanRow["EMail"]?.trim() || null;
                    const firstName = cleanRow["FirstName"]?.trim() || "";
                    const lastName = cleanRow["LastName"]?.trim() || "";
                    const name = `${firstName} ${lastName}`.trim();

                    const phone_number = cleanRow["MobilePhone"]?.trim()
                        || cleanRow["HomePhone"]?.trim()
                        || cleanRow["WorkPhone"]?.trim()
                        || null;

                    const addressParts = [
                        cleanRow["Address"]?.trim(),
                        cleanRow["City"]?.trim(),
                        cleanRow["State"]?.trim(),
                        cleanRow["ZipCode"]?.trim()
                    ].filter(Boolean);
                    const physical_address = addressParts.join(", ") || null;

                    if (email && name) {
                        results.push({
                            email,
                            name,
                            user_id: userId,
                            phone_number,
                            physical_address
                        });
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
            const { email, name, user_id, phone_number, physical_address } = row;

            console.log(`🔎 Checking if ${email} exists...`);
            const checkExisting = await pool.query(
                "SELECT id FROM subscribers WHERE email = $1 AND user_id = $2",
                [email, user_id]
            );

            if (checkExisting.rows.length > 0) {
                console.log(`⚠️ Skipping: ${email} (Already Exists)`);
                skippedCount++;
                continue;
            }

            console.log(`📤 Inserting: ${name} (${email})`);
            await pool.query(
                `INSERT INTO subscribers (email, name, user_id, phone_number, physical_address, customer, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, 'Unconfirmed', NOW(), NOW())`,
                [email, name, user_id, phone_number, physical_address]
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
