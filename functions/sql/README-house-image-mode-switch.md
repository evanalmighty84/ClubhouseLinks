# House-image modes: OFF / TEST / LICENSED

The new **server-side** switch is `HOUSE_IMAGE_PIPELINE_MODE` on Heroku.
Valid values: `off` (default), `test`, `licensed`.

| Mode | Behavior | Requirements |
| --- | --- | --- |
| `off` | No automatic Codemagic dispatch; debug workflow only probes queue | None |
| `test` | API-triggered Codemagic Mac compiles Swift and generates an **obviously synthetic** PNG without Apple Maps. Uploads it to Cloudinary; Heroku's leased save records `house_image_source = 'test_placeholder'` | Explicit `HOUSE_IMAGE_TEST_RESIDENT_ID`, shared worker secret, Cloudinary |
| `licensed` | Same Perplexity architecture, but native Apple Look Around snapshot replaces synthetic image | **Express written Apple rights** for permanent Cloudinary storage and redistribution, plus both authorization flags |

**Do not activate licensed mode without expressly granted imagery rights.**
Resident consent to provide an address does not grant rights to store
and redistribute Apple Maps images to other devices/platforms.

## 1. Deploy this code

The backend repository contains:
- `functions/services/houseImageMode.js` — authoritative mode switch
- `functions/services/lookaroundHouseImages.js` — authenticated leased claim/report/save
- `functions/services/codemagicHouseImageDispatch.js` — sends pilot ID and mode in Codemagic API build request
- `functions/lookaround-worker.cjs` — runs synthetic generator or licensed capture
- `functions/generateHouseTestImage.swift` — writes a visibly synthetic PNG (no MapKit)
- `functions/macOSLookAroundSnapshot.swift` — native Apple MapKit snapshot (licensed mode only)
- `codemagic.yaml` — compiles both tools; selects off/test/licensed

Ensure prior SQL migrations (jobs and dispatch) are already applied.
**This feature adds no new required database columns.**

## 2. Configure Codemagic

Application: backend `ClubhouseLinks`, workflow `house-image-macos-debug`.
In the encrypted `house_image_worker` variable group:
- `HOUSE_IMAGE_WRITE_KEY`: same secret as Heroku
- `CLOUDINARY_URL`: Cloudinary API secret URL, available on Heroku if already configured

The build API supplies `HOUSE_IMAGE_PIPELINE_MODE` and
`LOOKAROUND_RESIDENT_ID`; do not store a hardcoded mode in the group.

On Heroku:
- `HOUSE_IMAGE_CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CODEMAGIC_API_TOKEN`, `CODEMAGIC_HOUSE_IMAGE_APP_ID`: already configured
- `CODEMAGIC_HOUSE_IMAGE_DISPATCH_ENABLED=yes`: separately enables automatic API dispatch
- `HOUSE_IMAGE_PIPELINE_MODE`: off/test/licensed
- `HOUSE_IMAGE_TEST_RESIDENT_ID`: ID of the ONLY real resident test mode may modify (e.g. `960`)

## 3. Set OFF (safe default)

```bash
heroku config:set HOUSE_IMAGE_PIPELINE_MODE=off --app crm-function-app-5d4de511071d
```

This prevents new builds from being started by signup/address updates.
Already-running Codemagic builds will be refused by Heroku's claim/save
endpoints after the mode changes.

## 4. Set TEST (pilot only)

```bash
heroku config:set HOUSE_IMAGE_TEST_RESIDENT_ID=960 HOUSE_IMAGE_PIPELINE_MODE=test --app crm-function-app-5d4de511071d
```

**Test mode writes a real synthetic Cloudinary image to resident 960's
house-image fields.** It is labeled `test_placeholder`; Android also
displays a clear TEST IMAGE caption. Never mistake it for the resident's
actual home. Normal residents are blocked from test-mode processing.

If resident 960 has no photo and is already queued, clear only the old
dispatch reservation before triggering a new Codemagic build:

```sql
UPDATE hoa_lookaround_house_jobs
SET codemagic_dispatched_at = NULL,
    codemagic_build_id = NULL
WHERE resident_id = 960 AND status = 'queued';
```

Then trigger a build using the existing protected endpoint:

```bash
export HOUSE_IMAGE_WRITE_KEY="$(heroku config:get HOUSE_IMAGE_WRITE_KEY --app crm-function-app-5d4de511071d)"
curl -sS -X POST \
  "https://crm-function-app-5d4de511071d.herokuapp.com/server/resident_function/api/residents/internal/house-image-jobs/960/dispatch-codemagic" \
  -H "Content-Type: application/json" \
  -H "X-House-Image-Write-Key: $HOUSE_IMAGE_WRITE_KEY" \
  -d '{}'
```

Expected worker log: `House image (test): saved`. Query:

```sql
SELECT r.id, r.house_image_source, r.house_image_url,
       j.status, j.attempts, j.codemagic_build_id
FROM hoa_residents r
LEFT JOIN hoa_lookaround_house_jobs j ON j.resident_id = r.id
WHERE r.id = 960;
```

Expected: source `test_placeholder`, job status `saved`,
1 attempt, and a Cloudinary URL. A synthetic test image is persisted
in the live profile for pilot ID 960 **only**.

**Cleanup after the pilot:** use the existing protected house-image PUT
with `{"image_url": null}` for resident 960 to clear the synthetic
photo. Clear only your test assets in Cloudinary as appropriate; clearing
the database URL does not automatically delete the Cloudinary asset.

## 5. Set LICENSED (only after explicit authorization)

```bash
heroku config:set HOUSE_IMAGE_PIPELINE_MODE=licensed HOUSE_IMAGE_LICENSED_CAPTURE_AUTHORIZED=yes --app crm-function-app-5d4de511071d
```

The Codemagic `house_image_worker` group must additionally set both
`LOOKAROUND_PERSISTENT_STORAGE_AUTHORIZED=yes` and
`HOUSE_IMAGE_LICENSED_CAPTURE_AUTHORIZED=yes`, **only after the required
express written permission**. The worker will refuse a licensed capture
without both. Do not publish or distribute Apple Look Around screenshots
via Cloudinary without that permission.

If a resident has a synthetic test image, manually clear it with the
authenticated PUT and requeue only that resident before attempting a
licensed capture.

## Diagnostics

```bash
node --test functions/tests/houseImageMode.test.cjs
```

The tests mock cloud capture, Cloudinary upload, claim/save responses,
no-coverage, retry, and mode mismatch; they never access a real resident.

Because Codemagic builds are finite, each API-triggered build processes
**one** queue job and exits. The chosen pilot ID is injected by Heroku;
the API token and Cloudinary credentials stay in encrypted settings.
