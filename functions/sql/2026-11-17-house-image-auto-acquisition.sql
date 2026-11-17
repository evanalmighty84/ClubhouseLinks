-- Consent and provenance for automated, persistently licensed house imagery.
-- Run on the existing Railway PostgreSQL database before deploying code.
ALTER TABLE hoa_residents
  ADD COLUMN IF NOT EXISTS house_image_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS house_image_provider TEXT,
  ADD COLUMN IF NOT EXISTS house_image_attribution TEXT;
COMMENT ON COLUMN hoa_residents.house_image_consent IS
  'Optional informed opt-in to look up a licensed exterior image from a third-party provider.';
COMMENT ON COLUMN hoa_residents.house_image_provider IS
  'Third-party provider that granted storage and redistribution rights.';
COMMENT ON COLUMN hoa_residents.house_image_attribution IS
  'Attribution text required by imagery source. Display alongside the image.';
