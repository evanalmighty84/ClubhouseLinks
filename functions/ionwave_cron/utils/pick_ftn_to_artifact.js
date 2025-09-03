#!/usr/bin/env node
/**
 * Make a small artifact the clicker can use.
 * Usage:
 *   node pick_ftn_to_artifact.js "<First>" "<Last>" "<City[, ST]>" ./ftn_search.html ./best_pick.json
 */
const fs = require('fs');
const path = require('path');
const { pickBest } = require('./pick_ftn_result');

(async () => {
    const [, , first, last, city, htmlPath, outPath] = process.argv;
    if (!first || !last || !city || !htmlPath || !outPath) {
        console.error('Usage: node pick_ftn_to_artifact.js "<First>" "<Last>" "<City[, ST]>" <search.html> <out.json>');
        process.exit(1);
    }

    const html = fs.readFileSync(path.resolve(htmlPath), 'utf8');
    const res = await pickBest(html, city, first, last);
    if (!res?.best) {
        console.error('No best pick found.');
        process.exit(2);
    }

    const best = {
        first, last, city,
        livesText: res.best.livesText,
        detailUrl: res.best.detailUrl,
        // extras you might want
        nameText: res.best.nameText || `${first} ${last}`,
        score: Number(res.best.score?.toFixed?.(3) || 0),
    };

    fs.writeFileSync(path.resolve(outPath), JSON.stringify(best, null, 2), 'utf8');
    console.log('Wrote artifact:', outPath);
})();
