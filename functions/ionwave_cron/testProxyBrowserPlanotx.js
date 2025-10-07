// testProxyBrowserPlanotx.js
require('dotenv').config();
const { chromium } = require('playwright');

const raw = process.argv[2] || process.env.PROXY_LINE;
if (!raw) {
    console.error('Usage: node testProxyBrowserPlanotx.js "<raw-proxy-line>" OR set PROXY_LINE in .env');
    process.exit(2);
}

function normalize(raw) {
    raw = raw.trim();
    let m = raw.match(/^(socks5|http|https):\/\/([^@]+)@([^:]+):(\d+)$/i);
    if (m) return { proto: m[1].toLowerCase(), username: m[2].split(':')[0], password: m[2].split(':')[1], host: m[3], port: Number(m[4]) };
    m = raw.match(/^([^:]+):([^@]+)@([^:]+):(\d+)$/);
    if (m) return { proto: 'http', username: m[1], password: m[2], host: m[3], port: Number(m[4]) };
    m = raw.match(/^(https?|http|socks5)?:\/\/?([^:\/]+):(\d+):([^:]+):([^:]+)$/i);
    if (m) return { proto: (m[1]||'http').toLowerCase(), host: m[2], port: Number(m[3]), username: m[4], password: m[5] };
    m = raw.match(/^([^:]+):(\d+):([^:]+):([^:]+)$/);
    if (m) return { proto: 'http', host: m[1], port: Number(m[2]), username: m[3], password: m[4] };
    throw new Error('Unrecognized proxy format: ' + raw);
}

(async () => {
    const p = normalize(raw);
    console.log('Using proxy:', p);

    const server = p.proto === 'socks5' ? `socks5://${p.host}:${p.port}` : `http://${p.host}:${p.port}`;
    const context = await chromium.launchPersistentContext('./ptx-profile', {
        headless: false,
        proxy: { server, username: p.username, password: p.password },
        args: ['--ignore-certificate-errors'],
    });

    const page = await context.newPage();
    try {
        await page.goto('https://httpbin.org/ip', { waitUntil: 'load', timeout: 30000 });
        const body = await page.textContent('body');
        console.log('Browser httpbin response:\n', body);
    } catch (err) {
        console.error('Browser test failed:', err.message || err);
    } finally {
        // Keep browser open to inspect. Close manually when done.
    }
})();
