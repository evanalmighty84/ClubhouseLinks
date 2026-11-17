-- Reusable house photos must be resident-owned or independently licensed.
-- Never persist Apple Look Around snapshot pixels or URLs here.
-- Run this migration once in the Clubhouse Links Railway PostgreSQL database.
ALTER TABLE hoa_residents
    ADD COLUMN IF NOT EXISTS house_image_url TEXT,
    ADD COLUMN IF NOT EXISTS house_image_source TEXT,
    ADD COLUMN IF NOT EXISTS house_image_address TEXT,
    ADD COLUMN IF NOT EXISTS house_image_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN hoa_residents.house_image_url IS
    'Publicly displayable, independently licensed house image URL; not Apple Maps/Look Around content.';
COMMENT ON COLUMN hoa_residents.house_image_source IS
    'resident_upload or licensed_provider; never apple_look_around.';
COMMENT ON COLUMN hoa_residents.house_image_address IS
    'Address to which the licensed house image applies, to avoid displaying old house after a move.';
