-- HOA announcements: one published record feeds the public website and resident apps.
-- Run this against Clubhouse Links' PostgreSQL database. Entire script is idempotent.
BEGIN;

CREATE TABLE IF NOT EXISTS public.hoa_announcements (
    id BIGSERIAL PRIMARY KEY,
    neighborhood_id INTEGER NOT NULL REFERENCES public.hoa_neighborhoods(id),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    url TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (neighborhood_id, slug)
);

CREATE INDEX IF NOT EXISTS hoa_announcements_published_feed_idx
    ON public.hoa_announcements (neighborhood_id, published_at DESC, id DESC)
    WHERE status = 'published';

INSERT INTO public.hoa_announcements
    (neighborhood_id, slug, title, body, image_url, url, status, published_at)
SELECT
    68,
    'clubhouse-links-community-launch',
    'Cottonwood Creek, Your Neighborhood Is Now Connected!',
    'Meet Clubhouse Links, your neighborhood community platform!

NEIGHBOR TO NEIGHBOR
Get to know and connect with your Cottonwood Creek neighbors through the neighborhood directory.

WHO MY NEIGHBORS ARE USING
Find service providers your neighbors have used and see real neighborhood projects.

SHOW OFF YOUR WORK
Upload finished home improvements and photos to help others discover great work.

STAY IN THE KNOW
Keep up with community news and upcoming activities, from game nights and cigar nights to wine nights and other get-togethers as they are announced.

SCAN THE QR CODE
Find the Clubhouse Links download links for your phone. Available on iPhone now; Google Play coming soon!',
    'https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=20&data=https%3A%2F%2Fevanalmighty84.github.io%2FCottonwoodCreekCommunity%2F%23app',
    'https://evanalmighty84.github.io/CottonwoodCreekCommunity/#app',
    'published',
    NOW()
WHERE EXISTS (
    SELECT 1 FROM public.hoa_neighborhoods
    WHERE id = 68 AND LOWER(BTRIM(name)) = 'cottonwood creek'
)
ON CONFLICT (neighborhood_id, slug)
DO UPDATE SET
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    image_url = EXCLUDED.image_url,
    url = EXCLUDED.url,
    status = 'published',
    published_at = COALESCE(public.hoa_announcements.published_at, NOW()),
    updated_at = NOW();

SELECT id, neighborhood_id, slug, title, status, published_at, image_url
FROM public.hoa_announcements
WHERE neighborhood_id = 68 AND slug = 'clubhouse-links-community-launch';

-- Review above then run COMMIT; in the same session.
-- COMMIT;
-- ROLLBACK;
