// testProxy.js
const axios = require('axios');

function normalizeProxyString(raw) {
    raw = raw.trim();

    // Format: http://user:pass@ip:port
    let m = raw.match(/^http:\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/);
    if (m) {
        return {
            proto: 'http',
            username: m[1],
            password: m[2],
            host: m[3],
            port: parseInt(m[4], 10),
        };
    }

    // Format: ip:port:user:pass
    m = raw.match(/^([^:]+):(\d+):([^:]+):([^:]+)$/);
    if (m) {
        return {
            proto: 'http',
            host: m[1],
            port: parseInt(m[2], 10),
            username: m[3],
            password: m[4],
        };
    }

    throw new Error('Unrecognized proxy format: ' + raw);
}

async function testProxy(raw) {
    const proxy = normalizeProxyString(raw);
    console.log('\nProbing proxy:', proxy);

    try {
        const res = await axios.get('http://ip-api.com/json', {
            timeout: 15000,
            proxy: {
                protocol: proxy.proto,
                host: proxy.host,
                port: proxy.port,
                auth: {
                    username: proxy.username,
                    password: proxy.password
                }
            }
        });

        console.log('✅ Proxy is working. Geo-IP result:\n', res.data);
    } catch (err) {
        console.error('❌ Probe failed:', err.message || err);
    }
}

const rawProxy = process.argv[2];
if (!rawProxy) {
    console.error('Usage: node testProxy.js "<proxy_string>"');
    process.exit(1);
}

testProxy(rawProxy);
