// emailFilter.js

require('net').Socket.prototype.setTimeout = function(msecs, callback) {
    // no-op
    return this;
};

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const util = require('util');

// ─── ACCOUNTS CONFIG ───────────────────────────────────────────────────────
// Added connTimeout/authTimeout to prevent internal connect timeouts
const ACCOUNTS = [
    {
        user:       'mark@jettinsurance.com',
        password:   'Jett5388!',
        host:       'mail6.hostek.com',
        port:       993,
        tls:        true,
        connTimeout: 10000,
        authTimeout:  5000
    },
    {
        user:       'carla@jettinsurance.com',
        password:   'Jett5388!',
        host:       'mail6.hostek.com',
        port:       993,
        tls:        true,
        connTimeout: 10000,
        authTimeout:  5000
    }

];

// ─── FOLDERS & RETENTION ────────────────────────────────────────────────────
const FOLDERS = {
    inbox:   'INBOX',
    promo:   'Promotional Spam',
    foreign: 'Foreign Spam',
    attach:  'Large Attachment 10 days holder'
};
const RETENTION = {
    scanDays:    15,
    promoKeep:   15,
    foreignKeep:  1,
    attachKeep: 10,
    junkKeep:     1
};

// any address ending in @jettinsurance.com or Al Hewitt at PNL
const INTERNAL_RX = [/@jettinsurance\.com$/i, /ahewitt@pnlending\.com$/i];

// ─── COMMON HELPERS ─────────────────────────────────────────────────────────
function formatImapDate(d) {
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DD = String(d.getDate()).padStart(2,'0');
    return `${DD}-${M[d.getMonth()]}-${d.getFullYear()}`;
}
function isInternal(addr) {
    return INTERNAL_RX.some(rx => rx.test(addr));
}
function isPromotional(txt) {
    const KW = ['offer','buy now','discount','sale','promo','save','unsubscribe'];
    txt = (txt || '').toLowerCase();
    return KW.some(w => txt.includes(w));
}
function isAsianSpam(txt) {
    return /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(txt || '');
}
async function listBoxes(imap) {
    return new Promise((res, rej) => imap.getBoxes((e, b) => e ? rej(e) : res(b)));
}
function findJunkBox(boxes, delimiter, path = []) {
    for (const name in boxes) {
        const full = [...path, name].join(delimiter);
        if (/junk|spam/i.test(name) && name !== FOLDERS.promo && name !== FOLDERS.foreign) {
            return full;
        }
        if (boxes[name].children) {
            const child = findJunkBox(boxes[name].children, delimiter, [...path, name]);
            if (child) return child;
        }
    }
    return null;
}

// ─── PROCESS INBOX FOR ONE ACCOUNT ───────────────────────────────────────────
async function processInbox(imap) {
    await imap.openBox(FOLDERS.inbox, false);
    const since = new Date(Date.now() - RETENTION.scanDays * 86400000);
    const sinceStr = formatImapDate(since);
    console.log(`🔎 [${imap._config.user}] INBOX since ${sinceStr}`);

    const uids = await imap.search([['SINCE', sinceStr]]);
    console.log(`ℹ️  [${imap._config.user}] ${uids.length} msgs`);
    if (!uids.length) return;

    let attachCount = 0;
    const promises = [];
    const fetch = imap.fetch(uids, { bodies: '', struct: false });

    fetch.on('message', msg => {
        const p = new Promise(res => {
            let uid, raw = '';
            msg.on('attributes', a => { uid = a.uid; });
            msg.on('body', stream => {
                stream.on('data', c => raw += c.toString('utf8'));
                stream.on('end', async () => {
                    try {
                        const mail = await simpleParser(raw);
                        const from = mail.from?.value[0]?.address?.toLowerCase() || '';
                        const text = (mail.subject || '') + '\n' + (mail.text || '');

                        if (isInternal(from)) {
                            console.log(`🔒 [${imap._config.user}] UID ${uid} internal`);
                        } else if (mail.attachments?.some(a => a.size > 15 * 1024 * 1024)) {
                            await imap.move(uid, FOLDERS.attach);
                            attachCount++;
                            console.log(`📂 [${imap._config.user}] UID ${uid} → ${FOLDERS.attach}`);
                        } else if (isPromotional(text)) {
                            await imap.move(uid, FOLDERS.promo);
                            console.log(`📦 [${imap._config.user}] UID ${uid} → ${FOLDERS.promo}`);
                        } else if (isAsianSpam(mail.text)) {
                            await imap.move(uid, FOLDERS.foreign);
                            console.log(`🌏 [${imap._config.user}] UID ${uid} → ${FOLDERS.foreign}`);
                        }
                    } catch (e) {
                        console.error(`❌ [${imap._config.user}] UID ${uid} error:`, e);
                    } finally {
                        res();
                    }
                });
            });
        });
        promises.push(p);
    });

    await new Promise((res, rej) => {
        fetch.once('error', err => rej(err));
        fetch.once('end', async () => {
            await Promise.all(promises);
            console.log(`🎒 [${imap._config.user}] Large attachments moved: ${attachCount}`);
            console.log(`✅ [${imap._config.user}] Inbox done`);
            res();
        });
    });
}

// ─── DELETE OLD MSGS FOR ONE ACCOUNT ────────────────────────────────────────
async function deleteOld(imap, folder, days) {
    try { await imap.openBox(folder, false); }
    catch { return console.warn(`⚠️ [${imap._config.user}] Folder "${folder}" missing`); }
    const cutoff = new Date(Date.now() - days * 86400000);
    const cutoffStr = formatImapDate(cutoff);
    console.log(`🗑️  [${imap._config.user}] ${folder} before ${cutoffStr}`);

    const uids = await imap.search([['BEFORE', cutoffStr]]);
    if (uids.length) {
        await imap.addFlags(uids, '\\Deleted');
        await imap.expunge();
        console.log(`✂️  [${imap._config.user}] Deleted ${uids.length} from ${folder}`);
    } else {
        console.log(`✅ [${imap._config.user}] No old msgs in ${folder}`);
    }
}

// ─── RUN FILTER FOR ONE ACCOUNT ─────────────────────────────────────────────
async function runFor(config) {
    const imap = new Imap(config);
    // promisify
    imap.openBox  = util.promisify(imap.openBox.bind(imap));
    imap.search   = util.promisify(imap.search.bind(imap));
    imap.move     = util.promisify(imap.move.bind(imap));
    imap.addFlags = util.promisify(imap.addFlags.bind(imap));
    imap.expunge  = util.promisify(imap.expunge.bind(imap));
    imap._config  = config;

    await new Promise((res, rej) => {
        imap.once('ready', res);
        imap.once('error', rej);
        imap.connect();
    });
    console.log(`\n📬 [${config.user}] Connected`);

    const boxes   = await listBoxes(imap);
    const junkBox = findJunkBox(boxes, imap.delimiter) || 'Junk E‑Mail';
    console.log(`🔍 [${config.user}] Junk folder: "${junkBox}"`);

    await processInbox(imap);
    await deleteOld(imap, FOLDERS.promo,   RETENTION.promoKeep);
    await deleteOld(imap, FOLDERS.foreign, RETENTION.foreignKeep);
    await deleteOld(imap, FOLDERS.attach,  RETENTION.attachKeep);
    await deleteOld(imap, junkBox,         RETENTION.junkKeep);

    imap.end();
    console.log(`🔚 [${config.user}] Disconnected`);
}

(async function main() {
    for (const cfg of ACCOUNTS) {
        await runFor(cfg);
    }
    console.log('\n✅ All accounts processed!');
})();
