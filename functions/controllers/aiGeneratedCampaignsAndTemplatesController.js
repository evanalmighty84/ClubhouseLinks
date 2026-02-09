require("dotenv").config();   // MUST be first


const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --------------------------------------------------
// SYSTEM PROMPT (same style & formatting as your classifier file)
// --------------------------------------------------
const SYSTEM_PROMPT = `You are an expert email designer for CRM automation.

Your job is to generate VERY clean HTML email content using ONLY:
<p>, <h1>, <h2>, <img>, <br>, <strong>, <div>

RULES:
- Do NOT include <html>, <body>, <style>, or CSS blocks.
- Do NOT include scripts or inline styles (except basic img width if needed).
- Keep formatting simple, readable, and short.
- Use clean tag spacing that is easy for developers to read.
- Images must be <img> tags only.
- Do NOT include the words "SYSTEM:", "USER:", or explanations in the output.
- Output ONLY raw HTML, nothing else.

Your tone should match the category (Sale, Advertisement, Thank You, etc.).
If a logo URL is provided, place the logo at the top inside an <img> tag.
`;

// --------------------------------------------------
// CONTROLLER: POST /aiGeneratedCampaignsAndTemplates/create
// --------------------------------------------------
exports.getAiResponse = async (req, res) => {
    console.log("Received request to generate AI response");

    try {
        const { type, industry, logoUrl } = req.body;

        if (!type || !industry) {
            return res.status(400).json({
                error: "Missing required fields: type or industry",
            });
        }

        // USER PROMPT
        const userPrompt = `
Create an HTML email with the following attributes:

Category: ${type}
Industry: ${industry}
Logo URL: ${logoUrl || "none"}

Return ONLY raw HTML (no markdown, no explanation).
        `.trim();

        // CALL OPENAI
        const completion = await openai.responses.create({
            model: "gpt-4o-mini",
            input: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt }
            ]
        });

        // Extract content safely
        const aiText =
            completion.output_text ||
            completion.output?.[0]?.content?.[0]?.text ||
            completion.response_text ||
            "No response from AI.";


// After const aiText = ...
        console.log("AI RAW RESPONSE:", completion);
        console.log("AI GENERATED HTML:", aiText);

        res.json({ aiResponse: aiText });

    } catch (err) {
        console.error("AI Generation Error:", err);
        res.status(500).json({
            error: "Failed to generate AI response",
            details: err.message,
        });
    }
};
