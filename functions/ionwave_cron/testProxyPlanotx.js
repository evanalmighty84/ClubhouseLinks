// testProxyPlanotx.js
require('dotenv').config();
const axios = require('axios');

const raw = process.argv[2] || process.env.PROXY_LINE;
if (!raw) {
    console.error('Usage: node testProxyPlanotx.js "<raw-proxy-line>" OR set PROXY_LINE in .env');
    process.exit(2);
}

// Normalize various formats into { proto, host, port, username, password }
function normalize(raw) {
    raw = raw.trim();

    // socks5://user:pass@host:port or http(s)://user:pass@host:port
    let m = raw.match(/^(socks5|http|https):\/\/([^@]+)@([^:]+):(\d+)$/i);
    if (m) {
        const proto = m[1].toLowerCase();
        const [username, password] = m[2].split(':');
        return { proto, host: m[3], port: Number(m[4]), username, password };
    }

    // login:pass@host:port
    m = raw.match(/^([^:]+):([^@]+)@([^:]+):(\d+)$/);
    if (m) {
        return { proto: 'http', username: m[1], password: m[2], host: m[3], port: Number(m[4]) };
    }

    // protocol://host:port:login:pass (generator sometimes prints like this)
    m = raw.match(/^(https?|http|socks5)?:\/\/?([^:\/]+):(\d+):([^:]+):([^:]+)$/i);
    if (m) {
        const proto = (m[1] || 'http').toLowerCase();
        return { proto, host: m[2], port: Number(m[3]), username: m[4], password: m[5] };
    }

    // host:port:login:pass (no scheme)
    m = raw.match(/^([^:]+):(\d+):([^:]+):([^:]+)$/);
    if (m) {
        return { proto: 'http', host: m[1], port: Number(m[2]), username: m[3], password: m[4] };
    }

    throw new Error('Unrecognized proxy format: ' + raw);
}

async function run() {
    try {
        const p = normalize(raw);
        console.log('Normalized proxy:', p);

        const proxyConfig = {
            protocol: p.proto === 'https' ? 'https' : 'http',
            host: p.host,
            port: p.port,
            auth: {
                username: p.username,
                password: p.password,
            },
        };

        console.log('Testing proxy via axios to http://ip-api.com/json ...');
        const res = await axios.get('http://ip-api.com/json', {
            proxy: proxyConfig,
            timeout: 15000,
        });

        console.log('✅ Proxy test result:', res.data);
    } catch (err) {
        console.error('❌ Proxy test failed:', err.message);
        if (err.response) console.error('Response data:', err.response.data);
    }
}

run();
