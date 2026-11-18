'use strict';

// Public read-only content for the Cottonwood Creek Community Association
// GitHub Pages site. Never expose resident records, private announcements,
// unpublished event drafts, device tokens, or vendor contact information.
const pool = require('../db/db');

// Confirmed from hoa_neighborhoods in the user's database on 2026-11-18.
// The association website is branded Cottonwood Creek; the existing row is
// "Cottonwood Park". Bind the ID AND name to avoid returning another HOA's data
// if records are ever renumbered. Do not rename the row in this read-only feed.
const COTTONWOOD_NEIGHBORHOOD_ID = 68;
const COTTONWOOD_DB_NAME = 'cottonwood park';

async function announcementFeed(neighborhoodId) {
    // Database deployments may use a different announcement table name.
    // Never publish unknown rows without a positive published flag.
    for (const table of ['hoa_announcements', 'hoa_neighborhood_announcements']) {
        const { rows: [found] } = await pool.query(
            `SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = $1
            ) AS present`, [table]
        );
        if (!found.present) continue;
        const { rows } = await pool.query(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema='public' AND table_name=$1`, [table]);
        const cols = new Set(rows.map(r => r.column_name));
        const communityCol = ['neighborhood_id', 'hoa_neighborhood_id']
            .find(k => cols.has(k));
        const published = cols.has('status') ? "LOWER(a.status::text) = 'published'"
            : cols.has('is_published') ? 'a.is_published = TRUE'
            : cols.has('published') ? 'a.published = TRUE'
            : null;
        if (!communityCol || !published) continue;
        // The two table names and community columns above are fixed whitelists.
        const result = await pool.query(
            `SELECT
                COALESCE(to_jsonb(a)->>'title', to_jsonb(a)->>'headline', 'Community update') AS title,
                COALESCE(to_jsonb(a)->>'description', to_jsonb(a)->>'body',
                         to_jsonb(a)->>'message', '') AS description,
                COALESCE(to_jsonb(a)->>'published_at', to_jsonb(a)->>'created_at') AS published_at,
                to_jsonb(a)->>'image_url' AS image_url
             FROM public.${table} a
             WHERE a.${communityCol} = $1 AND ${published}
             ORDER BY COALESCE(to_jsonb(a)->>'published_at',
                               to_jsonb(a)->>'created_at', '') DESC
             LIMIT 8`, [neighborhoodId]);
        return result.rows;
    }
    return [];
}

exports.getCottonwoodCreekPublicContent = async (req, res) => {
    try {
        const community = await pool.query(
            `SELECT id, name, city, state
             FROM hoa_neighborhoods
             WHERE id = $1 AND LOWER(BTRIM(name)) = $2
             LIMIT 1`,
            [COTTONWOOD_NEIGHBORHOOD_ID, COTTONWOOD_DB_NAME]);
        if (community.rows.length !== 1) {
            return res.status(404).json({
                error: 'Cottonwood Creek neighborhood mapping needs verification'
            });
        }
        const n = community.rows[0];
        const [announcements, events, vendors] = await Promise.all([
            announcementFeed(n.id),
            pool.query(
                `SELECT title, description, address, starts_at, ends_at,
                        image_url, published_at
                 FROM hoa_events
                 WHERE neighborhood_id=$1 AND status='published'
                 ORDER BY starts_at DESC LIMIT 30`, [n.id]
            ),
            pool.query(
                `SELECT company_name AS title, category,
                        description, logo_url, website AS url
                 FROM hoa_vendors
                 WHERE neighborhood_id=$1 AND active=TRUE
                 ORDER BY company_name LIMIT 60`, [n.id]
            )
        ]);
        res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
        return res.json({
            neighborhood: { name: n.name, city: n.city, state: n.state },
            announcements,
            events: events.rows,
            vendors: vendors.rows
        });
    } catch (err) {
        console.error('Cottonwood public content query failed:', err?.code || err?.message);
        return res.status(500).json({ error: 'Community feed temporarily unavailable' });
    }
};
