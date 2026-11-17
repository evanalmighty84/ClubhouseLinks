# Shared house-image field for Clubhouse Links iOS and Android

The Heroku resident controller already uses Apple Maps Server API to geocode
addresses; it does **not** return Look Around image bytes. Apple's Look Around
imagery should not be copied to a permanent Cloudinary/Postgres cache or
republished across Android without a separate valid license.

This change stores *resident-owned or independently licensed* house-image URLs.

## Before deployment

1. Run `functions/sql/2026-11-17-resident-house-image.sql` on Railway PostgreSQL.
2. Set a long random secret `HOUSE_IMAGE_WRITE_KEY` on the Heroku app. This
   is a private server-to-server/admin secret; do not embed it in mobile apps.
3. Deploy the latest `ClubhouseLinks` main branch to Heroku.
4. Upload a photo for which Clubhouse Links has display/reuse rights to the
   existing Cloudinary account; use its HTTPS `res.cloudinary.com` URL.

## Save an authorized image for an account

The route is mounted under the existing residents router:

`PUT /server/resident_function/api/residents/profile/:residentId/house-image`

Headers:
`X-House-Image-Write-Key: <the Heroku secret>`
`Content-Type: application/json`

Example JSON body:

```json
{"image_url":"https://res.cloudinary.com/YOUR-CLOUD/image/upload/YOUR-ASSET.jpg","source":"resident_upload"}
```

Allowed source values are `resident_upload` and `licensed_provider`.
A JSON `{"image_url":null}` removes an old image.

The controller saves:
`house_image_url`, `house_image_source`,
`house_image_address`, and `house_image_updated_at` to `hoa_residents`.
The existing `GET /residents/profile/:residentId` selects `r.*` and
therefore automatically includes these fields.

Android Account Settings now displays `house_image_url` via Coil only when
`house_image_address` matches the current resident address. If the URL is
missing, stale, or cannot be loaded, it displays the generic home placeholder.
The iOS Account Settings screen continues to render a live, native MapKit
Look Around view independently of the saved photo. The existing address-update
controller clears the saved house-image fields when the address changes.
Both the address and its `latitude` / `longitude` remain stored in the
existing `hoa_residents` columns; address updates geocode via Apple Maps.
The image-save endpoint does not itself obtain an image from street imagery
providers. It records a licensed Cloudinary image URL after upload.

## Quick database verification

```sql
SELECT id, first_name, last_name,
       house_image_url, house_image_source,
       house_image_address, house_image_updated_at
FROM hoa_residents
WHERE id = 961;
```

Do not automatically store Apple Look Around screenshots or snapshots into
`house_image_url`. Do not expose the write key in source control or an APK/IPA.
