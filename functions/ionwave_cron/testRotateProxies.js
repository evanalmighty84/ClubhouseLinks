#!/usr/bin/env node
// testRotateProxies.js
// Updated: uses https-proxy-agent for axios probes and optional session generator.

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { URL } = require('url');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');



const argv = process.argv.slice(2);
const DO_BROWSER = argv.includes('--browser');



async function loadProxies() {
    const envList = process.env.PROXY_LIST;
    const file = process.env.PROXY_FILE || path.resolve(process.cwd(), 'proxies.txt');
    const proxies = [];

    // Option A: explicit env list
    if (envList) {
        envList.split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(p => proxies.push(p));
    }

    // Option B: file
    if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(p => proxies.push(p));
    }

    // Option C: generate session-style proxies from base components (helpful for your provider)
    // Provide PROXY_BASE_USER, PROXY_PASS, PROXY_HOST, PROXY_PORT optionally; PROXY_COUNT default 10
    const baseUser = process.env.PROXY_BASE_USER;
    const basePass = process.env.PROXY_PASS;
    const host = process.env.PROXY_HOST;
    const port = process.env.PROXY_PORT;
    const count = Number(process.env.PROXY_COUNT || 10);

    if (baseUser && basePass && host && port) {
        for (let i = 0; i < count; i++) {
            // simple session id generator; use sessTime=3 by default
            const sid = Math.random().toString(36).slice(2, 10);
            const username = `${baseUser}-session-${sid}-sessTime-3`;
            const line = `http://${username}:${basePass}@${host}:${port}`;
            proxies.push(line);
        }
    }

    if (!proxies.length) {
        console.warn('No proxies found (PROXY_LIST, PROXY_FILE or PROXY_BASE_*). Exiting.');
        process.exit(2);
    }
    return proxies;
}

// Accept many formats:
// - http://user:pass@host:port
// - https://user:pass@host:port
// - socks5://user:pass@host:port
// - host:port:user:pass
// - user:pass@host:port
// - host:port
function normalizeProxy(raw) {
    if (!raw) return null;
    raw = raw.trim();

    // full URL with scheme
    let m = raw.match(/^(https?|http|socks5):\/\/([^@]+)@([^:\/]+):(\d+)$/i);
    if (m) {
        const proto = m[1].toLowerCase();
        const [username, password] = m[2].split(':');
        return { proto, host: m[3], port: Number(m[4]), username, password };
    }

    // host:port:user:pass
    m = raw.match(/^([^:]+):(\d+):([^:]+):([^:]+)$/);
    if (m) return { proto: 'http', host: m[1], port: Number(m[2]), username: m[3], password: m[4] };

    // user:pass@host:port (no scheme)
    m = raw.match(/^([^:]+):([^@]+)@([^:]+):(\d+)$/);
    if (m) return { proto: 'http', username: m[1], password: m[2], host: m[3], port: Number(m[4]) };

    // userpass@host:port (rare form)
    m = raw.match(/^([^@]+)@([^:]+):(\d+)$/);
    if (m) {
        const userPart = m[1];
        const [username, password] = userPart.includes(':') ? userPart.split(':') : [userPart, ''];
        return { proto: 'http', username, password, host: m[2], port: Number(m[3]) };
    }

    // fallback host:port
    m = raw.match(/^([^:]+):(\d+)$/);
    if (m) return { proto: 'http', host: m[1], port: Number(m[2]) };

    throw new Error('Unrecognized proxy format: ' + raw);
}

async function probeWithAxios(proxy) {
    // Try multiple targets; prefer https target (ipinfo) last
    const targets = ['http://httpbin.org/ip', 'https://ipinfo.io/json'];
    let lastError = null;

    for (const t of targets) {
        try {
            // if socks proxy
            if (proxy.proto && proxy.proto.startsWith('socks')) {
                if (!SocksProxyAgent) throw new Error('socks-proxy-agent not installed (npm i socks-proxy-agent)');
                const proxyUrl = `${proxy.proto}://${proxy.username ? `${proxy.username}:${proxy.password}@` : ''}${proxy.host}:${proxy.port}`;
                const agent = new (SocksProxyAgent.SocksProxyAgent || SocksProxyAgent)(proxyUrl);
                const res = await axios.get(t, { httpAgent: agent, httpsAgent: agent, timeout: 15000 });
                return { ok: true, url: t, data: res.data };
            }

            // http/https proxy -> use https-proxy-agent for better compatibility with provider gateways
            if (!HttpsProxyAgent) {
                // fallback to axios proxy option (less reliable)
                const proxyCfg = proxy.username ? {
                    host: proxy.host,
                    port: proxy.port,
                    protocol: (proxy.proto === 'https' ? 'https' : 'http'),
                    auth: { username: proxy.username, password: proxy.password }
                } : { host: proxy.host, port: proxy.port, protocol: (proxy.proto === 'https' ? 'https' : 'http') };
                const res = await axios.get(t, { proxy: proxyCfg, timeout: 15000 });
                return { ok: true, url: t, data: res.data };
            } else {
                // use HttpsProxyAgent: better matches browser tunnel behavior
                const cred = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
                const proxyUrl = `${proxy.proto}://${cred}${proxy.host}:${proxy.port}`;
                const agent = new HttpsProxyAgent(proxyUrl);
                const isHttps = t.toLowerCase().startsWith('https:');
                const res = await axios.get(t, {
                    timeout: 15000,
                    ...(isHttps ? { httpsAgent: agent } : { httpAgent: agent }),
                    // do not set axios proxy when passing agent
                    proxy: false,
                });
                return { ok: true, url: t, data: res.data };
            }
        } catch (err) {
            const eMsg = err?.response?.status ? `HTTP ${err.response.status}` : (err.message || String(err));
            lastError = eMsg;
            // try next target
        }
    }
    return { ok: false, error: lastError || 'unknown' };
}

async function probeWithPlaywright(proxy) {
    // lightweight browser check using Playwright chromium, headless
    const { chromium } = require('playwright');
    const server = (proxy.proto === 'socks5') ? `socks5://${proxy.host}:${proxy.port}` : `http://${proxy.host}:${proxy.port}`;
    const launchOpts = {
        headless: true,
        args: ['--no-sandbox', '--ignore-certificate-errors'],
    };
    const proxyForPlay = { server };
    if (proxy.username) { proxyForPlay.username = proxy.username; proxyForPlay.password = proxy.password; }

    let browser, context, page;
    try {
        browser = await chromium.launch(launchOpts);
        context = await browser.newContext({ proxy: proxyForPlay, ignoreHTTPSErrors: true });
        page = await context.newPage();
        await page.goto('https://httpbin.org/ip', { timeout: 20000, waitUntil: 'load' });
        const txt = await page.textContent('body');
        await context.close();
        await browser.close();
        return { ok: true, data: txt };
    } catch (err) {
        try { if (context) await context.close(); } catch (e) {}
        try { if (browser) await browser.close(); } catch (e) {}
        return { ok: false, error: err.message || String(err) };
    }
}

(async () => {
    const rawList = await loadProxies();
    console.log(`Loaded ${rawList.length} proxies.`);

    for (let i = 0; i < rawList.length; i++) {
        const raw = rawList[i];
        let proxy;
        try {
            proxy = normalizeProxy(raw);
        } catch (err) {
            console.error(`#${i+1} parse error for line:`, raw, '\n ', err.message);
            continue;
        }

        console.log(`\n=== Proxy #${i+1} ===`);
        console.log('raw:', raw);
        console.log('normalized:', proxy);

        // axios probe
        try {
            const res = await probeWithAxios(proxy);
            if (res.ok) {
                console.log('Axios probe success:', res.url, '\n', typeof res.data === 'string' ? res.data.slice(0,400) : JSON.stringify(res.data).slice(0,400));
            } else {
                console.warn('Axios probe failed:', res.error);
            }
        } catch (err) {
            console.warn('Axios probe unexpected error:', err.message || err);
        }

        // optional browser probe
        if (DO_BROWSER) {
            console.log('Running Playwright browser probe (headless) ...');
            const bres = await probeWithPlaywright(proxy);
            if (bres.ok) {
                console.log('Browser probe success, body snippet:', (typeof bres.data === 'string' ? bres.data.slice(0,200) : JSON.stringify(bres.data).slice(0,200)));
            } else {
                console.warn('Browser probe failed:', bres.error);
            }
        }

        // small random delay to avoid rapid-fire
        const delay = 800 + Math.floor(Math.random() * 1200);
        await new Promise((r) => setTimeout(r, delay));
    }

    console.log('\nDone.');
    process.exit(0);
})();
