# Heroku → Codemagic macOS house-image debug workflow

This is a **non-capturing** integration test for the Perplexity job architecture.
The first Codemagic workflow compiles the provided Swift MapKit command and
probes Heroku's queued jobs; it **does not** capture, upload, or save Apple
Look Around imagery. Resident signup and address changes are never blocked by
a failing Codemagic start request.

## 1. Apply SQL in Railway PostgreSQL

First apply `functions/sql/2026-11-17-lookaround-house-jobs.sql` if it has
not already been applied. Then apply
`functions/sql/2026-11-17-codemagic-house-image-dispatch.sql`.
The latter adds `codemagic_dispatched_at` and `codemagic_build_id` to the
job table and ensures re-queued location revisions can be dispatched again.
Neither migration backfills all existing residents.

## 2. Add a Codemagic app

Connect the **ClubhouseLinks backend GitHub repository** as a Codemagic app
configured via `codemagic.yaml`. Do not use the separate Android app ID
or iOS app ID unless that Codemagic app's repository actually contains this
backend YAML, Swift source, and Node worker.

- App ID: read from `https://codemagic.io/app/<APP_ID>/settings`.
- Workflow ID: `house-image-macos-debug`
- Git branch: `main`
- Mac machine: `mac_mini_m2`
- Secret environment group: `house_image_worker`

In Codemagic, set an **encrypted** `HOUSE_IMAGE_WRITE_KEY` in
`house_image_worker`. Its value must equal the existing value in the
corresponding Heroku app. Never put the key in YAML or the API trigger body.
The YAML specifies the existing Heroku API base.

## 3. Configure Heroku

Set the following config variables on `crm-function-app-5d4de511071d`:
- `CODEMAGIC_API_TOKEN`: Codemagic account API token, private
- `CODEMAGIC_HOUSE_IMAGE_APP_ID`: backend repository Codemagic app ID
- `CODEMAGIC_HOUSE_IMAGE_BRANCH`: `main` (optional)
- `CODEMAGIC_HOUSE_IMAGE_DISPATCH_ENABLED`: `yes` to start builds for eligible
  signup/address changes; leave unset until the one-resident pilot
- `HOUSE_IMAGE_WRITE_KEY`: existing shared private worker secret

**Leave `HOUSE_IMAGE_LOOKAROUND_ENABLED` disabled** and do not set
`LOOKAROUND_PERSISTENT_STORAGE_AUTHORIZED` for this first test. These are
not needed for the non-capturing probe.

Deploy the latest ClubhouseLinks backend code to Heroku before probing.

## 4. Dry-run a single existing resident job

For pilot resident 960, check eligibility:

```sql
SELECT id, address, latitude, longitude, house_image_url
FROM hoa_residents WHERE id = 960;
```

Only if the coordinates and address are valid, manually queue just that ID:

```sql
SELECT hoa_enqueue_lookaround_house(960);
```

When the Heroku dispatch flag is enabled, you can trigger **one** build
using the protected API:

```bash
export HOUSE_IMAGE_WRITE_KEY="$(heroku config:get HOUSE_IMAGE_WRITE_KEY --app crm-function-app-5d4de511071d)"
curl -sS -X POST \
  "https://crm-function-app-5d4de511071d.herokuapp.com/server/resident_function/api/residents/internal/house-image-jobs/960/dispatch-codemagic" \
  -H "Content-Type: application/json" \
  -H "X-House-Image-Write-Key: $HOUSE_IMAGE_WRITE_KEY" \
  -d '{}'
```

Expected response for a new eligible dispatch:
`{"status":"started","build_id":"..."}`.

The build on Codemagic should compile Swift and print:
`Codemagic macOS + Heroku dry-run OK; queued jobs: 1`.
No image is captured or saved.

Verify in Railway:

```sql
SELECT resident_id, status, codemagic_dispatched_at, codemagic_build_id
FROM hoa_lookaround_house_jobs WHERE resident_id = 960;
```

The queue remains **queued** because the probe deliberately does not claim
or finish the job. If you need to rerun the same debug build after reviewing
it, explicitly reset only the test job's dispatch reservation:

```sql
UPDATE hoa_lookaround_house_jobs
SET codemagic_dispatched_at = NULL, codemagic_build_id = NULL
WHERE resident_id = 960 AND status = 'queued';
```

## Behavior and guardrails

- API starts builds through `POST https://api.codemagic.io/builds`.
  It passes only resident ID as `LOOKAROUND_RESIDENT_ID`; no address or
  credentials appear in Codemagic API parameters.
- A dispatch reservation prevents duplicate Mac builds for the same queued
  resident/location. Definite Codemagic HTTP rejections release the reservation.
  Ambiguous timeouts intentionally hold it to avoid duplicate paid builds.
- Signup/address handlers request dispatch only when
  `CODEMAGIC_HOUSE_IMAGE_DISPATCH_ENABLED=yes`.
- The public account profile does not expose worker secrets.
- This workflow does not grant rights to cache and rehost Apple Maps imagery.
  Apple Developer Program membership or address consent does not by itself
  authorize permanent Look Around image storage and Android redistribution.
  The separately guarded capture/upload worker remains off pending permission
  or replacement with independently licensed source photography.
