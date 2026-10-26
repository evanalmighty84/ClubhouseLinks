-- Clubhouse Links: attach original Nextdoor timestamps to vendor requests.
-- Run on the SAME PostgreSQL database that holds all three tables.
-- Matching requires hoa_service_requests.source to identify the originating scraper.
-- Unknown/ambiguous source values are deliberately left unchanged.

BEGIN;

CREATE OR REPLACE FUNCTION public.populate_hoa_request_nextdoor_post_date()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    lead_id bigint;
    source_name text := lower(coalesce(NEW.source::text, ''));
    source_table text;
    matched_post_at timestamptz;
    matched_posted_text text;
BEGIN
    IF NEW.original_post_at IS NOT NULL
       OR NEW.source_lead_id IS NULL
       OR NEW.source_lead_id::text !~ '^[0-9]+$'
    THEN
        RETURN NEW;
    END IF;

    lead_id := NEW.source_lead_id::bigint;

    IF source_name IN ('general_contracting', 'unfiltered_general_contracting') THEN
        source_table := 'public.unfiltered_general_contracting';
    ELSIF source_name IN ('combined', 'unfiltered_combined',
                         'unfiltered_ins_mold_pest_housecl_plumb_paint_land_lawn_handy') THEN
        source_table := 'public.unfiltered_ins_mold_pest_housecl_plumb_paint_land_lawn_handy';
    ELSE
        RETURN NEW;
    END IF;

    EXECUTE format('SELECT original_post_at, posted_at_text FROM %s WHERE id = $1', source_table)
       INTO matched_post_at, matched_posted_text USING lead_id;

    NEW.original_post_at := COALESCE(NEW.original_post_at, matched_post_at);
    NEW.posted_at_text := COALESCE(NEW.posted_at_text, matched_posted_text);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hoa_request_nextdoor_post_date
    ON public.hoa_service_requests;
CREATE TRIGGER trg_hoa_request_nextdoor_post_date
    BEFORE INSERT OR UPDATE OF source, source_lead_id
    ON public.hoa_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.populate_hoa_request_nextdoor_post_date();

-- Existing requests: use the same mapping without changing unrelated data.
UPDATE public.hoa_service_requests
SET source_lead_id = source_lead_id
WHERE original_post_at IS NULL
  AND source_lead_id IS NOT NULL
  AND source_lead_id::text ~ '^[0-9]+$'
  AND lower(coalesce(source::text, '')) IN (
      'general_contracting', 'unfiltered_general_contracting',
      'combined', 'unfiltered_combined',
      'unfiltered_ins_mold_pest_housecl_plumb_paint_land_lawn_handy'
  );

COMMIT;

-- Review source names if some requests remain unmapped:
SELECT source, count(*) AS requests,
       count(original_post_at) AS with_original_post_date
FROM public.hoa_service_requests
GROUP BY source ORDER BY requests DESC;
