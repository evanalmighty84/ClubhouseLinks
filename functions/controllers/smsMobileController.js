const fs = require("fs");
const path = require("path");

// ---------- Paths ----------
const dataDir = path.join(__dirname, "..", "data");
const leadsPath = path.join(dataDir, "leads.json");
const statePath = path.join(dataDir, "state.json");

// ---------- Helpers ----------
function loadJSON(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Replace this later with real Twilio send
async function sendSms(to, body) {
    console.log("\n📩 SMS OUT:");
    console.log(body);
    console.log("------------------------------------------------\n");
}

// ---------- Controller ----------
exports.twilioMobileInbound = async (req, res) => {
    try {
        const from = req.body.From || "local-test";
        const bodyRaw = req.body.Body || "";
        const body = bodyRaw.trim();

        console.log("📲 Incoming SMS:", body);

        const leads = loadJSON(leadsPath);
        const state = loadJSON(statePath);

        // --------------------------------------------------
        // START — begin mobile flow
        // --------------------------------------------------
        if (body.toLowerCase() === "start") {
            const lead = leads.find(l => !l.processed);

            if (!lead) {
                await sendSms(from, "✅ No pending leads.");
                return res.sendStatus(200);
            }

            state.activeLeadId = lead.id;
            saveJSON(statePath, state);

            await sendSms(
                from,
                `
👤 ${lead.author}
📍 ${lead.city}, ${lead.state}
🏷️ ${lead.lead_type}

💬 ${lead.description}

Reply:
c = continue
s = skip
Lead ID: ${lead.id}
`.trim()
            );

            return res.sendStatus(200);
        }

        // --------------------------------------------------
        // Require active lead beyond this point
        // --------------------------------------------------
        const lead = leads.find(l => l.id === state.activeLeadId);

        if (!lead) {
            await sendSms(from, "⚠️ No active lead. Text START to begin.");
            return res.sendStatus(200);
        }

        // --------------------------------------------------
        // SKIP
        // --------------------------------------------------
        if (body.toLowerCase() === "s") {
            lead.processed = true;
            state.activeLeadId = null;

            saveJSON(leadsPath, leads);
            saveJSON(statePath, state);

            await sendSms(from, "⏭️ Lead skipped.");
            return res.sendStatus(200);
        }

        // --------------------------------------------------
        // CONTINUE → send FTN search URL
        // --------------------------------------------------
        if (body.toLowerCase() === "c") {
            const [first, ...rest] = lead.author.split(" ");
            const last = rest.join(" ");

            const ftnSearchUrl =
                `https://www.familytreenow.com/search/genealogy/results` +
                `?first=${encodeURIComponent(first)}` +
                `&last=${encodeURIComponent(last)}` +
                `&citystatezip=${encodeURIComponent(`${lead.city}, ${lead.state}`)}`;

            await sendSms(
                from,
                `
🔍 Open FamilyTreeNow:
${ftnSearchUrl}

Choose the correct record, then reply with the FULL URL.
`.trim()
            );

            return res.sendStatus(200);
        }

        // --------------------------------------------------
        // RECORD URL SENT → scrape
        // --------------------------------------------------
        if (
            body.startsWith("http") &&
            body.includes("familytreenow.com")
        ) {
            await sendSms(from, "🔍 Record URL received. Scraping…");

            // Kick off scraper (non-blocking is fine)
            const scrapeChosenUrl = require("../scripts/scrapeChosenUrl");
            scrapeChosenUrl(body, lead).catch(err => {
                console.error("❌ Scrape failed:", err.message);
            });

            lead.processed = true;
            state.activeLeadId = null;

            saveJSON(leadsPath, leads);
            saveJSON(statePath, state);

            await sendSms(from, "✅ Done. Lead processed.");
            return res.sendStatus(200);
        }

        // --------------------------------------------------
        // FALLBACK
        // --------------------------------------------------
        await sendSms(
            from,
            "❓ Unknown command. Reply START, c, s, or send a FamilyTreeNow URL."
        );
        return res.sendStatus(200);

    } catch (err) {
        console.error("❌ Mobile SMS controller error:", err);
        res.sendStatus(500);
    }
};
