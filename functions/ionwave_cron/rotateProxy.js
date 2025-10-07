// rotateProxy.js
const fs = require('fs');

let proxies = [];
let index = 0;

function loadProxies(filePath = 'proxies.txt') {
    const raw = fs.readFileSync(filePath, 'utf8');
    proxies = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);
    index = 0;
    return proxies.length;
}

function getNextProxy() {
    if (!proxies.length) throw new Error('Proxy list not loaded');
    const proxy = proxies[index % proxies.length];
    index++;
    return proxy;
}

module.exports = {
    loadProxies,
    getNextProxy
};
