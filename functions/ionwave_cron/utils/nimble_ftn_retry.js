// nimble_ftn_retry.js
// Usage: TOKEN=base64 node nimble_ftn_retry.js "William" "Ligon" "TX"

const fs = require('fs');
const axios = require('axios');

const TOKEN =
    process.env.TOKEN ||
    'YWNjb3VudC1jbHViaG91c2VfbGlua3NfMHo0bHhlLXBpcGVsaW5lLW5pbWJsZWFwaTp6MjE4RDh0WDdRMHU=';

const API_URL = 'https://api.webit.live/api/v1/realtime/web';
const SESSION = 'ftn-' + Math.random().toString(36).slice(2, 10);

function headers(ref = 'https://www.familytreenow.com/') {
    return {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Referer': ref,
    };
}

function save(name, obj) {
    try { fs.writeFileSync(name, JSON.stringify(obj, null, 2)); } catch {}
}

async function call(body, label) {
    const payload = { session: SESSION, ...body };
    const { data, status } = await axios.post(API_URL, payload, {
        headers: { Authorization: `Basic ${TOKEN}`, 'Content-Type': 'application/json' },
        timeout: 180000,
        validateStatus: () => true,
    });
    save(`ftn.${label}.json`, data ?? { status });
    if (data?.success === 'false') throw new Error(data.message || `Nimble error: ${label}`);
    return data;
}

(async () => {
    const [, , first, last, citystate = 'TX'] = process.argv;
    if (!first || !last) {
        console.log('Usage: TOKEN=base64 node nimble_ftn_retry.js "<First>" "<Last>" "[City, ST|ST]"');
        process.exit(1);
    }

    for (const k of ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','NO_PROXY','no_proxy']) delete process.env[k];

    const url =
        `https://www.familytreenow.com/search/genealogy/results?first=${encodeURIComponent(first)}&last=${encodeURIComponent(last)}&citystatezip=${encodeURIComponent(citystate)}`;
    console.log('🔎', url);

    // 0) WARM‑UP (same session) — let CF/cookies settle
    try {
        console.log('🔥 warm-up…');
        await call({
            url: 'https://www.familytreenow.com/',
            format: 'text',
            render: true,
            parse: false,
            country: 'US',
            locale: 'en',
            wait: 8000,
            headers: headers('https://www.familytreenow.com/'),
        }, 'warmup_home');
    } catch (e) {
        console.log('warm-up warning:', e.message);
    }

    // 1) RENDERED HTML, no wait_for (30s)
    try {
        console.log('C1) rendered html, wait=30000, no wait_for…');
        const r1 = await call({
            url,
            format: 'html',
            render: true,
            parse: false,
            country: 'US',
            locale: 'en',
            wait: 30000,
            headers: headers(),
        }, 'C1_html_30000_nowaitfor');
        if (r1?.html_content) {
            fs.writeFileSync('ftn_search.html', r1.html_content, 'utf8');
            console.log('✅ C1 wrote ftn_search.html');
            return;
        }
        console.log('C1 empty html_content');
    } catch (e) {
        console.log('C1 error:', e.message);
    }

    // 2) RENDERED HTML, with wait_for (35s)
    try {
        console.log('C2) rendered html, wait=35000, with wait_for…');
        const r2 = await call({
            url,
            format: 'html',
            render: true,
            parse: false,
            country: 'US',
            locale: 'en',
            wait: 35000,
            wait_for: 'a[href*=profile], a[href*=detail], .results, #results',
            headers: headers(),
        }, 'C2_html_35000_waitfor');
        if (r2?.html_content) {
            fs.writeFileSync('ftn_search.html', r2.html_content, 'utf8');
            console.log('✅ C2 wrote ftn_search.html');
            return;
        }
        console.log('C2 empty html_content');
    } catch (e) {
        console.log('C2 error:', e.message);
    }

    // 3) RENDERED HTML, no wait_for (45s) — max patience
    try {
        console.log('C3) rendered html, wait=45000, no wait_for…');
        const r3 = await call({
            url,
            format: 'html',
            render: true,
            parse: false,
            country: 'US',
            locale: 'en',
            wait: 45000,
            headers: headers(),
        }, 'C3_html_45000_nowaitfor');
        if (r3?.html_content) {
            fs.writeFileSync('ftn_search.html', r3.html_content, 'utf8');
            console.log('✅ C3 wrote ftn_search.html');
            return;
        }
        console.log('C3 empty html_content');
    } catch (e) {
        console.log('C3 error:', e.message);
    }

    console.log('❌ Still head-only HTML. Check the last ftn.C*.json message.');
    process.exit(3);
})();
