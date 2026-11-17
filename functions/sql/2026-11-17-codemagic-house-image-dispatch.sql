-- One Codemagic build per queued resident/location revision.
-- Apply after 2026-11-17-lookaround-house-jobs.sql.
ALTER TABLE hoa_lookaround_house_jobs
    ADD COLUMN IF NOT EXISTS codemagic_dispatched_at timestamptz,
    ADD COLUMN IF NOT EXISTS codemagic_build_id text;

-- Re-enqueueing a changed residence is a new build opportunity.
CREATE OR REPLACE FUNCTION hoa_enqueue_lookaround_house(p_resident_id bigint)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE changed integer;
BEGIN
    INSERT INTO hoa_lookaround_house_jobs
        (resident_id, expected_address, latitude, longitude, status)
    SELECT id, address, latitude, longitude, 'queued'
    FROM hoa_residents
    WHERE id = p_resident_id
      AND NULLIF(BTRIM(address), '') IS NOT NULL
      AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
      AND house_image_url IS NULL
    ON CONFLICT (resident_id) DO UPDATE SET
        expected_address = EXCLUDED.expected_address,
        latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
        status = 'queued', attempts = 0, available_at = NOW(),
        lease_token = NULL, lease_expires_at = NULL, updated_at = NOW(),
        codemagic_dispatched_at = NULL, codemagic_build_id = NULL
    WHERE hoa_lookaround_house_jobs.status NOT IN ('queued', 'running')
       OR (hoa_lookaround_house_jobs.expected_address, hoa_lookaround_house_jobs.latitude,
           hoa_lookaround_house_jobs.longitude)
          IS DISTINCT FROM (EXCLUDED.expected_address, EXCLUDED.latitude, EXCLUDED.longitude);
    GET DIAGNOSTICS changed = ROW_COUNT;
    RETURN changed > 0;
END;
$$;
