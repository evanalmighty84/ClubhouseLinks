-- Job-queue infrastructure only. It does not grant storage or
-- redistribution rights for Apple Look Around imagery.
-- No backfill; do not enable a snapshot worker absent express Apple permission.
BEGIN;

CREATE TABLE IF NOT EXISTS hoa_lookaround_house_jobs (
    resident_id bigint PRIMARY KEY REFERENCES hoa_residents(id) ON DELETE CASCADE,
    expected_address text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    status text NOT NULL CHECK (status IN (
        'queued', 'running', 'saved', 'no_coverage', 'failed'
    )),
    attempts integer NOT NULL DEFAULT 0,
    available_at timestamptz NOT NULL DEFAULT NOW(),
    lease_token uuid,
    lease_expires_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hoa_lookaround_house_jobs_claim_idx
    ON hoa_lookaround_house_jobs (available_at, resident_id)
    WHERE status IN ('queued', 'running');

CREATE OR REPLACE FUNCTION hoa_enqueue_lookaround_house(p_resident_id bigint)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
    changed integer;
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
        lease_token = NULL, lease_expires_at = NULL, updated_at = NOW()
    WHERE hoa_lookaround_house_jobs.status NOT IN ('queued', 'running')
       OR (hoa_lookaround_house_jobs.expected_address, hoa_lookaround_house_jobs.latitude,
           hoa_lookaround_house_jobs.longitude)
          IS DISTINCT FROM (EXCLUDED.expected_address, EXCLUDED.latitude, EXCLUDED.longitude);
    GET DIAGNOSTICS changed = ROW_COUNT;
    RETURN changed > 0;
END;
$$;

CREATE OR REPLACE FUNCTION hoa_clear_house_image_on_move()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF BTRIM(COALESCE(OLD.address, '')) IS DISTINCT FROM BTRIM(COALESCE(NEW.address, '')) THEN
        NEW.house_image_url := NULL;
        NEW.house_image_source := NULL;
        NEW.house_image_address := NULL;
        NEW.house_image_updated_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION hoa_queue_house_image_on_location()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.address, OLD.latitude, OLD.longitude)
            IS NOT DISTINCT FROM (NEW.address, NEW.latitude, NEW.longitude) THEN
            RETURN NEW;
        END IF;
        DELETE FROM hoa_lookaround_house_jobs WHERE resident_id = NEW.id;
        IF BTRIM(COALESCE(OLD.address, '')) IS DISTINCT FROM BTRIM(COALESCE(NEW.address, ''))
           AND (OLD.latitude, OLD.longitude)
               IS NOT DISTINCT FROM (NEW.latitude, NEW.longitude) THEN
            RETURN NEW;
        END IF;
    END IF;
    PERFORM hoa_enqueue_lookaround_house(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hoa_clear_house_image_on_move ON hoa_residents;
CREATE TRIGGER hoa_clear_house_image_on_move
    BEFORE UPDATE OF address ON hoa_residents FOR EACH ROW
    EXECUTE FUNCTION hoa_clear_house_image_on_move();

DROP TRIGGER IF EXISTS hoa_queue_house_image_on_location ON hoa_residents;
CREATE TRIGGER hoa_queue_house_image_on_location
    AFTER INSERT OR UPDATE OF address, latitude, longitude ON hoa_residents FOR EACH ROW
    EXECUTE FUNCTION hoa_queue_house_image_on_location();

COMMIT;
