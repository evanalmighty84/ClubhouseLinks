# Resident house-image queue (Mac worker)

This implements the **job orchestration** from the supplied Perplexity guide:
Heroku queues work, a Mac worker claims a job with a time-limited lease,
and the protected existing house-image PUT saves the returned Cloudinary URL
only while the resident's address and coordinates still match the job.

## Important Apple imagery licensing limitation

**Do not enable automated Apple Look Around capture/storage by default.**
Apple's Developer Program License Agreement, Attachment 6 section 2.5,
generally restricts caching/storing Apple Maps data except temporarily for
the permitted Maps service use **unless expressly permitted in writing by Apple**.
Resident consent to use an address is not equivalent to Apple image rights.

The worker therefore checks `LOOKAROUND_PERSISTENT_STORAGE_AUTHORIZED=yes`
before it can make a capture. Set this **only if Apple has expressly authorized
your intended long-term Cloudinary storage, distribution, and Android display**.
Without that permission, use the existing `PUT /profile/:residentId/house-image`
with independently licensed Cloudinary imagery instead.

## Integration changes committed

- `functions/sql/2026-11-17-lookaround-house-jobs.sql`: job table,
  enqueue helper, address-change clear trigger, and automatic queue trigger
- `functions/services/lookaroundHouseImages.js`: claim/report/save handlers
- `functions/routes/residentRoutes.js`: routes under resident router
- `functions/controllers/residentController.js`: replacement handler wiring
- `functions/lookaround-worker.cjs`: Mac-side capture/upload worker (guarded)

The new routes are:

- `POST /server/resident_function/api/residents/internal/house-image-jobs/claim`
- `POST /server/resident_function/api/residents/internal/house-image-jobs/:residentId/report`
- existing `PUT /server/resident_function/api/residents/profile/:residentId/house-image`

All require the existing `X-House-Image-Write-Key` value. Never embed the key
in iOS/Android builds. Claim/report and leased saves require
`HOUSE_IMAGE_LOOKAROUND_ENABLED=yes` on Heroku (default: disabled).

## Rollout checklist (do not run until rights are confirmed)

1. Apply the SQL file to the intended Railway Postgres database. SQL does
   **not** backfill existing resident records.
2. Deploy the current backend to Heroku.
3. Keep `HOUSE_IMAGE_LOOKAROUND_ENABLED` unset until authorized and ready to
   pilot. Set `HOUSE_IMAGE_CLOUDINARY_CLOUD_NAME` to your actual Cloudinary
   cloud name only when configuring a licensed worker. Existing
   `HOUSE_IMAGE_WRITE_KEY` remains private.
4. The worker requires a native macOS snapshot binary (`LOOKAROUND_SNAPSHOT_BIN`).
   **That Swift source/binary was referenced but was not supplied in the uploaded
   materials**, so this repository does not include a compiled snapshot tool.
5. For a lawful, approved test, manually enqueue exactly one target
   resident in SQL:

   ```sql
   SELECT hoa_enqueue_lookaround_house(960);
   ```

   This returns true only for residents with valid address and coordinates
   and without an existing saved house image. Do not enqueue real residents
   unless this is the intended test.
6. On Mac, with secrets loaded from a secure local store and the correct
   snapshot executable, set the router base, `LOOKAROUND_SNAPSHOT_BIN`,
   and the rights gate. Then one-shot:

   ```bash
   LOOKAROUND_RESIDENT_ID=960 node functions/lookaround-worker.cjs --once
   ```

7. Verify the job and resident record in PostgreSQL:

   ```sql
   SELECT r.id, j.status, r.house_image_url IS NOT NULL AS has_image,
          r.house_image_source, r.house_image_address = r.address AS address_matches
   FROM hoa_residents r
   LEFT JOIN hoa_lookaround_house_jobs j ON j.resident_id = r.id
   WHERE r.id = 960;
   ```

Do not run the continuously polling worker until the one-resident test was
reviewed and the photograph visually matches the property. The nearest
Look Around scene can point in the wrong direction.

## Operational notes

- Retry limit: 4, with a 5-minute lease and staggered retry scheduling.
- Automatic location trigger queues *newly eligible* records only; no backfill.
- Changing an address clears the stored house-image URL and invalidates the
  old job; a stale capture cannot overwrite a resident's current location.
- Photo assets previously uploaded to Cloudinary are **not** automatically
  deleted on a move. Plan a separate retention/deletion workflow.
- If the worker encounters an ambiguous save failure, an orphaned image may
  remain in Cloudinary and need manual reconciliation.
- Standard Cloudinary URLs are publicly accessible; do not assume residents'
  house imagery is private merely because it is shown inside account settings.
