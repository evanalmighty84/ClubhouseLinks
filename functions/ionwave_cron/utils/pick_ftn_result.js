#!/usr/bin/env node
// Robust FamilyTreeNow result picker:
// - Finds rows with "Lives in:" then grabs the enclosing result block
// - Extracts the "View Details" link within the same block
// - Scores by city exact match, fuzzy match, and optional geodistance.
//
// Usage:
//   node pick_ftn_result.js "Suzy" "Andrus" "Wylie, TX" ./ftn_search.html
//
// Optional:
//   export OPENCAGE_KEY=YOUR_KEY

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');

// ---------------- utils ----------------
const abs = (href) => {
    try { return new URL(href, 'https://www.familytreenow.com').href; }
    catch { return href; }
};

function norm(s=''){ return s.toLowerCase().replace(/\s+/g,' ').trim(); }
function parseCityState(s=''){
    const m = String(s).match(/^\s*([^,]+)\s*,\s*([A-Za-z]{2})\s*$/);
    if (m) return { city:m[1].trim(), state:m[2].trim().toUpperCase() };
    return { city:s.trim(), state:'' };
}

// lightweight string similarity
function strSim(a='',b=''){
    a=norm(a); b=norm(b);
    if(!a||!b) return 0;
    if(a===b) return 1;
    const minLen = Math.min(a.length,b.length);
    let same=0; for(let i=0;i<minLen;i++) if(a[i]===b[i]) same++;
    return (same/minLen)*0.6 + (minLen/Math.max(a.length,b.length))*0.4;
}
function buildSearchUrl({ first, last, livesText, base = 'https://www.familytreenow.com/search/people/results' }) {
    try {
        const u = new URL(base);
        if (first) u.searchParams.set('first', first);
        if (last)  u.searchParams.set('last', last);
        if (livesText) u.searchParams.set('citystatezip', livesText);
        return u.href;
    } catch {
        return base;
    }
}
function preferSearchOverRecord({ $card, chosenHref, first, last, livesText }) {
    // If the card has any people/genealogy link, use/normalize that first
    const inCard =
        $card.find('a[href*="/search/genealogy/results"]').first().attr('href') ||
        $card.find('a[href*="/search/people/results"]').first().attr('href') ||
        '';

    if (inCard) {
        return preferGenealogySearch({
            href: absFTN(inCard),
            first, last, livesText
        });
    }

    // If what we "chose" is a /record/ link, synthesize a proper genealogy search
    if (chosenHref && /\/record\//i.test(chosenHref)) {
        return preferGenealogySearch({
            href: absFTN(chosenHref),
            first, last, livesText
        });
    }

    // Otherwise normalize whatever we had, then prefer genealogy form of it
    if (chosenHref) {
        return preferGenealogySearch({
            href: absFTN(chosenHref),
            first, last, livesText
        });
    }

    // Final fallback: fresh genealogy search
    return preferGenealogySearch({
        href: '',
        first, last, livesText
    });
}



// --- add helpers ---
function cleanHref(raw = '') {
    if (!raw) return '';
    let s = String(raw).trim();
    s = s.replace(/\\%22|%22/gi, '"'); // %22 or \%22 -> "
    s = s.replace(/\\"/g, '"');        // \" -> "
    s = s.replace(/&quot;/gi, '"');    // &quot; -> "
    s = s.replace(/^"+|"+$/g, '');     // strip surrounding "
    s = s.replace(/^'+|'+$/g, '');     // strip surrounding '
    s = s.replace(/^"+\//, '/');       // remove leading quote+slash
    s = s.replace(/([^:]\/)\/+/g, '$1'); // collapse accidental double slashes
    return s.trim();
}
function absFTN(href = '') {
    const cleaned = cleanHref(href);
    try { return new URL(cleaned, 'https://www.familytreenow.com').href; }
    catch { return cleaned; }
}
function forceCityInQuery(urlStr, { first, last, livesText }) {
    try {
        const u = new URL(absFTN(urlStr));
        // only fix the search/people/results pattern
        if (!/\/search\/people\/results/i.test(u.pathname)) return u.href;

        // ensure first/last present (FTN sometimes needs these)
        if (first && !u.searchParams.get('first')) u.searchParams.set('first', first);
        if (last && !u.searchParams.get('last')) u.searchParams.set('last', last);

        // force exact citystatezip from the card's "Lives in:"
        if (livesText) u.searchParams.set('citystatezip', livesText);

        return u.href;
    } catch {
        return urlStr;
    }
}



// --------------- geocoding ---------------
const OPENCAGE_KEY = process.env.OPENCAGE_KEY || '';

async function geocode(city, state='US'){
    const q = state && state.length>=2 ? `${city}, ${state}` : city;
    try {
        if (OPENCAGE_KEY) {
            const { data } = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
                params: { q, key: OPENCAGE_KEY, limit:1, countrycode:'us' }, timeout:15000
            });
            const g = data?.results?.[0]?.geometry;
            if (g) return { lat:g.lat, lon:g.lng };
        } else {
            const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: { q, format:'json', addressdetails:0, limit:1, countrycodes:'us' },
                headers: { 'User-Agent': 'ftn-geocoder/1.0' },
                timeout:15000
            });
            if (Array.isArray(data) && data[0])
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
    } catch(_) {}
    return null;
}
function haversineKm(a,b){
    if(!a||!b) return Infinity;
    const R=6371;
    const dLat=(b.lat-a.lat)*Math.PI/180;
    const dLon=(b.lon-a.lon)*Math.PI/180;
    const la1=a.lat*Math.PI/180, la2=b.lat*Math.PI/180;
    const x=Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
}

function withParams(url, paramsObj) {
    try {
        const u = new URL(url, 'https://www.familytreenow.com');
        for (const [k,v] of Object.entries(paramsObj || {})) {
            if (v != null && v !== '') u.searchParams.set(k, v);
        }
        // strip session-y tokens if present
        u.searchParams.delete('rid');
        u.searchParams.delete('smck');
        return u.href;
    } catch { return url; }
}

function coerceToGenealogy(url) {
    try {
        const u = new URL(url, 'https://www.familytreenow.com');
        if (/^\/search\/people\/results/i.test(u.pathname)) {
            u.pathname = '/search/genealogy/results';
        }
        return u.href;
    } catch { return url; }
}

function preferGenealogySearch({ href, first, last, livesText }) {
    const H = href || '';
    const abs = (x) => (/^https?:\/\//i.test(x) ? x : `https://www.familytreenow.com${x || ''}`);

    // 1) if it’s already genealogy, just normalize & add params
    if (/\/search\/genealogy\/results/i.test(H)) {
        return withParams(abs(H), {
            first, last,
            citystatezip: livesText || ''
        });
    }

    // 2) if it’s people/results, coerce to genealogy + params
    if (/\/search\/people\/results/i.test(H)) {
        const g = coerceToGenealogy(abs(H));
        return withParams(g, {
            first, last,
            citystatezip: livesText || ''
        });
    }

    // 3) any other link (record or generic) → build a clean genealogy search
    const base = 'https://www.familytreenow.com/search/genealogy/results';
    return withParams(base, {
        first, last,
        citystatezip: livesText || ''
    });
}


// --------------- extraction ---------------
function findCards($, first, last){
    const cards = [];

    // ---------- Strategy A: rows that contain "Lives in:" ----------
    $('tr').each((i, tr) => {
        const $tr = $(tr);
        const left = $tr.find('td').first().text().trim().toLowerCase();
        if (!left.includes('lives in')) return;

        const valCell = $tr.find('td').eq(1);
        const livesText = valCell.text().replace(/\s+/g,' ').trim(); // e.g. "Wylie, TX"

        // climb to enclosing card (row) that also contains action links
        let $card = $tr.closest('.row');
        if (!$card.length) $card = $tr.closest('table').closest('.row');
        if (!$card.length) $card = $tr.closest('td').closest('.row');
        if (!$card.length) $card = $tr.closest('td');

        // name in same card
        const nameText =
            $card.find('td:contains("Name:")').next().first().text().replace(/\s+/g,' ').trim() || '';

        // prefer stable permalink if present (only as a hint)
        let perma = cleanHref($card.find('[data-perma-link]').first().attr('data-perma-link'));

        // collect href candidates (clean)
        const cand = [
            $card.find('a.btn.btn-success.detail-link[href]').first().attr('href'),
            $card.find('a.summary-detail-link.detail-link[href]').first().attr('href'),
            $card.find('a.detail-link[href]').first().attr('href'),
            $card.find('a[href*="/search/people/results"]').first().attr('href'),
            $card.find('a[href*="/record/"]').first().attr('href'),
        ].map(h => cleanHref(h)).filter(Boolean);

        // preliminary pick: /search/people/results > /record > anything else
        let preliminary =
            cand.find(h => /\/search\/people\/results/i.test(h)) ||
            cand.find(h => /^\/record\//i.test(h)) ||
            cand[0] || '';

        if (!preliminary && perma) preliminary = perma;

        // FINAL: prefer a usable /search URL (avoid 404 /record)
        const detailHref = preferSearchOverRecord({
            $card, chosenHref: preliminary, first, last, livesText
        });

        if (livesText) {
            cards.push({
                nameText,
                livesText,
                detailUrl: detailHref,
                _debugCardHtml: $card.html()?.slice(0,500) || ''
            });
        }
    });

    // ---------- Strategy B: fallback via “People Records” blocks ----------
    if (!cards.length) {
        $('.summary-detail-link.detail-link').each((_, a) => {
            const $a = $(a);
            const $card = $a.closest('.row').length ? $a.closest('.row') : $a.closest('td');

            const nameText =
                $card.find('td:contains("Name:")').next().first().text().replace(/\s+/g,' ').trim() || '';
            const livesText =
                $card.find('td:contains("Lives in:")').next().first().text().replace(/\s+/g,' ').trim() || '';

            let perma = cleanHref($card.find('[data-perma-link]').first().attr('data-perma-link'));

            const cand = [
                $card.find('a.btn.btn-success.detail-link[href]').first().attr('href'),
                $card.find('a.summary-detail-link.detail-link[href]').first().attr('href'),
                $card.find('a[href*="/search/people/results"]').first().attr('href'),
                $card.find('a[href*="/record/"]').first().attr('href'),
            ].map(h => cleanHref(h)).filter(Boolean);

            let preliminary =
                cand.find(h => /\/search\/people\/results/i.test(h)) ||
                cand.find(h => /^\/record\//i.test(h)) ||
                cand[0] || '';

            if (!preliminary && perma) preliminary = perma;

            const detailHref = preferSearchOverRecord({
                $card, chosenHref: preliminary, first, last, livesText
            });

            if (livesText) {
                cards.push({
                    nameText,
                    livesText,
                    detailUrl: detailHref,
                    _debugCardHtml: $card.html()?.slice(0,500) || ''
                });
            }
        });
    }

    return cards;
}





async function pickBest(html, targetCityState, first, last){
    const { city: targetCity, state: targetState } = parseCityState(targetCityState);
    const $ = cheerio.load(html);
    // ✅ AFTER: pass first + last name so it can fix links
    const cards = findCards($, first, last);


    if (!cards.length) return { best: null, all: [], debug: collectHints($) };

    // optional target geo
    let targetGeo = null;
    if (targetCity) {
        targetGeo = await geocode(targetCity, targetState || 'US');
    }

    const scored = [];
    for (const c of cards) {
        const { city: liveCity, state: liveState } = parseCityState(c.livesText);
        let score = 0;

        if (targetCity && liveCity && norm(liveCity) === norm(targetCity)) score += 0.65;
        if (targetState && liveState && liveState.toUpperCase() === targetState.toUpperCase()) score += 0.2;

        score += 0.15 * strSim(liveCity, targetCity);

        let km = Infinity;
        if (targetGeo && liveCity) {
            const geo = await geocode(liveCity, liveState || targetState || 'US');
            if (geo) {
                km = haversineKm(targetGeo, geo);
                const bonus = Math.max(0, 0.6 - Math.min(km, 400) * 0.0015);
                score += bonus;
            }
        }

        scored.push({ ...c, liveCity, liveState, km, score });
    }

    scored.sort((a,b) => b.score - a.score);
    return { best: scored[0] || null, all: scored, debug: { found: cards.length } };
}

function collectHints($){
    // Grab a bit of text to prove we loaded a real page
    const title = $('title').text().trim();
    const anyLives = $('td:contains("Lives in:")').length;
    const anyButtons = $('a.detail-link[href]').length;
    return { title, anyLives, anyButtons };
}

// --- ADD THIS anywhere above the CLI section ---
module.exports = {
    pickBest,
    buildSearchUrl,
};


// --------------- CLI ---------------
// --------------- CLI ---------------
if (require.main === module) {
    (async () => {
        const [, , firstArg, lastArg, cityArg, filePath] = process.argv;
        if (!cityArg || !filePath) {
            console.log('Usage: node pick_ftn_result.js "<First>" "<Last>" "<City[, ST]>" <search.html>');
            process.exit(1);
        }
        const html = fs.readFileSync(path.resolve(filePath), 'utf8');

        const res = await pickBest(html, cityArg, firstArg, lastArg);

        if (!res.best) {
            console.log('No result cards found.');
            console.log('Debug:', res.debug);
            process.exit(2);
        }

        const b = res.best;
        console.log('Best match:', {
            name: b.nameText || `${first} ${last}`,
            livesIn: b.livesText,
            detailUrl: b.detailUrl,
            score: Number(b.score.toFixed(3)),
            distance_km: isFinite(b.km) ? Number(b.km.toFixed(1)) : null,
        });

        console.log('\nVIEW_DETAILS_URL:', b.detailUrl);
    })();
}

