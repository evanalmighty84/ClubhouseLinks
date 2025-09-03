#!/usr/bin/env node
/**
 * FTN “from the homepage” flow (no browser).
 * - Starts at homepage (sets cookies/session)
 * - Submits search with first/last/city
 * - Picks the card by exact "Lives in:"
 * - Clicks View Details and scrapes fields
 *
 * Usage:
 *   export RAILWAY_PROXY="http://shinkansen.proxy.rlwy.net:51444"
 *   node ftn_flow_from_home.js "Suzy" "Andrus" "Wylie, TX"
 *
 * Notes:
 *   - Works against familytreenow.com; can try familytreelookup.com if desired.
 *   - Unlocker’s TLS is self-signed → we allow it explicitly.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { CookieJar } = require('tough-cookie');
const { wrapper: wrapAxiosCookieJar } = require('axios-cookiejar-support');
const { HttpsProxyAgent } = require('https-proxy-agent');

// ---------- config ----------
const PROXY = process.env.RAILWAY_PROXY || process.env.HTTP_PROXY || '';
const COUNTRY = process.env.NIMBLE_COUNTRY || 'US';
const START_HOSTS = [
    'https://www.familytreenow.com',
    'https://www.familytreelookup.com', // optional alt start if you want it to try both
];

const DESKTOP_UA =
    process.env.SCRAPER_UA ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const ACCEPT_HTML =
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';

// ---------- helpers ----------
function norm(s = '') { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); }
function cleanHref(raw = '') {
    if (!raw) return '';
    let s = String(raw).trim();
    s = s.replace(/\\%22|%22/gi, '"').replace(/\\"/g, '"').replace(/&quot;/gi, '"');
    s = s.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').replace(/^"+\//, '/');
    s = s.replace(/([^:]\/)\/+/g, '$1');
    return s.trim();
}
function absFTN(href = '', base = 'https://www.familytreenow.com') {
    const cleaned = cleanHref(href);
    try { return new URL(cleaned, base).href; } catch { return cleaned; }
}
function looksLikePX(html = '') {
    return /_pxAppId|Before we continue|Press & Hold|captcha\.px-cloud\.net/i.test(html || '');
}
function buildSearchUrl(base, { first, last, citystatezip }) {
    const u = new URL('/search/genealogy/results', base);
    if (first) u.searchParams.set('first', first);
    if (last)  u.searchParams.set('last', last);
    if (citystatezip) u.searchParams.set('citystatezip', citystatezip);
    return u.href;
}

// ---------- axios client with cookie jar + proxy ----------
function makeClient() {
    const jar = new CookieJar();
    const client = wrapAxiosCookieJar(axios.create({ jar }));
    const agent = PROXY ? new HttpsProxyAgent(PROXY) : undefined;

    client.defaults.httpAgent = agent;
    client.defaults.httpsAgent = agent;
    client.defaults.maxRedirects = 5;
    client.defaults.timeout = 90000;
    client.defaults.validateStatus = () => true;

    return client;
}

// ---------- core flow ----------
async function openHomepageAndSearch({ first, last, city }) {
    const client = makeClient();

    // Try each start host until we get a 200 that isn't PX
    let base = '';
    for (const host of START_HOSTS) {
        const res = await client.get(host + '/', {
            headers: {
                'User-Agent': DESKTOP_UA,
                'Accept': ACCEPT_HTML,
                'Accept-Language': 'en-US,en;q=0.9',
                // Unlocker hints
                'x-nimble-country': COUNTRY,
                'x-nimble-format': 'html',
                'x-nimble-render': 'true',
                'x-nimble-no-html': 'false',
            },
        });
        console.log(`🏠 ${res.status} ${host}/`);
        if (res.status >= 200 && res.status < 400 && !looksLikePX(res.data)) {
            base = host;
            break;
        }
    }
    if (!base) throw new Error('Failed to load homepage on all start hosts');

    // Submit the search like the site does (GET with params), include Referer + same jar
    const searchUrl = buildSearchUrl(base, {
        first, last, citystatezip: city,
    });

    const s = await client.get(searchUrl, {
        headers: {
            'User-Agent': DESKTOP_UA,
            'Accept': ACCEPT_HTML,
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': base + '/',
            'x-nimble-country': COUNTRY,
            'x-nimble-format': 'html',
            'x-nimble-render': 'true',
            'x-nimble-no-html': 'false',
        },
    });
    console.log(`🔎 ${s.status} ${searchUrl}`);

    if (looksLikePX(s.data)) {
        fs.writeFileSync('ftn_px.html', s.data);
        throw new Error('PX challenge encountered on search (browserless).');
    }
    if (!(s.status >= 200 && s.status < 400)) {
        fs.writeFileSync('ftn_search_debug.html', s.data || '');
        throw new Error(`Search returned HTTP ${s.status}`);
    }

    return { client, base, html: s.data };
}

function pickViewDetailsFromSearchHtml(html, livesText, base) {
    const $ = cheerio.load(html);

    // find rows with "Lives in:"
    const rows = $('tr').filter((_, tr) =>
        $(tr).find('td').first().text().toLowerCase().includes('lives in')
    );

    const target = norm(livesText);
    let winnerRow = null;

    rows.each((_, tr) => {
        const tds = $(tr).find('td');
        const val = (tds.eq(1).text() || '').replace(/\s+/g, ' ').trim();
        if (norm(val) === target) winnerRow = $(tr);
    });

    if (!winnerRow) return '';

    // climb to enclosing card and pick the action link
    let $card = winnerRow.closest('.row');
    if (!$card.length) $card = winnerRow.closest('table').closest('.row');
    if (!$card.length) $card = winnerRow.closest('td');

    const cand = [
        $card.find('a.btn.btn-success.detail-link[href]').first().attr('href'),
        $card.find('a.summary-detail-link.detail-link[href]').first().attr('href'),
        $card.find('a.detail-link[href]').first().attr('href'),
        $card.find('a[href*="/record/"]').first().attr('href'),
    ].map(cleanHref).filter(Boolean);

    return absFTN(cand[0] || '', base);
}

function scrapeDetails(html) {
    const $ = cheerio.load(html);
    const out = {};
    out.canonical = $('link[rel="canonical"]').attr('href') || '';
    out.title = $('title').text().trim();

    $('tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 2) return;
        const k = (tds.eq(0).text() || '').trim().replace(/:$/, '').toLowerCase();
        const v = (tds.eq(1).text() || '').trim();
        if (!k || !v) return;
        if (k === 'name') out.name = v;
        else if (k === 'lives in') out.livesIn = v;
        else if (k === 'age') out.age = v;
        else if (k === 'born') out.born = v;
        else if (k === 'possible relatives') out.possibleRelatives = v;
        else if (k === 'associated names') out.associatedNames = v;
    });
    return out;
}

async function run(first, last, city) {
    console.log('Proxy:', PROXY || '(none)');
    const { client, base, html } = await openHomepageAndSearch({ first, last, city });

    const viewUrl = pickViewDetailsFromSearchHtml(html, city, base);
    if (!viewUrl) {
        fs.writeFileSync('ftn_search_last.html', html || '');
        throw new Error('Could not find a matching card / View Details link.');
    }
    console.log('➡️ View Details:', viewUrl);

    // Load details page (may already be /record/, or a step before it)
    const d = await client.get(viewUrl, {
        headers: {
            'User-Agent': DESKTOP_UA,
            'Accept': ACCEPT_HTML,
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': base + '/',
            'x-nimble-country': COUNTRY,
            'x-nimble-format': 'html',
            'x-nimble-render': 'true',
            'x-nimble-no-html': 'false',
        },
    });
    console.log(`📄 ${d.status} ${viewUrl}`);
    if (!(d.status >= 200 && d.status < 400)) {
        fs.writeFileSync('ftn_detail_debug.html', d.data || '');
        throw new Error(`Detail page returned HTTP ${d.status}`);
    }
    if (looksLikePX(d.data)) {
        fs.writeFileSync('ftn_detail_px.html', d.data);
        throw new Error('PX challenge encountered on detail (browserless).');
    }

    // If there is a canonical /record/ URL embedded, follow it for the richest data
    const $$ = cheerio.load(d.data);
    const canonical = $$('.content a[href*="/record/"]').first().attr('href')
        || $$('link[rel="canonical"][href*="/record/"]').attr('href')
        || '';

    let finalHtml = d.data;
    let recordUrl = canonical ? absFTN(canonical, base) : viewUrl;

    if (canonical) {
        const rr = await client.get(recordUrl, {
            headers: {
                'User-Agent': DESKTOP_UA,
                'Accept': ACCEPT_HTML,
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': viewUrl,
                'x-nimble-country': COUNTRY,
                'x-nimble-format': 'html',
                'x-nimble-render': 'true',
                'x-nimble-no-html': 'false',
            },
        });
        console.log(`🧾 ${rr.status} ${recordUrl}`);
        if (rr.status >= 200 && rr.status < 400 && !looksLikePX(rr.data)) {
            finalHtml = rr.data;
        }
    }

    const data = scrapeDetails(finalHtml);
    console.log('VIEW_DETAILS_URL:', recordUrl);
    console.log(JSON.stringify(data, null, 2));
}

// ---------- CLI ----------
(async () => {
    const [, , first, last, city] = process.argv;
    if (!first || !last || !city) {
        console.error('Usage: node ftn_flow_from_home.js "<First>" "<Last>" "<City[, ST]>"');
        process.exit(1);
    }
    try {
        await run(first.trim(), last.trim(), city.trim());
    } catch (e) {
        console.error('Fatal:', e.message);
        process.exit(1);
    }
})();
