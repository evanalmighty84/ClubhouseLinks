'use strict';

// Public read-only content for the Cottonwood Creek Community Association
// GitHub Pages site. Never expose resident records, private announcements,
// unpublished event drafts, device tokens, or vendor contact information.
const pool = require('../db/db');

// Cottonwood Creek Community Association uses hoa_neighborhoods.id = 68.
// Match both the verified ID and canonical neighborhood name to prevent
// accidentally exposing another neighborhood's public records.
const COTTONWOOD_NEIGHBORHOOD_ID = 68;
const COTTONWOOD_DB_NAME = 'cottonwood creek';

const APP_DOWNLOAD_URL = 'https://evanalmighty84.github.io/CottonwoodCreekCommunity/#app';
const QR_IMAGE_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=20&data='
    + encodeURIComponent(APP_DOWNLOAD_URL);

// Official launch update shared by the public website and both resident apps.
// Keep this in one place so all three surfaces display the same announcement.
const APP_LAUNCH_ANNOUNCEMENT = Object.freeze({
    id: 680001,
    neighborhood_id: COTTONWOOD_NEIGHBORHOOD_ID,
    title: 'Cottonwood Creek, Your Neighborhood Is Now Connected!',
    body: 'Meet Clubhouse Links — your new community platform!\n\n'
        + 'NEIGHBOR TO NEIGHBOR: Explore the neighborhood directory and connect with the people who make Cottonwood Creek home.\n\n'
        + 'WHO MY NEIGHBORS ARE USING: Discover local service providers recommended through neighbors\' real projects.\n\n'
        + 'SHOW OFF YOUR WORK: Share completed home improvements and photos so others can see the results.\n\n'
        + 'STAY IN THE KNOW: Follow community news, upcoming get-togethers, game nights, cigar nights, wine nights, and other neighborhood activities as they are announced.\n\n'
        + 'SCAN THE QR CODE to find the app download links. Available on iPhone; Google Play coming soon!',
    image_url: QR_IMAGE_URL,
    url: APP_DOWNLOAD_URL,
    published_at: '2026-11-18T22:00:00.000Z'
});

function combinedAnnouncements(neighborhoodId, existing) {
    const items = existing.map(item => ({
        ...item,
        body: item.body || item.description || '',
        description: item.description || item.body || ''
    }));
    if (neighborhoodId === COTTONWOOD_NEIGHBORHOOD_ID) {
        return [{
            ...APP_LAUNCH_ANNOUNCEMENT,
            description: APP_LAUNCH_ANNOUNCEMENT.body
        }, ...items.filter(item => Number(item.id) !== APP_LAUNCH_ANNOUNCEMENT.id)];
    }
    return items;
}


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
        const [storedAnnouncements, events, vendors] = await Promise.all([
            announcementFeed(n.id),
            pool.query(
                `SELECT title, description, address, starts_at, ends_at,
                        image_url, published_at
                 FROM hoa_events
                 WHERE neighborhood_id=$1 AND status='published'
                 ORDER BY starts_at DESC LIMIT 30`, [n.id]
            ),
            pool.query(
                `SELECT v.company_name AS title, v.category,
                        v.description, v.logo_url, v.website AS url
                 FROM hoa_vendors v
                 WHERE v.active = TRUE
                   AND (
                     v.neighborhood_id = $1
                     OR EXISTS (
                       SELECT 1 FROM hoa_community_vendors cv
                       WHERE cv.vendor_id = v.id
                         AND cv.neighborhood_id = $1
                         AND cv.active = TRUE
                     )
                   )
                 ORDER BY v.company_name LIMIT 60`, [n.id]
            )
        ]);
        res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
        return res.json({
            neighborhood: { name: n.name, city: n.city, state: n.state },
            announcements: combinedAnnouncements(n.id, storedAnnouncements),
            events: events.rows,
            vendors: vendors.rows
        });
    } catch (err) {
        console.error('Cottonwood public content query failed:', err?.code || err?.message);
        return res.status(500).json({ error: 'Community feed temporarily unavailable' });
    }
};

exports.getResidentAnnouncements = async (req, res) => {
    try {
        const residentId = Number(req.params.residentId);
        if (!Number.isSafeInteger(residentId) || residentId < 1) {
            return res.status(400).json({ error: 'Invalid resident ID' });
        }
        const { rows } = await pool.query(
            'SELECT neighborhood_id FROM hoa_residents WHERE id = $1 LIMIT 1',
            [residentId]
        );
        if (!rows.length) {
            return res.status(404).json({ error: 'Resident not found' });
        }
        const neighborhoodId = rows[0].neighborhood_id;
        if (!neighborhoodId) {
            return res.json({ success: true, announcements: [] });
        }
        const announcements = await announcementFeed(neighborhoodId);
        res.set('Cache-Control', 'private, no-store');
        return res.json({
            success: true,
            announcements: combinedAnnouncements(neighborhoodId, announcements)
        });
    } catch (err) {
        console.error('Resident announcements query failed:', err?.code || err?.message);
        return res.status(500).json({ error: 'Unable to load announcements' });
    }
};
