-- Run once against the Clubhouse Links production PostgreSQL database.
-- This does not run automatically when pushed to GitHub.
-- Residents using this code are already auto-approved by signupResident.
BEGIN;

DO $$
DECLARE
    existing_id BIGINT;
    existing_neighborhood_id BIGINT;
    target_name TEXT;
BEGIN
    SELECT name INTO target_name FROM hoa_neighborhoods WHERE id = 68;
    IF target_name IS NULL OR target_name !~* 'cottonwood[[:space:]]+creek' THEN
        RAISE EXCEPTION 'Neighborhood 68 does not match Cottonwood Creek: %', target_name;
    END IF;

    SELECT id, neighborhood_id INTO existing_id, existing_neighborhood_id
      FROM hoa_invite_codes
     WHERE UPPER(BTRIM(code)) = 'COTTONWOODCREEK'
     ORDER BY id LIMIT 1;

    IF existing_id IS NOT NULL AND existing_neighborhood_id IS DISTINCT FROM 68 THEN
        RAISE EXCEPTION 'COTTONWOODCREEK is already assigned to neighborhood %', existing_neighborhood_id;
    END IF;

    IF existing_id IS NOT NULL THEN
        UPDATE hoa_invite_codes
           SET code = 'COTTONWOODCREEK',
               code_type = 'resident',
               active = TRUE,
               grants_board_access = FALSE
         WHERE id = existing_id;
    ELSE
        INSERT INTO hoa_invite_codes
            (code, neighborhood_id, code_type, active, grants_board_access)
        VALUES
            ('COTTONWOODCREEK', 68, 'resident', TRUE, FALSE);
    END IF;
END $$;

-- Verify the community association and invite-code relationship.
SELECT ic.id, ic.code, ic.code_type, ic.active, ic.grants_board_access,
       ic.neighborhood_id, n.name AS neighborhood_name
  FROM hoa_invite_codes ic
  JOIN hoa_neighborhoods n ON n.id = ic.neighborhood_id
 WHERE UPPER(BTRIM(ic.code)) = 'COTTONWOODCREEK';

COMMIT;
