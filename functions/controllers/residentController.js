
const pool = require('../db/db');
const jwt = require("jsonwebtoken");

const DEFAULT_GENERATED_AREA_RADIUS_MILES = 0.35;

const twilio = require("twilio");

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

function normalizeUSPhoneToE164(value) {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length === 10) {
        return `+1${digits}`;
    }

    if (digits.length === 11 && digits.startsWith("1")) {
        return `+${digits}`;
    }

    if (String(value || "").trim().startsWith("+") && digits.length >= 10) {
        return `+${digits}`;
    }

    return null;
}

/**
 * POST /api/residents/send-verification
 *
 * Body:
 * {
 *   "phone": "2145489175"
 * }
 */


/**
 * POST /api/residents/check-verification
 *
 * Body:
 * {
 *   "phone": "2145489175",
 *   "code": "123456"
 * }
 */


exports.sendPhoneVerification = async (req, res)=> {
    try {
        if (!verifyServiceSid) {
            console.error("TWILIO_VERIFY_SERVICE_SID is not configured.");

            return res.status(500).json({
                success: false,
                error: "Phone verification is not configured."
            });
        }

        const phone = normalizeUSPhoneToE164(req.body?.phone);

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: "Please enter a valid mobile phone number."
            });
        }

        const verification = await twilioClient.verify.v2
            .services(verifyServiceSid)
            .verifications.create({
                to: phone,
                channel: "sms"
            });

        return res.status(200).json({
            success: true,
            status: verification.status,
            phone
        });
    } catch (error) {
        console.error("SEND PHONE VERIFICATION ERROR:", error);

        return res.status(500).json({
            success: false,
            error:
                error?.message ||
                "We could not send the verification code."
        });
    }

}

exports.checkPhoneVerification = async (req, res)=> {
    try {
        if (!verifyServiceSid) {
            console.error("TWILIO_VERIFY_SERVICE_SID is not configured.");

            return res.status(500).json({
                success: false,
                error: "Phone verification is not configured."
            });
        }

        const phone = normalizeUSPhoneToE164(req.body?.phone);
        const code = String(req.body?.code || "").trim();

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: "Please enter a valid mobile phone number."
            });
        }

        if (!/^\d{4,10}$/.test(code)) {
            return res.status(400).json({
                success: false,
                error: "Please enter the verification code from your text."
            });
        }

        const verificationCheck = await twilioClient.verify.v2
            .services(verifyServiceSid)
            .verificationChecks.create({
                to: phone,
                code
            });

        if (verificationCheck.status !== "approved") {
            return res.status(400).json({
                success: false,
                verified: false,
                error: "That verification code is incorrect or expired."
            });
        }

        return res.status(200).json({
            success: true,
            verified: true,
            phone
        });
    } catch (error) {
        console.error("CHECK PHONE VERIFICATION ERROR:", error);

        return res.status(500).json({
            success: false,
            verified: false,
            error:
                error?.message ||
                "We could not verify that code."
        });
    }
}

function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
}

function getDisplayAreaFromAddressFallback(address) {
    if (!address) return null;

    const cleanAddress = String(address).toLowerCase();

    const knownCities = [
        "Plano",
        "Dallas",
        "Grand Prairie",
        "Richardson",
        "Allen",
        "McKinney",
        "Frisco",
        "Garland",
        "Wylie",
        "Princeton",
        "Lucas",
        "Roswell"
    ];

    const matchedCity = knownCities.find(city =>
        cleanAddress.includes(city.toLowerCase())
    );

    if (matchedCity) {
        if (matchedCity === "Roswell") {
            return "Roswell, GA";
        }

        return `${matchedCity}, TX`;
    }

    return null;
}
let cachedSignedAppleMapsJwt = null;
let cachedSignedAppleMapsJwtExpiresAt = 0;

let cachedAppleMapsAccessToken = null;
let cachedAppleMapsAccessTokenExpiresAt = 0;

function getSignedAppleMapsJwt() {
    const now = Math.floor(Date.now() / 1000);

    if (cachedSignedAppleMapsJwt && cachedSignedAppleMapsJwtExpiresAt > now + 60) {
        return cachedSignedAppleMapsJwt;
    }

    const keyId = process.env.APPLE_MAPS_KEY_ID;
    const teamId = process.env.APPLE_TEAM_ID;
    const privateKeyRaw = process.env.APPLE_MAPS_PRIVATE_KEY;

    if (!keyId || !teamId || !privateKeyRaw) {
        throw new Error("Missing Apple Maps environment variables.");
    }

    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

    const expiresInSeconds = 60 * 60;

    const token = jwt.sign(
        {},
        privateKey,
        {
            algorithm: "ES256",
            issuer: teamId,
            expiresIn: expiresInSeconds,
            keyid: keyId,
            header: {
                typ: "JWT",
                kid: keyId
            }
        }
    );

    cachedSignedAppleMapsJwt = token;
    cachedSignedAppleMapsJwtExpiresAt = now + expiresInSeconds;

    return token;
}

async function getAppleMapsAccessToken() {
    const now = Math.floor(Date.now() / 1000);

    if (cachedAppleMapsAccessToken && cachedAppleMapsAccessTokenExpiresAt > now + 60) {
        return cachedAppleMapsAccessToken;
    }

    const signedJwt = getSignedAppleMapsJwt();

    const response = await fetch("https://maps-api.apple.com/v1/token", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${signedJwt}`
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Apple Maps token failed: ${errorText}`);
    }

    const data = await response.json();

    cachedAppleMapsAccessToken = data.accessToken;
    cachedAppleMapsAccessTokenExpiresAt = now + (data.expiresInSeconds || 1800);

    return cachedAppleMapsAccessToken;
}


function normalizeStateForDisplay(state) {
    if (!state) return null;

    const clean = String(state).trim();

    const stateMap = {
        Texas: "TX",
        TX: "TX",
        Georgia: "GA",
        GA: "GA"
    };

    return stateMap[clean] || clean;
}

function buildDisplayAreaName(city, state) {
    const cleanCity = city ? String(city).trim() : null;
    const cleanState = normalizeStateForDisplay(state);

    if (cleanCity && cleanState) {
        return `${cleanCity}, ${cleanState}`;
    }

    if (cleanCity) {
        return cleanCity;
    }

    if (cleanState) {
        return cleanState;
    }

    return null;
}

async function geocodeAddressWithAppleMaps(address) {
    if (!address || !String(address).trim()) {
        return null;
    }

    const accessToken = await getAppleMapsAccessToken();

    const url =
        "https://maps-api.apple.com/v1/geocode" +
        `?q=${encodeURIComponent(address)}` +
        `&lang=en-US`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Apple Maps geocode failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    const firstResult = data?.results?.[0];

    if (!firstResult) {
        return null;
    }

    const structuredAddress = firstResult?.structuredAddress || {};

    const latitude =
        firstResult?.coordinate?.latitude ??
        firstResult?.center?.latitude ??
        firstResult?.displayMapRegion?.center?.latitude ??
        null;

    const longitude =
        firstResult?.coordinate?.longitude ??
        firstResult?.center?.longitude ??
        firstResult?.displayMapRegion?.center?.longitude ??
        null;

    const city =
        structuredAddress?.locality ||
        structuredAddress?.subLocality ||
        structuredAddress?.dependentLocality ||
        firstResult?.locality ||
        firstResult?.subLocality ||
        firstResult?.city ||
        null;

    const state =
        normalizeStateForDisplay(
            structuredAddress?.administrativeAreaCode ||
            structuredAddress?.administrativeArea ||
            firstResult?.administrativeAreaCode ||
            firstResult?.administrativeArea ||
            firstResult?.state ||
            null
        );

    const formattedAddress =
        firstResult?.formattedAddressLines?.join(", ") ||
        firstResult?.name ||
        address;

    const displayAreaName = buildDisplayAreaName(city, state);

    return {
        lat: latitude !== null ? Number(latitude) : null,
        lng: longitude !== null ? Number(longitude) : null,
        latitude: latitude !== null ? Number(latitude) : null,
        longitude: longitude !== null ? Number(longitude) : null,
        city,
        state,
        display_area_name: displayAreaName,
        formattedAddress,
        raw: firstResult
    };
}

function pointInPolygon(pointLng, pointLat, polygon) {
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = Number(polygon[i][0]);
        const yi = Number(polygon[i][1]);
        const xj = Number(polygon[j][0]);
        const yj = Number(polygon[j][1]);

        const intersects =
            yi > pointLat !== yj > pointLat &&
            pointLng < ((xj - xi) * (pointLat - yi)) / (yj - yi) + xi;

        if (intersects) inside = !inside;
    }

    return inside;
}

function createCirclePolygon({ lat, lng, radiusMiles, points = 32 }) {
    const earthRadiusMiles = 3958.8;
    const coords = [];

    const latRad = lat * Math.PI / 180;
    const lngRad = lng * Math.PI / 180;
    const angularDistance = radiusMiles / earthRadiusMiles;

    for (let i = 0; i <= points; i++) {
        const bearing = 2 * Math.PI * (i / points);

        const pointLatRad = Math.asin(
            Math.sin(latRad) * Math.cos(angularDistance) +
            Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
        );

        const pointLngRad =
            lngRad +
            Math.atan2(
                Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
                Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pointLatRad)
            );

        coords.push([
            Number((pointLngRad * 180 / Math.PI).toFixed(7)),
            Number((pointLatRad * 180 / Math.PI).toFixed(7))
        ]);
    }

    return coords;
}

async function findExistingGeneratedArea(lat, lng) {
    const result = await pool.query(`
        SELECT
            id,
            area_name,
            city,
            state,
            center_lat,
            center_lng,
            radius_miles,
            polygon
        FROM hoa_generated_areas
        WHERE active = TRUE
        ORDER BY created_at DESC
    `);

    for (const area of result.rows) {
        let polygon = area.polygon;

        if (typeof polygon === "string") {
            try {
                polygon = JSON.parse(polygon);
            } catch {
                polygon = null;
            }
        }

        if (Array.isArray(polygon) && pointInPolygon(lng, lat, polygon)) {
            return area;
        }
    }

    return null;
}

function chooseGeneratedAreaName(geo) {
    if (geo?.city) {
        return `${geo.city} Area`;
    }

    return "Local Customer Area";
}

async function createGeneratedArea(geo, sourceAddress) {
    const areaName = chooseGeneratedAreaName(geo);

    const polygon = createCirclePolygon({
        lat: geo.lat,
        lng: geo.lng,
        radiusMiles: DEFAULT_GENERATED_AREA_RADIUS_MILES
    });

    const result = await pool.query(
        `
            INSERT INTO hoa_generated_areas
            (
                area_name,
                city,
                state,
                center_lat,
                center_lng,
                radius_miles,
                polygon,
                source,
                confidence,
                created_from_address
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)
            RETURNING *
        `,
        [
            areaName,
            geo.city || null,
            geo.state || null,
            geo.lat,
            geo.lng,
            DEFAULT_GENERATED_AREA_RADIUS_MILES,
            JSON.stringify(polygon),
            "auto_generated_signup",
            0.70,
            sourceAddress
        ]
    );

    return result.rows[0];
}

async function getOrCreateGeneratedAreaForAddress(address) {
    const geo = await geocodeAddressWithAppleMaps(address);

    if (!geo || geo.lat === null || geo.lng === null) {
        return {
            geo,
            generatedArea: null
        };
    }

    const existingArea = await findExistingGeneratedArea(geo.lat, geo.lng);

    if (existingArea) {
        return {
            geo,
            generatedArea: existingArea
        };
    }

    const createdArea = await createGeneratedArea(geo, address);

    return {
        geo,
        generatedArea: createdArea
    };
}

exports.signupResident = async (req, res) => {
    try {
        const { first_name, last_name, phone, address = null, invite_code } = req.body;
        const cleanPhone = normalizePhone(phone);

        if (!first_name || !last_name || !cleanPhone || !invite_code) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const inviteResult = await pool.query(
            `
                SELECT
                    ic.id,
                    ic.code,
                    ic.code_type,
                    ic.contractor_user_id,
                    ic.access_level,
                    ic.neighborhood_id,
                    n.name AS neighborhood_name
                FROM hoa_invite_codes ic
                         LEFT JOIN hoa_neighborhoods n
                                   ON n.id = ic.neighborhood_id
                WHERE UPPER(ic.code) = UPPER($1)
                  AND ic.active = TRUE
                    LIMIT 1
            `,
            [invite_code]
        );

        if (!inviteResult.rows.length) {
            return res.status(400).json({ error: "Invalid invite code" });
        }

        const invite = inviteResult.rows[0];

        const isResidentCode = invite.code_type === "resident";
        const isContractorCode = invite.code_type === "contractor_customer";

        if (!isResidentCode && !isContractorCode) {
            return res.status(400).json({
                error: "Unsupported invite code type."
            });
        }

        if (isResidentCode && !invite.neighborhood_id) {
            return res.status(400).json({
                error: "Resident invite code is not connected to a neighborhood."
            });
        }

        const neighborhoodId = invite.neighborhood_id || null;
        const approvalStatus = "approved";
        const accessLevel = isResidentCode
            ? "verified_neighborhood"
            : "contractor_customer";

        let latitude = null;
        let longitude = null;
        let generatedAreaId = null;
        let displayAreaName = null;

        // Only generate service areas for people who are NOT tied to an HOA.
        if (!neighborhoodId && address) {
            try {
                const { geo, generatedArea } = await getOrCreateGeneratedAreaForAddress(address);

                console.log("GENERATED AREA SIGNUP DEBUG:", {
                    address,
                    geo,
                    generatedArea
                });

                latitude = geo?.lat || null;
                longitude = geo?.lng || null;
                generatedAreaId = generatedArea?.id || null;

                displayAreaName =
                    generatedArea?.area_name ||
                    geo?.display_area_name ||
                    buildDisplayAreaName(geo?.city, geo?.state) ||
                    null;
             } catch (geoErr) {
            console.error("Generated area lookup failed:", geoErr);

            latitude = null;
            longitude = null;
            generatedAreaId = null;
            displayAreaName = getDisplayAreaFromAddressFallback(address);
        }
        }

        const residentResult = await pool.query(
            `
                INSERT INTO hoa_residents
                (
                    first_name,
                    last_name,
                    phone,
                    address,
                    neighborhood_id,
                    approval_status,
                    sms_verified,
                    approved_at,
                    access_level,
                    invite_code_used,
                    referred_by_contractor_id,
                    latitude,
                    longitude,
                    generated_area_id,
                    display_area_name
                )
                VALUES
                    (
                        $1, $2, $3, $4, $5, $6, TRUE,
                        CASE WHEN $6 = 'approved' THEN NOW() ELSE NULL END,
                        $7, $8, $9, $10, $11, $12, $13
                    )
                    ON CONFLICT (phone, neighborhood_id)
                DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                                           last_name = EXCLUDED.last_name,
                                           address = EXCLUDED.address,
                                           sms_verified = TRUE,
                                           approval_status = EXCLUDED.approval_status,
                                           approved_at = EXCLUDED.approved_at,
                                           access_level = EXCLUDED.access_level,
                                           invite_code_used = EXCLUDED.invite_code_used,
                                           referred_by_contractor_id = EXCLUDED.referred_by_contractor_id,
                                           latitude = EXCLUDED.latitude,
                                           longitude = EXCLUDED.longitude,
                                           generated_area_id = EXCLUDED.generated_area_id,
                                           display_area_name = EXCLUDED.display_area_name,
                                           updated_at = NOW()
                                           RETURNING *
            `,
            [
                first_name,
                last_name,
                cleanPhone,
                address,
                neighborhoodId,
                approvalStatus,
                accessLevel,
                invite.code,
                isContractorCode ? invite.contractor_user_id : null,
                latitude,
                longitude,
                generatedAreaId,
                displayAreaName
            ]
        );

        await pool.query(
            `
                UPDATE hoa_invite_codes
                SET used_count = COALESCE(used_count, 0) + 1
                WHERE id = $1
            `,
            [invite.id]
        );

        const resident = {
            ...residentResult.rows[0],
            neighborhood_name: invite.neighborhood_name || null
        };

        res.json({
            success: true,
            resident_id: resident.id,
            resident,
            message: isResidentCode
                ? "Resident profile created successfully."
                : "Customer profile created successfully."
        });
    } catch (err) {
        console.error("signupResident error:", err);
        res.status(500).json({ error: "Server error" });
    }
};

exports.getVendors = async (req, res) => {
    try {
        const { residentId } = req.params;

        const residentResult = await pool.query(
            `
            SELECT id, neighborhood_id, address, latitude, longitude
            FROM hoa_residents
            WHERE id = $1
            LIMIT 1
            `,
            [residentId]
        );

        if (!residentResult.rows.length) {
            return res.status(404).json({ error: "Resident not found" });
        }

        let resident = residentResult.rows[0];

        if ((!resident.latitude || !resident.longitude) && resident.address) {
            const coordinates = await geocodeAddressWithAppleMaps(resident.address);

            if (coordinates) {
                await pool.query(
                    `
                    UPDATE hoa_residents
                    SET
                        latitude = $1,
                        longitude = $2,
                        updated_at = NOW()
                    WHERE id = $3
                    `,
                    [coordinates.latitude, coordinates.longitude, resident.id]
                );

                resident = {
                    ...resident,
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude
                };
            }
        }



        const radiusMiles = 7;

        const vendorsResult = await pool.query(
            `
    WITH area_residents AS (
        SELECT
            r.id,
            r.first_name,
            r.address,
            r.neighborhood_id,
            r.latitude,
            r.longitude,

            CASE
                WHEN $2::numeric IS NOT NULL
                 AND $3::numeric IS NOT NULL
                 AND r.latitude IS NOT NULL
                 AND r.longitude IS NOT NULL
                THEN
                    3959 * acos(
                        LEAST(
                            1,
                            GREATEST(
                                -1,
                                cos(radians($2::numeric)) *
                                cos(radians(r.latitude::numeric)) *
                                cos(radians(r.longitude::numeric) - radians($3::numeric)) +
                                sin(radians($2::numeric)) *
                                sin(radians(r.latitude::numeric))
                            )
                        )
                    )
                ELSE NULL
            END AS distance_miles

        FROM hoa_residents r
        WHERE r.latitude IS NOT NULL
          AND r.longitude IS NOT NULL
          AND (
                (
                    $2::numeric IS NOT NULL
                    AND $3::numeric IS NOT NULL
                    AND (
                        3959 * acos(
                            LEAST(
                                1,
                                GREATEST(
                                    -1,
                                    cos(radians($2::numeric)) *
                                    cos(radians(r.latitude::numeric)) *
                                    cos(radians(r.longitude::numeric) - radians($3::numeric)) +
                                    sin(radians($2::numeric)) *
                                    sin(radians(r.latitude::numeric))
                                )
                            )
                        )
                    ) <= $4::numeric
                )
                OR
                (
                    $1::int IS NOT NULL
                    AND r.neighborhood_id = $1
                )
          )
    ),

    vendor_stats AS (
        SELECT
            v.id,
            v.neighborhood_id,
            v.company_name,
            v.category,
            v.contact_name,
            v.phone,
            v.email,
            v.website,
            v.description,
            v.logo_url,
            v.active,

            COALESCE(COUNT(ar.id), 0)::int AS signup_count,

            COALESCE(
                json_agg(
    json_build_object(
    'id', ar.id,
    'first_name', TRIM(ar.first_name),
    'address', ar.address,
    'distance_miles', ROUND(ar.distance_miles::numeric, 2),
    'finished_photo_url',
    CASE
    WHEN rc.finished_photo_url IS NOT NULL
    AND rc.photo_approval_status IN ('approved', 'pending_review')
    THEN rc.finished_photo_url
    ELSE NULL
    END,
    'photo_approval_status', rc.photo_approval_status
    )
                    ORDER BY
                        ar.distance_miles ASC NULLS LAST,
                        ar.id DESC
                ) FILTER (WHERE ar.id IS NOT NULL),
                '[]'
            ) AS signed_up_people

        FROM hoa_vendors v

        LEFT JOIN hoa_resident_contractors rc
            ON rc.vendor_id = v.id
           AND rc.category = v.category

        LEFT JOIN area_residents ar
            ON ar.id = rc.resident_id

        WHERE v.active = TRUE
          AND (
                $1::int IS NULL
                OR v.neighborhood_id = $1
                OR v.neighborhood_id IS NULL
          )

        GROUP BY
            v.id,
            v.neighborhood_id,
            v.company_name,
            v.category,
            v.contact_name,
            v.phone,
            v.email,
            v.website,
            v.description,
            v.logo_url,
            v.active
    )

    SELECT
        id,
        neighborhood_id,
        company_name,
        category,
        contact_name,
        phone,
        email,
        website,
        description,
        logo_url,
        active,
        signup_count,
        signed_up_people

    FROM vendor_stats

    ORDER BY
        signup_count DESC,
        category ASC,
        id ASC
    `,
            [
                resident.neighborhood_id || null,
                resident.latitude || null,
                resident.longitude || null,
                radiusMiles
            ]

        );

        res.json({
            success: true,
            vendors: vendorsResult.rows
        });
    } catch (err) {
        console.error("getVendors error:", err);
        res.status(500).json({ error: "Failed to load vendors" });
    }
};

exports.validateInviteCode = async (req, res) => {
    try {
        const { invite_code } = req.body;

        const { rows } = await pool.query(
            `
      SELECT ic.id, ic.code, n.id AS neighborhood_id, n.name AS neighborhood_name
      FROM hoa_invite_codes ic
      JOIN hoa_neighborhoods n ON n.id = ic.neighborhood_id
      WHERE UPPER(ic.code) = UPPER($1)
        AND ic.active = TRUE
      LIMIT 1
      `,
            [invite_code]
        );

        if (!rows.length) {
            return res.status(400).json({ valid: false, error: 'Invalid invite code' });
        }

        res.json({ valid: true, invite: rows[0] });
    } catch (err) {
        console.error('validateInviteCode error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.loginResident = async (req, res) => {
    try {
        const { phone } = req.body;

        const { rows } = await pool.query(
            `
            SELECT
                r.*,
                n.name AS neighborhood_name
            FROM hoa_residents r
            JOIN hoa_neighborhoods n
                ON n.id = r.neighborhood_id
            WHERE r.phone = $1
            LIMIT 1
            `,
            [phone]
        );

        if (!rows.length) {
            return res.status(404).json({
                error: 'Resident not found'
            });
        }

        res.json({
            success: true,
            resident: rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Server error'
        });
    }
};

exports.verifyResidentSms = async (req, res) => {
    try {
        const { resident_id, code } = req.body;

        const { rows } = await pool.query(
            `
      SELECT *
      FROM hoa_sms_verifications
      WHERE resident_id = $1
        AND code = $2
        AND used = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      `,
            [resident_id, code]
        );

        if (!rows.length) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        await pool.query(
            `UPDATE hoa_sms_verifications SET used = TRUE WHERE id = $1`,
            [rows[0].id]
        );

        await pool.query(
            `UPDATE hoa_residents SET sms_verified = TRUE, updated_at = NOW() WHERE id = $1`,
            [resident_id]
        );

        res.json({
            success: true,
            message: 'Phone verified. Resident is pending HOA approval.'
        });
    } catch (err) {
        console.error('verifyResidentSms error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getPendingResidents = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `
      SELECT r.*, n.name AS neighborhood_name
      FROM hoa_residents r
      JOIN hoa_neighborhoods n ON n.id = r.neighborhood_id
      WHERE r.approval_status = 'pending'
      ORDER BY r.created_at DESC
      `
        );

        res.json(rows);
    } catch (err) {
        console.error('getPendingResidents error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.approveResident = async (req, res) => {
    try {
        const { residentId } = req.params;

        const { rows } = await pool.query(
            `
      UPDATE hoa_residents
      SET approval_status = 'approved',
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
            [residentId]
        );

        res.json({ success: true, resident: rows[0] });
    } catch (err) {
        console.error('approveResident error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getResidentProfile = async (req, res) => {
    try {
        const { residentId } = req.params;

        const { rows } = await pool.query(
            `
                SELECT
                    r.*,
                    n.name AS neighborhood_name,
                    n.city AS neighborhood_city,
                    n.state AS neighborhood_state
                FROM hoa_residents r
                         JOIN hoa_neighborhoods n
                              ON n.id = r.neighborhood_id
                WHERE r.id = $1
                    LIMIT 1
            `,
            [residentId]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Resident not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('getResidentProfile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getCompletedProjects = async (req, res) => {
    try {
        const { residentId } = req.params;

        const result = await pool.query(
            `
            SELECT
                rc.id,
                rc.resident_id,
                rc.vendor_id,
                v.company_name AS vendor_name,
                rc.category AS service,
                rc.finished_photo_url AS image_url,
                rc.photo_approval_status AS approval_status,
                rc.moderation_status,
                rc.photo_submitted_at,
                rc.photo_approved_at,
                rc.photo_rejected_at,
                rc.photo_rejection_reason
            FROM hoa_resident_contractors rc
            JOIN hoa_vendors v
                ON v.id = rc.vendor_id
            WHERE rc.resident_id = $1
              AND rc.finished_photo_url IS NOT NULL
            ORDER BY rc.updated_at DESC
            `,
            [residentId]
        );

        res.json({
            success: true,
            projects: result.rows
        });
    } catch (err) {
        console.error("getCompletedProjects error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load completed projects."
        });
    }
};

exports.getAddress = async (req, res) => {
    try {
        const { address, city = "Plano", state = "TX" } = req.body;

        if (!address) {
            return res.status(400).json({
                success: false,
                error: "Address is required",
            });
        }

        const normalizedAddress = address.toLowerCase().trim();
        const normalizedCity = city.toLowerCase().trim();
        const normalizedState = state.toLowerCase().trim();

        const result = await pool.query(
            `
            SELECT
                ns.neighborhood_id,
                n.name AS neighborhood_name,
                ns.invite_code,
                ns.street_name,
                ns.city,
                ns.state
            FROM hoa_neighborhood_streets ns
            JOIN hoa_neighborhoods n
              ON n.id = ns.neighborhood_id
            WHERE ns.active = TRUE
              AND LOWER($1) LIKE '%' || LOWER(ns.street_name) || '%'
              AND LOWER(ns.city) = LOWER($2)
              AND LOWER(ns.state) = LOWER($3)
            ORDER BY LENGTH(ns.street_name) DESC
            LIMIT 1
            `,
            [normalizedAddress, normalizedCity, normalizedState]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "We could not match this address to a supported neighborhood yet.",
            });
        }

        return res.json({
            success: true,
            match: result.rows[0],
        });
    } catch (err) {
        console.error("Address lookup error:", err);
        return res.status(500).json({
            success: false,
            error: "Server error looking up address.",
        });
    }
};

exports.getAddressAutoComplete = async (req, res) => {
    try {
        const {
            q,
            city = "Plano",
            state = "TX"
        } = req.body;

        if (!q || q.trim().length < 2) {
            return res.json({
                success: true,
                suggestions: []
            });
        }

        const result = await pool.query(
            `
            SELECT DISTINCT
                ns.street_name,
                ns.city,
                ns.state,
                ns.invite_code,
                ns.neighborhood_id,
                n.name AS neighborhood_name
            FROM hoa_neighborhood_streets ns
            JOIN hoa_neighborhoods n
                ON n.id = ns.neighborhood_id
            WHERE ns.active = TRUE
              AND ns.city ILIKE $2
              AND ns.state ILIKE $3
              AND ns.street_name ILIKE $1
            ORDER BY ns.street_name ASC
            LIMIT 10
            `,
            [
                `%${q.trim()}%`,
                city,
                state
            ]
        );

        return res.json({
            success: true,
            suggestions: result.rows
        });
    } catch (err) {
        console.error("Address autocomplete error:", err);

        return res.status(500).json({
            success: false,
            error: "Could not fetch address suggestions."
        });
    }
};

