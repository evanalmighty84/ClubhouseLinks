// familyTreeNowLookup.js
require('dotenv').config();
const { chromium } = require('playwright');
const OpenAI = require('openai');

// ------------ OpenAI (GPT) ------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Deterministic geocoding-ish city inference.
// Returns a city name (e.g., "Allen") or '' if unsure.
async function inferCityWithGPT({ neighborhood, baseCity, state }) {
    if (!neighborhood || !state) return '';
    try {
        const system = [
            "You are a concise geocoding assistant.",
            "Given a neighborhood name, a base city, and a US state abbreviation, determine the single most likely city (within that state) that the neighborhood belongs to or is adjacent to.",
            "If you are confident, return ONLY the city name (proper case, no state).",
            "If unsure, return an empty string.",
        ].join(' ');

        const user = JSON.stringify({
            neighborhood,
            baseCity,
            state,
            instruction: "Return only the city name (e.g., 'Allen'). If unsure, return an empty string."
        });

        const resp = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
        });

        let answer = (resp.choices?.[0]?.message?.content || '').trim();
        // Basic cleanup: keep letters, spaces, hyphens, periods, apostrophes
        answer = answer.replace(/[^A-Za-z.\-'\s]/g, '').trim();
        // If it looks like a city (1-3 words), accept; else empty
        if (!answer || answer.split(/\s+/).length > 4) return '';
        return answer;
    } catch (e) {
        console.error('GPT city inference failed:', e?.message || e);
        return '';
    }
}

// ------------ FamilyTree Lookup ------------
const FTL_HOME = 'https://familytreelookup.com/'; // home has #First, #Last, #CityStateZip

function fmtCityState({ city, state }) {
    if (!city) return (state || '').trim();
    const st = (state || '').trim();
    const c = String(city).trim();
    return st ? `${c}, ${st}` : c;
}

function looksLikeStateInText(text, stateAbbr) {
    if (!text || !stateAbbr) return false;
    const T = text.toUpperCase();
    const S = stateAbbr.toUpperCase();
    return (
        T.includes(` ${S} `) ||
        T.endsWith(` ${S}`) ||
        T.includes(`(${S})`) ||
        T.includes(`, ${S}`) ||
        T.includes(`- ${S}`)
    );
}

/**
 * Search + scrape on familytreelookup.com
 * @param {import('playwright').Browser} browser
 * @param {{ first: string, last: string, baseCity?: string, state?: string, neighborhood?: string, city?: string }} params
 *   - If `city` not provided, we will call GPT using {neighborhood, baseCity, state} to infer it.
 * @returns {Promise<{ phone: string|null, email: string|null, physical_address: string|null, resolvedCity: string|null }>}
 */
async function familyTreeNowSearchAndScrape(browser, { first, last, baseCity = '', state = '', neighborhood = '', city = '' }) {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    const out = { phone: null, email: null, physical_address: null, resolvedCity: null };

    // 0) If no explicit city provided, try GPT
    let resolvedCity = city;
    if (!resolvedCity) {
        resolvedCity = await inferCityWithGPT({
            neighborhood: String(neighborhood || '').trim(),
            baseCity: String(baseCity || '').trim(),
            state: String(state || '').trim().toUpperCase()
        });
        out.resolvedCity = resolvedCity || null;
        console.log('🔎 GPT resolved city:', resolvedCity || '(none)');
    } else {
        out.resolvedCity = resolvedCity;
    }

    // 1) Go to site and wait for form
    await page.goto(FTL_HOME, { waitUntil: 'domcontentloaded' });
    await page.locator('#First').first().waitFor({ timeout: 20000 });

    // 2) Fill inputs (IDs you provided)
    try { await page.fill('#First', first || ''); } catch {}
    try { await page.fill('#Last', last || ''); } catch {}

    const cityStateZipVal = fmtCityState({ city: resolvedCity, state });
    try { await page.fill('#CityStateZip', cityStateZipVal || (state || '')); } catch {}

    // 3) Submit search
    const submitButton = page.locator(
        'button[type="submit"]:has-text("Search"), input[type="submit"], button:has-text("Search")'
    ).first();

    if (await submitButton.count()) {
        await Promise.all([page.waitForLoadState('domcontentloaded'), submitButton.click()]);
    } else {
        await page.locator('#Last').press('Enter').catch(() => {});
        await page.waitForLoadState('domcontentloaded');
    }

    // 4) Wait for results — try several patterns
    const resultsSelectorCandidates = [
        'table tbody tr',
        '.search-results .result',
        '.results .result',
        'ul.results > li',
    ];

    let resultsSel = null;
    for (const sel of resultsSelectorCandidates) {
        if (await page.locator(sel).first().count()) { resultsSel = sel; break; }
    }
    if (!resultsSel) {
        await page.waitForTimeout(1500);
        for (const sel of resultsSelectorCandidates) {
            if (await page.locator(sel).first().count()) { resultsSel = sel; break; }
        }
    }
    if (!resultsSel) return out; // no results

    const results = page.locator(resultsSel);
    const rCount = await results.count();
    if (rCount === 0) return out;

    // 5) Prefer a result that mentions the state (if provided)
    let detailClicked = false;
    const prefState = (state || '').toUpperCase();

    for (let i = 0; i < Math.min(rCount, 50); i++) {
        const row = results.nth(i);
        const text = ((await row.innerText().catch(() => '')) || '').trim();

        if (!prefState || looksLikeStateInText(text, prefState)) {
            const detailLink = row
                .locator('a:has-text("View"), a:has-text("Details"), a:has-text("Profile"), a[href*="detail"], a[href*="profile"]')
                .first();

            if (await detailLink.count()) {
                await Promise.all([page.waitForLoadState('domcontentloaded'), detailLink.click()]);
                detailClicked = true;
                break;
            }

            try {
                await Promise.all([page.waitForLoadState('domcontentloaded'), row.click({ timeout: 1000 })]);
                detailClicked = true;
                break;
            } catch {}
        }
    }

    if (!detailClicked) {
        const firstLink = results.first().locator(
            'a:has-text("View"), a:has-text("Details"), a:has-text("Profile"), a[href*="detail"], a[href*="profile"]'
        ).first();
        if (await firstLink.count()) {
            await Promise.all([page.waitForLoadState('domcontentloaded'), firstLink.click()]);
            detailClicked = true;
        } else {
            try {
                await Promise.all([page.waitForLoadState('domcontentloaded'), results.first().click({ timeout: 1000 })]);
                detailClicked = true;
            } catch {}
        }
    }
    if (!detailClicked) return out;

    // 6) Scrape detail page for phone/email/address (broad fallbacks)
    try {
        const phoneCand = [
            'a[href^="tel:"]',
            'a[href*="phone="]',
            'a:has-text("Phone")',
            'div:has(span:has-text("Phone")) a, div:has-text("Phone") a',
            'td:has-text("Phone") ~ td',
            'li:has-text("Phone")',
            '.phone, .phones a, .phones',
        ];
        for (const sel of phoneCand) {
            const el = page.locator(sel).first();
            if (await el.count()) {
                const t = (await el.innerText()) || (await el.getAttribute('href')) || '';
                const phone = t.replace(/^tel:/, '').trim();
                if (/\d{3}[-.\s)]?\d{3}[-.\s]?\d{4}/.test(phone)) { out.phone = phone; break; }
            }
        }
    } catch {}

    try {
        const emailCand = [
            'a[href^="mailto:"]',
            'a[href*="email="]',
            'a:has-text("@")',
            'td:has-text("Email") ~ td',
            'li:has-text("@")',
            '.email, .emails a, .emails',
        ];
        for (const sel of emailCand) {
            const el = page.locator(sel).first();
            if (await el.count()) {
                const t = (await el.innerText()) || (await el.getAttribute('href')) || '';
                const email = t.replace(/^mailto:/, '').trim();
                if (email.includes('@')) { out.email = email; break; }
            }
        }
    } catch {}

    try {
        const addrCand = [
            'td:has-text("Address") ~ td',
            'div:has(span:has-text("Address")) span:not(:has(*))',
            'address',
            'li:has-text("Address")',
            '[data-field="address"]',
            '.address, .addresses li, .addresses',
        ];
        for (const sel of addrCand) {
            const el = page.locator(sel).first();
            if (await el.count()) {
                const t = (await el.innerText()).trim();
                if (t && t.length > 6) { out.physical_address = t.replace(/\s*\n\s*/g, ', '); break; }
            }
        }
    } catch {}

    return out;
}

// ------------ Local runner with CLI args ------------
// Usage:
//   node familyTreeNowLookup.js "Isiah" "Ichmel" "TX" "Allen" "Heritage Estates"
// Args: first last state baseCity neighborhood
async function runFamilyTreeNowAutomation() {
    const [,, firstArg, lastArg, stateArg, baseCityArg, neighborhoodArg] = process.argv;

    // Example from your message:
    // First: Isiah, Last: Ichmel, BaseCity: Allen, State: TX, Neighborhood: Heritage Estates
    const first = firstArg || 'Isiah';
    const last = lastArg || 'Ichmel';
    const state = (stateArg || 'TX').toUpperCase();
    const baseCity = baseCityArg || 'Allen';
    const neighborhood = neighborhoodArg || 'Heritage Estates';

    const browser = await chromium.launch({ headless: false });
    try {
        const result = await familyTreeNowSearchAndScrape(browser, {
            first, last, baseCity, state, neighborhood
            // city:  // leave undefined; GPT will try to infer from neighborhood + baseCity + state
        });

        console.log('✅ FamilyTreeNow result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ FamilyTreeNow test failed:', err);
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Missing OPENAI_API_KEY in environment. Please set it first.');
        process.exit(1);
    }
    runFamilyTreeNowAutomation();
}

module.exports = {
    familyTreeNowSearchAndScrape,
    runFamilyTreeNowAutomation,
    inferCityWithGPT,
};
