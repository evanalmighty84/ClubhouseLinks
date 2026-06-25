const pool = require("./db/db");

(async () => {
  try {
    const result = await pool.query(
      `
      SELECT
        a.id AS from_resident_id,
        a.first_name AS from_name,
        b.id AS to_resident_id,
        b.first_name AS to_name,
        ROUND(
          (
            3959 * acos(
              LEAST(
                1,
                GREATEST(
                  -1,
                  cos(radians(a.latitude::numeric)) *
                  cos(radians(b.latitude::numeric)) *
                  cos(radians(b.longitude::numeric) - radians(a.longitude::numeric)) +
                  sin(radians(a.latitude::numeric)) *
                  sin(radians(b.latitude::numeric))
                )
              )
            )
          )::numeric,
          4
        ) AS distance_miles
      FROM hoa_residents a
      JOIN hoa_residents b ON b.id = 103
      WHERE a.id = 102;
      `
    );

    console.log("DISTANCE:");
    console.log(result.rows);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
