// probeProxy.js
require('dotenv').config();
const axios = require('axios');

const raw = process.argv[2] || process.env.PROXY_LINE;
if (!raw) {
    console.error('Usage: node probeProxy.js "<proxy>" or set PROXY_LINE in .env');
    process.exit(2);
}

// normalize to user:pass@host:port or host:port:user:pass patterns
function parse(raw) {
    raw = raw.trim();
    let m = raw.match(/^https?:\/\/([^@]+)@([^:]+):(\d+)$/i);
    if (m) {
        const [user, pass] = m[1].split(':');
        return { host: m[2], port: Number(m[3]), username: user, password: pass, proto: 'http' };
    }
    m = raw.match(/^([^:]+):(\d+):([^:]+):([^:]+)$/);
    if (m) return { host: m[1], port: Number(m[2]), username: m[3], password: m[4], proto: 'http' };
    m = raw.match(/^socks5:\/\/([^@]+)@([^:]+):(\d+)$/i);
    if (m) {
        const [user, pass] = m[1].split(':');
        return { host: m[2], port: Number(m[3]), username: user, password: pass, proto: 'socks5' };
    }
    throw new Error('Unrecognized proxy format');
}

(async () => {
    try {
        const p = parse(raw);
        console.log('Probing proxy:', p);

        // axios supports http proxy via 'proxy' option
        const axiosOpts = {
            url: 'http://httpbin.org/ip',
            method: 'get',
            timeout: 15000,
            proxy: {
                host: p.host,
                port: p.port,
                protocol: p.proto === 'socks5' ? 'http' : 'http',
                auth: p.username ? { username: p.username, password: p.password } : undefined,
            }
        };

        console.log('Trying HTTP request through proxy...');
        const r = await axios(axiosOpts);
        console.log('HTTP probe response:', r.data);
    } catch (err) {
        console.error('Probe failed:', err.message || err.toString());
        if (err.response && err.response.data) console.error('response data:', err.response.data);
        process.exit(1);
    }
})();
