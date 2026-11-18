-- Cottonwood Creek (68): concise launch card and an invitation to host
-- game nights, wine nights, and other neighborhood gatherings.
--
-- This is a planning announcement, NOT a scheduled hoa_events entry:
-- hoa_events requires starts_at and no event date has been provided.
--
-- Apply directly in the Clubhouse Links PostgreSQL editor.
BEGIN;

UPDATE public.hoa_announcements
SET
    body = E'SCAN THE QR CODE\nDownload Clubhouse Links on iPhone and start exploring your community.',
    updated_at = NOW()
WHERE neighborhood_id = 68
  AND slug = 'clubhouse-links-community-launch';

INSERT INTO public.hoa_announcements (
    neighborhood_id,
    slug,
    title,
    body,
    image_url,
    url,
    status,
    published_at
)
SELECT
    68,
    'cottonwood-creek-community-gatherings',
    'Bring Game Nights, Wine Nights & More to Cottonwood Creek!',
    E'Let\'s bring more neighbors together! Have an idea for a game night, wine night, cigar night, or another get-together? Clubhouse Links makes it easy to stay informed about neighborhood activities as they are announced. Share your ideas and help make the next Cottonwood Creek gathering happen.\n\nNo date is scheduled yet — watch for upcoming community announcements.',
    'https://res.cloudinary.com/drna15e8q/image/upload/v1795045274/winenight2_r5ojmi.jpg',
    'https://apps.apple.com/us/app/clubhouse-links/id6790003233',
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
    updated_at = NOW();

SELECT id, slug, title, status, image_url, body
FROM public.hoa_announcements
WHERE neighborhood_id = 68
  AND slug IN (
    'clubhouse-links-community-launch',
    'cottonwood-creek-community-gatherings'
  )
ORDER BY id;

COMMIT;
