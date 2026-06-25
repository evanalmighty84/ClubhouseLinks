const pool = require("./db/db");

(async () => {
  try {
    const result = await pool.query(
      "UPDATE hoa_residents SET latitude = $1, longitude = $2, updated_at = NOW() WHERE id = $3 RETURNING id, first_name, last_name, address, latitude, longitude",
      [33.0550433, -96.7263628, 103]
    );

    console.log("UPDATED JULIE:");
    console.log(result.rows);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
