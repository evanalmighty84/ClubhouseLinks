// follow_ftn_details.js
// Usage:
//   NIMBLE_TOKEN='<base64 token>' node follow_ftn_details.js "Suzy" "Andrus" "Wylie, TX" ftn_search.html
// If NIMBLE_TOKEN is set, saves the profile page to ftn_detail.html

const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');

const [, , FIRST, LAST, CITY, SEARCH_HTML_PATH] = process.argv;
if (!FIRST || !LAST || !CITY || !SEARCH_HTML_PATH) {
    console.log('Usage: node follow_ftn_details.js "<First>" "<Last>" "<City, ST>" <search.html>');
    process.exit(1);
}

// ---------- small utils ----------
const ORIGIN = 'https://www.familytreenow.com';

function absFTN(href = '') {
    try {
        if (!href) return '';
        return new URL(href, ORIGIN).href;
    } catch { return ''; }
}

function cleanHref(h) {
    if (!h) return '';
    return String(h).replace(/^["']|["']$/g, '').trim();
}

function forceCityInQuery(url, { first, last, livesText }) {
    if (!url) return '';
    try {
        const u = new URL(url, ORIGIN);
        if (first) u.searchParams.set('first', first);
        if (last)  u.searchParams.set('last', last);
        // livesText like "Wylie, TX"
        if (livesText && !u.searchParams.get('citystatezip')) {
            u.searchParams.set('citystatezip', livesText);
        }
        return u.href;
    } catch { return url; }
}

function levenshtein(a = '', b = '') {
    a = a.toLowerCase(); b = b.toLowerCase();
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
        Array(b.length + 1).fill(0)
    );
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }
    return dp[a.length][b.length];
}

function nameDistance(full = '', targetFirst = '', targetLast = '') {
    const t = `${targetFirst} ${targetLast}`.trim();
    return levenshtein(full.trim(), t);
}

// ---------- parse cards & pick best ----------
function findCards($, first, last) {
    const cards = [];

    // Primary: rows that have "Lives in:"
    $('tr').each((_, tr) => {
        const $tr = $(tr);
        const left = $tr.find('td').first().text().trim().toLowerCase();
        if (!left.includes('lives in')) return;

        const livesText = $tr.find('td').eq(1).text().replace(/\s+/g,' ').trim();
        if (!livesText) return;

        // climb to visual "card"
        let $card = $tr.closest('.row');
        if (!$card.length) $card = $tr.closest('table').closest('.row');
        if (!$card.length) $card = $tr.closest('td').closest('.row');
        if (!$card.length) $card = $tr.closest('td');

        const nameText = $card.find('td:contains("Name:")').next().first()
            .text().replace(/\s+/g,' ').trim() || '';

        // find the actual CTA in this same card
        const ctaHref =
            $card.find('a.btn.btn-success.detail-link[href]').first().attr('href') ||
            $card.find('a.summary-detail-link.detail-link[href]').first().attr('href') ||
            $card.find('a.detail-link[href]').first().attr('href') || '';

        if (nameText || ctaHref) {
            cards.push({
                nameText,
                livesText,
                ctaHref: cleanHref(ctaHref),
                $card
            });
        }
    });

    // Fallback: “People Records” blocks
    if (!cards.length) {
        $('.summary-detail-link.detail-link').each((_, a) => {
            const $a = $(a);
            const $card = $a.closest('.row').length ? $a.closest('.row') : $a.closest('td');

            const nameText =
                $card.find('td:contains("Name:")').next().first().text().replace(/\s+/g,' ').trim() || '';
            const livesText =
                $card.find('td:contains("Lives in:")').next().first().text().replace(/\s+/g,' ').trim() || '';

            const ctaHref =
                $card.find('a.btn.btn-success.detail-link[href]').first().attr('href') ||
                $card.find('a.summary-detail-link.detail-link[href]').first().attr('href') ||
                $card.find('a[href*="/search/people/results"]').first().attr('href') ||
                $card.find('a[href*="/record/"]').first().attr('href') ||
                '';

            if (nameText || ctaHref) {
                cards.push({
                    nameText,
                    livesText,
                    ctaHref: cleanHref(ctaHref),
                    $card
                });
            }
        });
    }

    return cards;
}

function pickBest(cards, { first, last, cityWanted }) {
    if (!cards.length) return null;

    const cityNorm = (s='') => s.toLowerCase().replace(/\s+/g,' ').trim();
    const wantCity = cityNorm(cityWanted);

    let best = null;
    for (const c of cards) {
        const nm = c.nameText || '';
        const lv = c.livesText || '';
        const nd = nameDistance(nm, first, last);

        let score = 0;
        // small bonus for city match
        if (lv && wantCity && cityNorm(lv).includes(cityNorm(wantCity))) score += 1.6;

        // small bonus for direct “View Details” button existing
        if (c.ctaHref) score += 0.4;

        // mild penalty if name far from target
        score -= Math.min(nd / 10, 1);

        if (!best || score > best.score) {
            best = { ...c, score };
        }
    }
    return best;
}

// ---------- main ----------
const html = fs.readFileSync(SEARCH_HTML_PATH, 'utf8');
const $ = cheerio.load(html);

const cards = findCards($, FIRST, LAST);
const chosen = pickBest(cards, { first: FIRST, last: LAST, cityWanted: CITY });

if (!chosen) {
    console.log('No result cards found.');
    process.exit(2);
}

let detailUrl = '';
if (chosen.ctaHref) {
    detailUrl = absFTN(chosen.ctaHref);
    // if it’s a people-search URL, force city & names into query
    if (/\/search\/people\/results/i.test(detailUrl)) {
        detailUrl = forceCityInQuery(detailUrl, {
            first: FIRST, last: LAST, livesText: chosen.livesText || CITY
        });
    }
} else {
    // last-resort: build a genealogy search url (works reliably)
    const u = new URL('/search/genealogy/results', ORIGIN);
    u.searchParams.set('first', FIRST);
    u.searchParams.set('last', LAST);
    u.searchParams.set('citystatezip', chosen.livesText || CITY);
    detailUrl = u.href;
}

console.log('Best match:', {
    name: chosen.nameText || `${FIRST} ${LAST}`,
    livesIn: chosen.livesText || '',
    detailUrl,
    score: chosen.score
});
console.log('\nDETAIL_URL:', detailUrl);

// Optional: fetch detail page via Nimble
const token = process.env.NIMBLE_TOKEN;
if (!token) process.exit(0);

(async () => {
    try {
        const payload = {
            url: detailUrl,
            format: 'html',
            render: true,
            country: 'US',
            locale: 'en',
            parse: false,
            wait: 6000
        };
        const r = await axios.post(
            'https://api.webit.live/api/v1/realtime/web',
            payload,
            {
                headers: {
                    'Authorization': `Basic ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000,
                validateStatus: () => true
            }
        );
        if (r.data && r.data.html_content && r.status === 200) {
            fs.writeFileSync('ftn_detail.html', r.data.html_content, 'utf8');
            console.log('✅ wrote ftn_detail.html');
        } else {
            console.log('⚠️ detail fetch failed:', r.status, r.data && r.data.message);
        }
    } catch (e) {
        console.log('❌ detail fetch error:', e.message);
    }
})();
