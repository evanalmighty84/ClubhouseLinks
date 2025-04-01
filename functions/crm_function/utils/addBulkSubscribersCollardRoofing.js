const pool = require("../db/db");
const fs = require("fs");
const csv = require("csv-parser");

const filePath = "./CollardRoofingSubscribers.csv"; // Change this to the actual file name

async function addBulkSubscribers(filePath) {
    try {
        console.log(`📂 Reading CSV file: ${filePath}`);

        const results = [];
        const userId = 505;
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

                    const firstName = cleanRow["First Name"] ? String(cleanRow["First Name"]).trim() : "";
                    const lastName = cleanRow["Last Name"] ? String(cleanRow["Last Name"]).trim() : "";
                    const email = cleanRow["Email"] ? String(cleanRow["Email"]).trim() : null;
                    const phone = cleanRow["Phone"] ? String(cleanRow["Phone"]).trim() : "";

                    const address = cleanRow["Address"] ? cleanRow["Address"].trim() : "";
                    const city = cleanRow["City"] ? cleanRow["City"].trim() : "";
                    const state = cleanRow["State"] ? cleanRow["State"].trim() : "";
                    const zip = cleanRow["Zip"] ? cleanRow["Zip"].toString().trim() : "";

                    const contactName = `${firstName} ${lastName}`.trim();
                    const physicalAddress = `${address}, ${city}, ${state} ${zip}`.trim();

                    if (email && contactName) {
                        results.push({
                            name: contactName,
                            email: email,
                            user_id: userId,
                            physical_address: physicalAddress,
                            phone_number: phone
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
                `INSERT INTO subscribers 
                (email, name, user_id, customer, physical_address, phone_number, created_at, updated_at)
                VALUES ($1, $2, $3, 'Unconfirmed', $4, $5, NOW(), NOW())`,
                [row.email, row.name, row.user_id, row.physical_address, row.phone_number]
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
