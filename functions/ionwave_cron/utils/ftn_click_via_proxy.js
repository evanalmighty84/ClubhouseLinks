// ftn_click_via_proxy.js
// Usage:
//   export OX='ip.nimbleway.com:7000'
//   export N_USER='account-...-pipeline-nimbleip-country-US'
//   export N_PASS='your-password'
//   # optional (only used if 403 on detail)
//   # export NIMBLE_TOKEN='BASE64_BASIC_TOKEN'
//   node ftn_click_via_proxy.js "First" "Last" "City, ST" ftn_search.html
//
// Requires: Node 22+, axios@1, cheerio, tough-cookie, https-proxy-agent@7

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios').default;
const { CookieJar, Cookie } = require('tough-cookie');
const { HttpsProxyAgent } = require('https-proxy-agent');

const [, , FIRST, LAST, CITY, SEARCH_HTML_PATH] = process.argv;
if (!FIRST || !LAST || !CITY || !SEARCH_HTML_PATH) {
    console.log('Usage: node ftn_click_via_proxy.js "<First>" "<Last>" "<City, ST>" ftn_search.html');
    process.exit(1);
}

const fullPath = path.resolve(SEARCH_HTML_PATH);
if (!fs.existsSync(fullPath)) {
    console.error('Search HTML not found at:', fullPath);
    process.exit(1);
}

const PROXY_HOSTPORT = process.env.OX || 'ip.nimbleway.com:7000';
const N_USER = process.env.N_USER;
const N_PASS = process.env.N_PASS;
if (!N_USER || !N_PASS) {
    console.error('Set N_USER and N_PASS (Nimble IP pipeline username/password).');
    process.exit(1);
}

const ORIGIN = 'https://www.familytreenow.com';

// ---------- UA ----------
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MOBILE_UA  = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const USE_MOBILE_UA = true;

// ---------- helpers ----------
const norm = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const hasZeroPeople = html => />\s*0\s+People\s+Records\s*</i.test(String(html || ''));

function absFTN(href = '') { try { return new URL(href, ORIGIN).href; } catch { return ''; } }
function cleanHref(h = '') {
    let s = String(h || '').trim();
    s = s.replace(/^\\*"+|\\*"+$/g, '');
    s = s.replace(/^\\*'+|\\*'+$/g, '');
    s = s.replace(/^&quot;|&quot;$/g, '');
    s = s.replace(/\\(?=["'])/g, '');
    return s;
}
function forceCityInQuery(url, { first, last, livesText, cityParam }) {
    try {
        const u = new URL(url, ORIGIN);
        const firstQ = u.searchParams.get('first') || first;
        const lastQ  = u.searchParams.get('last')  || last;
        const cityFromCard = (livesText || '').split(',')[0]?.trim();
        const desiredCity  = cityParam || cityFromCard || '';

        u.searchParams.set('first', firstQ);
        u.searchParams.set('last',  lastQ);

        const v = u.searchParams.get('citystatezip') || '';
        if (/^[A-Za-z]{2}$/.test(v) && desiredCity) {
            const stateFromCard = (livesText || '').match(/\b[A-Z]{2}\b/)?.[0] || v;
            u.searchParams.set('citystatezip', `${desiredCity}, ${stateFromCard}`);
        }
        return u.href;
    } catch {
        return url;
    }
}

// ---------- cookie jar ----------
const jar = new CookieJar();
function getCookieHeader(url) { try { return jar.getCookieStringSync(url) || null; } catch { return null; } }
function storeSetCookies(url, setCookieHeader) {
    if (!setCookieHeader) return;
    const arr = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const c of arr) {
        try { const p = Cookie.parse(c); if (p) jar.setCookieSync(p, url); } catch {}
    }
}

// ---------- headers ----------
function headers(ref = ORIGIN + '/') {
    return {
        'User-Agent': USE_MOBILE_UA ? MOBILE_UA : DESKTOP_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': ref.startsWith(ORIGIN) ? 'same-origin' : 'none',
        'Sec-Fetch-User': '?1',
        'sec-ch-ua': '"Chromium";v="124", "Not A(Brand";v="99"',
        'sec-ch-ua-mobile': USE_MOBILE_UA ? '?1' : '?0',
        'sec-ch-ua-platform': USE_MOBILE_UA ? '"Android"' : '"Windows"',
        'Referer': ref
    };
}

// ---------- axios over Nimble (single session) ----------
const [PH, PP] = PROXY_HOSTPORT.split(':');
const agent = new HttpsProxyAgent(`http://${encodeURIComponent(N_USER)}:${encodeURIComponent(N_PASS)}@${PH}:${PP || 7000}`);
const client = axios.create({
    httpsAgent: agent,
    proxy: false,
    timeout: 60000,
    maxRedirects: 10,
    validateStatus: () => true
});

async function getWithCookies(url, ref) {
    const h = headers(ref);
    const ck = getCookieHeader(url);
    if (ck) h.Cookie = ck;
    const res = await client.get(url, { headers: h });
    storeSetCookies(url, res.headers['set-cookie']);
    return res;
}

// ---------- pick best card (prefer record permalink) ----------
function findBestCard($, first, last, city) {
    const wantCity  = norm(city);
    const wantFirst = norm(first);
    const wantLast  = norm(last);

    const candidates = [];
    $('a[href]').each((_, a) => {
        const $a = $(a);
        const cls = ($a.attr('class') || '').toLowerCase();
        const txt = ($a.text() || '').toLowerCase();
        if ((cls.includes('detail-link') && cls.includes('btn-success')) || txt.includes('view details')) {
            candidates.push($a);
        }
    });

    console.log('[debug] candidate detail anchors found =', candidates.length);
    candidates.slice(0, 5).forEach((a, i) => {
        const href = cleanHref(a.attr('href'));
        console.log(`[debug] cand[${i}] text="${(a.text() || '').trim()}" href=${href}`);
    });

    const toCard = ($node) =>
        $node.closest('.row').length ? $node.closest('.row')
            : $node.closest('td').length ? $node.closest('td')
                : $node.closest('table').length ? $node.closest('table')
                    : $node;

    let best = null;
    let bestScore = -1;

    candidates.forEach(($a) => {
        const $card = toCard($a);

        // prefer record permalink if present
        let recordPerma = ($card.find('[data-perma-link]').first().attr('data-perma-link') || '').trim();
        recordPerma = recordPerma ? absFTN(recordPerma) : '';

        const nameText  = $card.find('td:contains("Name:")').next().first().text().replace(/\s+/g,' ').trim();
        const livesText = $card.find('td:contains("Lives in")').next().first().text().replace(/\s+/g,' ').trim();

        const nm = norm(nameText);
        const lv = norm(livesText);
        const nameOk = nm.includes(wantFirst) && nm.includes(wantLast);
        const cityOk = lv.includes(wantCity);

        const score = (nameOk ? 1 : 0) + (cityOk ? 1 : 0);

        let href = absFTN(cleanHref($a.attr('href')));
        if (recordPerma && /\/record\//i.test(recordPerma)) href = recordPerma;

        if (score > bestScore) {
            bestScore = score;
            best = { nameText, livesText, detailHref: href, _score: score };
        }
    });

    return best;
}

(async () => {
    // 1) parse your rendered search html
    const html = fs.readFileSync(fullPath, 'utf8');
    const $ = cheerio.load(html);
    const chosen = findBestCard($, FIRST, LAST, CITY);
    if (!chosen) {
        console.error('Could not find a matching card/View Details link in the search HTML.');
        process.exit(2);
    }

    let detailUrl = chosen.detailHref;

// If it's a /search/people/results link, enforce "City, ST" in query.
// If it's a /record/... link, leave it EXACTLY as-is (no query params).
    if (!/\/record\//i.test(detailUrl)) {
        detailUrl = forceCityInQuery(detailUrl, {
            first: FIRST,
            last: LAST,
            livesText: chosen.livesText,
            cityParam: CITY.split(',')[0]?.trim()
        });
    }

    console.log('Chosen card:', {
        name: chosen.nameText,
        livesIn: chosen.livesText,
        detailsLink: detailUrl
    });


    // 2) warm + genealogy search in SAME session
    let res = await getWithCookies(ORIGIN + '/', ORIGIN + '/');
    console.log('Warm / status:', res.status);

    res = await getWithCookies(ORIGIN + '/robots.txt', ORIGIN + '/');
    console.log('Warm robots / status:', res.status);

    res = await getWithCookies(ORIGIN + '/search', ORIGIN + '/');
    console.log('Warm search form / status:', res.status);

    const searchUrl = `${ORIGIN}/search/genealogy/results?first=${encodeURIComponent(FIRST)}&last=${encodeURIComponent(LAST)}&citystatezip=${encodeURIComponent(CITY)}`;
    res = await getWithCookies(searchUrl, ORIGIN + '/');
    console.log('Genealogy search status:', res.status);

    await new Promise(r => setTimeout(r, 900));

    // 3) click detail in same session
    let resDetail = await getWithCookies(detailUrl, searchUrl);
    console.log('Detail status:', resDetail.status);

    let htmlDetail = typeof resDetail.data === 'string' ? resDetail.data : String(resDetail.data || '');
    // If it’s the “0 People Records” page and our click wasn’t a /record/ link, try the card’s permalink
    if (hasZeroPeople(htmlDetail) && !/\/record\//i.test(detailUrl)) {
        console.log('⚠️ Detail page shows 0 People Records — retrying with record permalink if available…');
        // re-extract perma from the same chosen card in the original HTML
        // (we already preferred it above; this is just a second chance)
        const $again = cheerio.load(html);
        const rePick = findBestCard($again, FIRST, LAST, CITY);
        if (rePick && /\/record\//i.test(rePick.detailHref)) {
            resDetail = await getWithCookies(rePick.detailHref, searchUrl);
            htmlDetail = typeof resDetail.data === 'string' ? resDetail.data : String(resDetail.data || '');
            console.log('Record permalink status:', resDetail.status);
        }
    }

    fs.writeFileSync('ftn_detail.html', htmlDetail, 'utf8');
    console.log('✅ wrote ftn_detail.html');

    // 4) If blocked, try Nimble Web Unblocker on the detail URL you chose
    if (resDetail.status === 403) {
        const NIMBLE_TOKEN = process.env.NIMBLE_TOKEN;
        if (!NIMBLE_TOKEN) {
            console.log('ℹ️ Detail 403 and NIMBLE_TOKEN not set — skipping unblocker fallback.');
            return;
        }

        console.log('⚠️ Detail 403 — retrying via Nimble Web Unblocker…');
        async function nimbleFetch(url, { format='text', wait=18000, wait_for='body,.results,.content,a.detail-link' } = {}, tag='try') {
            const payload = { url, format, render: true, country: 'US', locale: 'en', parse: false, wait, wait_for };
            const r = await axios.post('https://api.webit.live/api/v1/realtime/web', payload, {
                headers: { 'Authorization': `Basic ${NIMBLE_TOKEN}`, 'Content-Type': 'application/json' },
                timeout: Math.max(wait + 25000, 80000),
                validateStatus: () => true
            });
            if (r.data) {
                try {
                    fs.writeFileSync(`unblocker_${tag}.json`, JSON.stringify(r.data, null, 2));
                    if (r.data.html_content) fs.writeFileSync(`unblocker_${tag}.html`, r.data.html_content, 'utf8');
                } catch {}
            }
            return r;
        }

        const attempts = [
            { format:'text', wait:18000, wait_for:'a.detail-link,.results,body', tag:'t1_text_18s' },
            { format:'text', wait:25000, wait_for:'a.detail-link,.results,body', tag:'t2_text_25s' },
            { format:'html', wait:25000, wait_for:'a.detail-link,.results,body', tag:'t3_html_25s' },
            { format:'html', wait:35000, wait_for:'a.detail-link,.results,body', tag:'t4_html_35s' },
            { format:'html', wait:40000, wait_for:'a.detail-link,.results,body', tag:'t5_html_40s' },
        ];

        for (const a of attempts) {
            console.log(`Unblocker attempt ${a.tag}…`);
            const r = await nimbleFetch(detailUrl, a, a.tag);
            if (r.status === 200 && r.data?.html_content) {
                fs.writeFileSync('ftn_detail.html', r.data.html_content, 'utf8');
                console.log(`✅ wrote ftn_detail.html via Unblocker (${a.tag})`);
                break;
            } else {
                console.log(`Attempt ${a.tag} failed: status=${r.status} msg=${r.data?.message || 'no message'}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
})().catch(e => {
    console.error('❌ fetch error:', e.message);
    process.exit(3);
});
