
const pool = require('../db/db');
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;

const PPLX_API_URL =
    process.env.PPLX_API_URL || 'https://api.perplexity.ai/chat/completions';
const PPLX_MODEL = process.env.PPLX_MODEL || 'sonar';

async function callPerplexity(messages) {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
        throw new Error(
            'PERPLEXITY_API_KEY is not set'
        );
    }

    if (
        !Array.isArray(messages) ||
        messages.length === 0
    ) {
        throw new Error(
            'Perplexity messages are required'
        );
    }

    /*
     * Prevent sending an empty message to Perplexity.
     *
     * A message can contain either:
     * 1. A nonempty string
     * 2. An array containing text and image_url objects
     */
    const validMessages = messages.filter((message) => {
        if (!message || !message.role) {
            return false;
        }

        if (typeof message.content === 'string') {
            return message.content.trim().length > 0;
        }

        if (Array.isArray(message.content)) {
            return message.content.some((item) => {
                if (!item) {
                    return false;
                }

                if (item.type === 'text') {
                    return Boolean(
                        String(item.text || '').trim()
                    );
                }

                if (item.type === 'image_url') {
                    return Boolean(
                        String(
                            item.image_url?.url || ''
                        ).trim()
                    );
                }

                return false;
            });
        }

        return false;
    });

    if (validMessages.length === 0) {
        throw new Error(
            'Perplexity message content was empty'
        );
    }

    console.log('Perplexity moderation request:', {
        model: PPLX_MODEL,
        messageCount: validMessages.length,
        messages: validMessages.map((message) => ({
            role: message.role,
            contentTypes:
                Array.isArray(message.content)
                    ? message.content.map(
                        (item) => item?.type
                    )
                    : ['text']
        }))
    });

    const resp = await fetch(PPLX_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            model: PPLX_MODEL,
            messages: validMessages,
            temperature: 0,
            max_tokens: 1200,
            return_citations: false,
        }),
    });

    if (!resp.ok) {
        const body = await resp
            .text()
            .catch(() => '');

        throw new Error(
            `Perplexity API ${resp.status}: ${body.slice(0, 500)}`
        );
    }

    const data = await resp.json();

    const content =
        data?.choices?.[0]?.message?.content;

    if (
        typeof content !== 'string' ||
        !content.trim()
    ) {
        throw new Error(
            'Perplexity API returned no content'
        );
    }

    return content.trim();
}

function extractJson(text) {
    const t = String(text || '')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```$/i, '')
        .trim();

    try {
        return JSON.parse(t);
    } catch {}

    const m = t.match(
        /\{[\s\S]*\}|\[[\s\S]*\]/
    );

    if (m) {
        try {
            return JSON.parse(m[0]);
        } catch {}
    }

    return null;
}

async function moderateProjectImage({
                                        service,
                                        imageUrl
                                    }) {
    const cleanService = String(
        service || ''
    ).trim();

    const cleanImageUrl = String(
        imageUrl || ''
    ).trim();

    if (!cleanImageUrl) {
        return {
            status: 'rejected',
            reason:
                'The submitted image was not available for moderation.'
        };
    }

    if (!/^https:\/\//i.test(cleanImageUrl)) {
        return {
            status: 'rejected',
            reason:
                'The submitted image did not have a valid secure image URL.'
        };
    }

    const prompt = `
Review this image submitted as proof of a completed home-service project.

Claimed service category:
${cleanService || 'Unknown home service'}

Approve the image only when all of the following are true:

1. The image appears to show a real home-service, property, repair, maintenance, construction, landscaping, painting, roofing, plumbing, electrical, pool-service, or remodeling project.
2. The image is reasonably related to the claimed service category.
3. The image does not contain nudity, sexual content, graphic violence, gore, hateful content, threatening content, illegal activity, or other offensive material.
4. The image is not primarily a screenshot, meme, advertisement, document, blank image, unrelated personal photo, or random image.
5. The image does not prominently expose sensitive personal information.

Return exactly one JSON object.

For an approved image:
{"status":"approved","reason":null}

For a rejected image:
{"status":"rejected","reason":"Brief explanation"}

Do not return Markdown, code fences, citations, or any text outside the JSON object.
    `.trim();

    const messages = [
        {
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: prompt
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: cleanImageUrl
                    }
                }
            ]
        }
    ];

    try {
        const responseText =
            await callPerplexity(messages);

        console.log(
            'Perplexity raw moderation response:',
            responseText
        );

        const parsed =
            extractJson(responseText);

        if (!parsed || typeof parsed !== 'object') {
            throw new Error(
                'Perplexity moderation response was not valid JSON'
            );
        }

        const status = String(
            parsed.status || ''
        )
            .trim()
            .toLowerCase();

        if (
            status !== 'approved' &&
            status !== 'rejected'
        ) {
            throw new Error(
                `Perplexity returned an invalid moderation status: ${
                    status || 'empty'
                }`
            );
        }

        if (status === 'approved') {
            return {
                status: 'approved',
                reason: null
            };
        }

        return {
            status: 'rejected',
            reason: String(
                parsed.reason ||
                'The image did not pass moderation.'
            ).trim()
        };
    } catch (err) {
        console.error(
            'moderateProjectImage error:',
            err
        );

        /*
         * Fail closed. The photo is rejected rather than
         * approved when the moderation API is unavailable.
         */
        return {
            status: 'rejected',
            reason:
                'The image could not be safely verified.'
        };
    }
}


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
        const {
            first_name,
            last_name,
            phone,
            address,
            invite_code
        } = req.body || {};

        const cleanFirstName = String(first_name || "").trim();
        const cleanLastName = String(last_name || "").trim();
        const cleanPhone = normalizePhone(phone);
        const cleanAddress = String(address || "").trim();
        const addressForDb = cleanAddress || null;

        const cleanInviteCode = String(invite_code || "")
            .trim()
            .toUpperCase();

        if (
            !cleanFirstName ||
            !cleanLastName ||
            !cleanPhone ||
            !cleanInviteCode
        ) {
            return res.status(400).json({
                success: false,
                error: "First name, last name, phone, and invite code are required."
            });
        }

        let invite = null;
        let isResidentCode = false;
        let isContractorCode = false;

        /*
         * Invite code is required.
         * Validate the invite code before creating or updating the resident profile.
         */
        const inviteResult = await pool.query(
            `
                SELECT
                    ic.id,
                    ic.code,
                    ic.code_type,
                    ic.neighborhood_id,
                    n.name AS neighborhood_name
                FROM hoa_invite_codes ic
                LEFT JOIN hoa_neighborhoods n
                    ON n.id = ic.neighborhood_id
                WHERE UPPER(ic.code) = $1
                  AND ic.active = TRUE
                LIMIT 1
            `,
            [cleanInviteCode]
        );

        if (!inviteResult.rows.length) {
            return res.status(400).json({
                success: false,
                error: "Invalid or inactive invite code."
            });
        }

        invite = inviteResult.rows[0];

        isResidentCode =
            invite.code_type === "resident";

        isContractorCode = [
            "contractor_customer",
            "vendor_customer"
        ].includes(invite.code_type);

        if (!isResidentCode && !isContractorCode) {
            return res.status(400).json({
                success: false,
                error: "Unsupported invite code type."
            });
        }

        if (
            isResidentCode &&
            !invite.neighborhood_id
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Resident invite code is not connected to a neighborhood."
            });
        }

        const neighborhoodId =
            invite?.neighborhood_id || null;

        const approvalStatus = "approved";

        const accessLevel = isResidentCode
            ? "verified_neighborhood"
            : isContractorCode
                ? "contractor_customer"
                : "resident";

        const inviteCodeUsed =
            invite?.code || null;

        const referredByContractorId = null;

        let latitude = null;
        let longitude = null;
        let generatedAreaId = null;
        let displayAreaName = null;

        /*
         * Address is optional.
         * Only create/generated area when the user supplied an address.
         */
        if (!neighborhoodId && cleanAddress) {
            try {
                const {
                    geo,
                    generatedArea
                } = await getOrCreateGeneratedAreaForAddress(
                    cleanAddress
                );

                console.log(
                    "GENERATED AREA SIGNUP DEBUG:",
                    {
                        address: cleanAddress,
                        geo,
                        generatedArea
                    }
                );

                latitude =
                    geo?.lat ?? null;

                longitude =
                    geo?.lng ?? null;

                generatedAreaId =
                    generatedArea?.id ?? null;

                displayAreaName =
                    generatedArea?.area_name ||
                    geo?.display_area_name ||
                    buildDisplayAreaName(
                        geo?.city,
                        geo?.state
                    ) ||
                    null;
            } catch (geoErr) {
                console.error(
                    "Generated area lookup failed:",
                    geoErr
                );

                latitude = null;
                longitude = null;
                generatedAreaId = null;

                displayAreaName =
                    getDisplayAreaFromAddressFallback(
                        cleanAddress
                    );
            }
        }

        const client = await pool.connect();

        let residentRow;
        let isNewResident = false;
        let shouldIncrementInvite = false;

        try {
            await client.query("BEGIN");

            const existingResult = await client.query(
                `
                    SELECT
                        id,
                        invite_code_used
                    FROM hoa_residents
                    WHERE phone = $1
                      AND neighborhood_id
                        IS NOT DISTINCT FROM $2
                        LIMIT 1
                        FOR UPDATE
                `,
                [
                    cleanPhone,
                    neighborhoodId
                ]
            );

            if (existingResult.rows.length) {
                const existingResident =
                    existingResult.rows[0];

                shouldIncrementInvite =
                    Boolean(invite) &&
                    existingResident.invite_code_used !==
                    inviteCodeUsed;

                const updateResult =
                    await client.query(
                        `
                            UPDATE hoa_residents
                            SET
                                first_name = $1,
                                last_name = $2,
                                address = $3,
                                approval_status = $4,
                                sms_verified = TRUE,
                                approved_at =
                                    CASE
                                        WHEN $4 = 'approved'
                                            THEN COALESCE(
                                                approved_at,
                                                NOW()
                                                 )
                                        ELSE approved_at
                                        END,
                                access_level = $5::text,
                                invite_code_used =
                                    COALESCE(
                                $6::text,
                                invite_code_used
                                ),
                                referred_by_contractor_id =
                                COALESCE(
                                $7::integer,
                                referred_by_contractor_id
                                ),
                                latitude = $8::numeric,
                                longitude = $9::numeric,
                                generated_area_id = $10::integer,
                                display_area_name = $11::text,
                                updated_at = NOW()
                            WHERE id = $12
                                RETURNING *
                        `,
                        [
                            cleanFirstName,
                            cleanLastName,
                            addressForDb,
                            approvalStatus,
                            accessLevel,
                            inviteCodeUsed,
                            referredByContractorId,
                            latitude,
                            longitude,
                            generatedAreaId,
                            displayAreaName,
                            existingResident.id
                        ]
                    );

                residentRow =
                    updateResult.rows[0];
            } else {
                isNewResident = true;

                shouldIncrementInvite =
                    Boolean(invite);

                const insertResult =
                    await client.query(
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
                                    $1,
                                    $2,
                                    $3,
                                    $4,
                                    $5,
                                    $6,
                                    TRUE,
                                    CASE
                                        WHEN $6 = 'approved'
                                            THEN NOW()
                                        ELSE NULL
                                        END,
                                    $7,
                                    $8,
                                    $9,
                                    $10,
                                    $11,
                                    $12,
                                    $13
                                )
                                RETURNING *
                        `,
                        [
                            cleanFirstName,
                            cleanLastName,
                            cleanPhone,
                            addressForDb,
                            neighborhoodId,
                            approvalStatus,
                            accessLevel,
                            inviteCodeUsed,
                            referredByContractorId,
                            latitude,
                            longitude,
                            generatedAreaId,
                            displayAreaName
                        ]
                    );

                residentRow =
                    insertResult.rows[0];
            }

            if (
                invite &&
                shouldIncrementInvite
            ) {
                await client.query(
                    `
                        UPDATE hoa_invite_codes
                        SET
                            used_count =
                                COALESCE(
                                        used_count,
                                        0
                                ) + 1
                        WHERE id = $1
                    `,
                    [invite.id]
                );
            }

            await client.query("COMMIT");
        } catch (transactionErr) {
            await client.query("ROLLBACK");
            throw transactionErr;
        } finally {
            client.release();
        }

        const resident = {
            ...residentRow,
            neighborhood_name:
                invite?.neighborhood_name || null
        };

        let message =
            isNewResident
                ? "Account created successfully."
                : "Account updated successfully.";

        if (isResidentCode) {
            message =
                isNewResident
                    ? "Resident profile created successfully."
                    : "Resident profile updated successfully.";
        } else if (isContractorCode) {
            message =
                isNewResident
                    ? "Customer profile created successfully."
                    : "Customer profile updated successfully.";
        }

        return res.status(200).json({
            success: true,
            resident_id: resident.id,
            resident,
            message
        });
    } catch (err) {
        console.error(
            "signupResident error:",
            err
        );

        return res.status(500).json({
            success: false,
            error: "Server error."
        });
    }
};

exports.updateResidentAddress = async (req, res) => {
    try {
        const residentId = Number(req.params.residentId);
        const cleanAddress = String(req.body?.address || "").trim();

        if (!residentId || Number.isNaN(residentId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid resident ID."
            });
        }

        if (!cleanAddress) {
            return res.status(400).json({
                success: false,
                error: "Address is required."
            });
        }

        let latitude = null;
        let longitude = null;
        let generatedAreaId = null;
        let displayAreaName = null;

        try {
            const {
                geo,
                generatedArea
            } = await getOrCreateGeneratedAreaForAddress(
                cleanAddress
            );

            latitude = geo?.lat ?? null;
            longitude = geo?.lng ?? null;
            generatedAreaId = generatedArea?.id ?? null;

            displayAreaName =
                generatedArea?.area_name ||
                geo?.display_area_name ||
                buildDisplayAreaName(
                    geo?.city,
                    geo?.state
                ) ||
                null;
        } catch (geoErr) {
            console.error(
                "updateResidentAddress generated area lookup failed:",
                geoErr
            );

            displayAreaName =
                getDisplayAreaFromAddressFallback(cleanAddress) ||
                null;
        }

        const result = await pool.query(
            `
                UPDATE hoa_residents
                SET
                    address = $1,
                    latitude = $2,
                    longitude = $3,
                    generated_area_id = $4,
                    display_area_name = $5,
                    updated_at = NOW()
                WHERE id = $6
                RETURNING *
            `,
            [
                cleanAddress,
                latitude,
                longitude,
                generatedAreaId,
                displayAreaName,
                residentId
            ]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                error: "Resident not found."
            });
        }

        return res.status(200).json({
            success: true,
            resident: result.rows[0],
            message: "Address updated successfully."
        });
    } catch (err) {
        console.error(
            "updateResidentAddress error:",
            err
        );

        return res.status(500).json({
            success: false,
            error: "Server error."
        });
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

exports.deleteResidentAccount = async (req, res) => {
    const client = await pool.connect();

    try {
        const residentId = Number(req.body.resident_id);

        if (!Number.isInteger(residentId) || residentId <= 0) {
            return res.status(400).json({
                error: "A valid resident ID is required."
            });
        }

        await client.query("BEGIN");

        // Delete dependent records here first if foreign keys require it.
        // Example:
        // await client.query(
        //     `DELETE FROM hoa_app_store_clicks WHERE resident_id = $1`,
        //     [residentId]
        // );

        const result = await client.query(
            `
                DELETE FROM hoa_residents
                WHERE id = $1
                RETURNING id
            `,
            [residentId]
        );

        if (!result.rows.length) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Resident account was not found."
            });
        }

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            deleted_resident_id: result.rows[0].id
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Delete resident account error:", error);

        return res.status(500).json({
            error: "The account could not be deleted."
        });
    } finally {
        client.release();
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


exports.submitCompletedProject = async (req, res) => {

    const defaultVendorLogoUrl =
        String(
            process.env.DEFAULT_VENDOR_LOGO_URL || ""
        ).trim() || null;
    let client = null;

    try {
        console.log(
            "NEW submitCompletedProject handler running"
        );

        console.log("Completed project payload:", {
            resident_id:
                req.body?.resident_id ??
                req.body?.residentId,
            vendor_id:
                req.body?.vendor_id ??
                req.body?.vendorId,
            vendor_name:
                req.body?.vendor_name ??
                req.body?.vendorName,
            vendor_phone:
                req.body?.vendor_phone ??
                req.body?.vendorPhone,
            category: req.body?.category,
            has_image_base64: Boolean(
                req.body?.image_base64
            ),
            image_base64_length:
                req.body?.image_base64?.length || 0,
            finished_photo_url:
                req.body?.finished_photo_url ??
                req.body?.finishedPhotoUrl ??
                null
        });

        const body = req.body || {};

        /*
         * Support both the Swift app's snake_case fields
         * and any older camelCase clients.
         */
        const residentId = Number(
            body.resident_id ??
            body.residentId
        );

        const requestedVendorId = Number(
            body.vendor_id ??
            body.vendorId
        );

        const cleanVendorName = String(
            body.vendor_name ??
            body.vendorName ??
            ""
        ).trim();

        const cleanVendorPhone = String(
            body.vendor_phone ??
            body.vendorPhone ??
            ""
        ).trim();

        const cleanVendorPhoneDigits =
            cleanVendorPhone.replace(/\D/g, "");

        const cleanCategory = String(
            body.category || ""
        ).trim();

        const cleanImageBase64 = String(
            body.image_base64 || ""
        ).trim();

        const suppliedFinishedPhotoUrl = String(
            body.finished_photo_url ??
            body.finishedPhotoUrl ??
            ""
        ).trim();

        const hasExistingVendorId =
            Number.isInteger(requestedVendorId) &&
            requestedVendorId > 0;

        const hasManualVendor =
            cleanVendorName.length > 0 &&
            cleanVendorPhoneDigits.length > 0;

        const hasValidResidentId =
            Number.isInteger(residentId) &&
            residentId > 0;

        const hasProjectImage =
            cleanImageBase64.length > 0 ||
            suppliedFinishedPhotoUrl.length > 0;

        console.log("Completed project validation:", {
            residentId,
            requestedVendorId,
            cleanVendorName,
            cleanVendorPhoneDigits,
            cleanCategory,
            hasExistingVendorId,
            hasManualVendor,
            hasProjectImage
        });

        if (
            !hasValidResidentId ||
            !cleanCategory ||
            !hasProjectImage ||
            (
                !hasExistingVendorId &&
                !hasManualVendor
            )
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "resident_id, category, an image, and either vendor_id or vendor name and phone are required."
            });
        }

        /*
         * Confirm that the resident exists before uploading
         * and moderating the image.
         */
        const residentResult = await pool.query(
            `
        SELECT
            id,
            neighborhood_id
        FROM hoa_residents
        WHERE id = $1
        LIMIT 1
    `,
            [residentId]
        );

        if (!residentResult.rows.length) {
            return res.status(404).json({
                success: false,
                error: "Resident not found."
            });
        }

        const resident = residentResult.rows[0];

        console.log("Completed project resident:", {
            residentId: resident.id,
            neighborhoodId: resident.neighborhood_id
        });


        /*
         * Upload the Base64 data URL to Cloudinary.
         *
         * Older clients may already provide a finished photo URL,
         * so this function supports that format as well.
         */
        let finishedPhotoUrl =
            suppliedFinishedPhotoUrl;

        let finishedPhotoPublicId = null;

        if (cleanImageBase64) {
            const uploadResult =
                await cloudinary.uploader.upload(
                    cleanImageBase64,
                    {
                        folder:
                            "clubhouse_completed_projects",
                        resource_type: "image"
                    }
                );

            finishedPhotoUrl =
                uploadResult.secure_url;

            finishedPhotoPublicId =
                uploadResult.public_id;
        }

        if (!finishedPhotoUrl) {
            return res.status(400).json({
                success: false,
                error:
                    "The completed project image could not be prepared."
            });
        }

        /*
         * Run the uploaded image through the existing
         * photo-moderation service.
         */
        const moderation =
            await moderateProjectImage({
                service: cleanCategory,
                imageUrl: finishedPhotoUrl
            });

        const moderationStatus = String(
            moderation?.status || ""
        )
            .trim()
            .toLowerCase();

        /*
         * Never trust an approval status supplied by the mobile
         * client. The server's moderation result controls whether
         * the image is approved or rejected.
         */
        const finalApprovalStatus =
            moderationStatus === "approved"
                ? "approved"
                : "rejected";

        const rejectionReason =
            finalApprovalStatus === "rejected"
                ? (
                    moderation?.reason ||
                    "The submitted image did not pass moderation."
                )
                : null;

        console.log("Completed project moderation:", {
            residentId,
            category: cleanCategory,
            moderationStatus,
            finalApprovalStatus,
            rejectionReason
        });

        client = await pool.connect();

        await client.query("BEGIN");

        let resolvedVendorId;
        let vendor;

        /*
         * Existing qualified vendor selected from the app.
         */
        if (hasExistingVendorId) {
            const vendorResult = await client.query(
                `
                    SELECT
                        id,
                        company_name,
                        category,
                        phone,
                        active
                    FROM hoa_vendors
                    WHERE id = $1
                      AND active = TRUE
                    LIMIT 1
                `,
                [requestedVendorId]
            );

            if (!vendorResult.rows.length) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    error:
                        "The selected qualified vendor was not found."
                });
            }

            vendor = vendorResult.rows[0];
            resolvedVendorId = vendor.id;
        } else {
            /*
             * Manually entered vendor.
             *
             * Look for an existing record with the same company
             * name and normalized phone number before inserting
             * another vendor.
             */
            const existingVendorResult =
                await client.query(
                    `
                        SELECT
                            id,
                            company_name,
                            category,
                            phone,
                            active
                        FROM hoa_vendors
                        WHERE LOWER(TRIM(company_name)) =
                              LOWER(TRIM($1))
                          AND REGEXP_REPLACE(
                                COALESCE(phone, ''),
                                '[^0-9]',
                                '',
                                'g'
                              ) = $2
                        ORDER BY
                            active DESC,
                            id ASC
                        LIMIT 1
                    `,
                    [
                        cleanVendorName,
                        cleanVendorPhoneDigits
                    ]
                );

            if (existingVendorResult.rows.length) {
                vendor =
                    existingVendorResult.rows[0];

                resolvedVendorId = vendor.id;
            } else {
                /*
                 * A manually submitted vendor is stored as inactive.
                 *
                 * This gives it a real vendor ID and connects it to
                 * the project, but it will not appear as a qualified
                 * vendor until you review and activate it.
                 */
                const createdVendorResult =
                    await client.query(
                        `
                            INSERT INTO hoa_vendors
                            (
                                neighborhood_id,
                                company_name,
                                category,
                                phone,
                                logo_url,
                                active
                            )
                            VALUES
                                (
                                    NULL,
                                    $1,
                                    $2,
                                    $3,
                                    $4,
                                    FALSE
                                )
                                RETURNING
                id,
                neighborhood_id,
                company_name,
                category,
                phone,
                logo_url,
                active
                        `,
                        [
                            cleanVendorName,
                            cleanCategory,
                            cleanVendorPhone,
                            defaultVendorLogoUrl
                        ]
                    );

                vendor =
                    createdVendorResult.rows[0];

                resolvedVendorId = vendor.id;
            }
        }

        /*
         * Save the completed project.
         *
         * The existing unique rule allows one project per
         * resident and category. A new submission for the same
         * category replaces the previous project information.
         */
        const result = await client.query(
            `
                INSERT INTO hoa_resident_contractors
                (
                    resident_id,
                    vendor_id,
                    category,
                    source,
                    finished_photo_url,
                    finished_photo_public_id,
                    photo_approval_status,
                    moderation_status,
                    photo_submitted_at,
                    photo_approved_at,
                    photo_rejected_at,
                    photo_rejection_reason,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    'resident_upload',
                    $4,
                    $5,
                    $6,
                    $7,
                    NOW(),
                    CASE
                        WHEN $6 = 'approved'
                        THEN NOW()
                        ELSE NULL
                    END,
                    CASE
                        WHEN $6 = 'rejected'
                        THEN NOW()
                        ELSE NULL
                    END,
                    CASE
                        WHEN $6 = 'rejected'
                        THEN $8
                        ELSE NULL
                    END,
                    NOW(),
                    NOW()
                )
                ON CONFLICT (resident_id, category)
                DO UPDATE SET
                    vendor_id =
                        EXCLUDED.vendor_id,
                    source =
                        'resident_upload',
                    finished_photo_url =
                        EXCLUDED.finished_photo_url,
                    finished_photo_public_id =
                        EXCLUDED.finished_photo_public_id,
                    photo_approval_status =
                        EXCLUDED.photo_approval_status,
                    moderation_status =
                        EXCLUDED.moderation_status,
                    photo_submitted_at =
                        NOW(),
                    photo_approved_at =
                        CASE
                            WHEN EXCLUDED.photo_approval_status =
                                 'approved'
                            THEN NOW()
                            ELSE NULL
                        END,
                    photo_rejected_at =
                        CASE
                            WHEN EXCLUDED.photo_approval_status =
                                 'rejected'
                            THEN NOW()
                            ELSE NULL
                        END,
                    photo_rejection_reason =
                        CASE
                            WHEN EXCLUDED.photo_approval_status =
                                 'rejected'
                            THEN $8
                            ELSE NULL
                        END,
                    updated_at =
                        NOW()
                RETURNING *
            `,
            [
                residentId,
                resolvedVendorId,
                cleanCategory,
                finishedPhotoUrl,
                finishedPhotoPublicId,
                finalApprovalStatus,
                moderationStatus || "rejected",
                rejectionReason
            ]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            project: {
                ...result.rows[0],
                vendor_name:
                vendor.company_name,
                vendor_phone:
                    vendor.phone ||
                    cleanVendorPhone ||
                    null,
                service:
                cleanCategory,
                image_url:
                finishedPhotoUrl,
                approval_status:
                finalApprovalStatus
            },
            moderation,
            photoApprovalStatus:
            finalApprovalStatus,
            message:
                finalApprovalStatus === "approved"
                    ? "Completed project submitted successfully."
                    : "Completed project was submitted but did not pass photo moderation."
        });
    } catch (err) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "submitCompletedProject rollback error:",
                    rollbackError
                );
            }
        }

        console.error(
            "submitCompletedProject error:",
            err
        );

        return res.status(500).json({
            success: false,
            error:
                "Failed to submit completed project."
        });
    } finally {
        if (client) {
            client.release();
        }
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
exports.registerResidentDevice = async (req, res) => {
    try {
        const residentId = Number.parseInt(
            req.params.residentId,
            10
        );

        const deviceToken = String(
            req.body?.device_token || ""
        )
            .trim()
            .toLowerCase();

        const environment = String(
            req.body?.environment || "production"
        )
            .trim()
            .toLowerCase();

        if (
            !Number.isInteger(residentId) ||
            residentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                error: "A valid resident ID is required."
            });
        }

        if (!deviceToken) {
            return res.status(400).json({
                success: false,
                error: "A device token is required."
            });
        }

        if (
            environment !== "production" &&
            environment !== "sandbox"
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Environment must be production or sandbox."
            });
        }

        const residentResult = await pool.query(
            `
                SELECT id
                FROM hoa_residents
                WHERE id = $1
                LIMIT 1
            `,
            [residentId]
        );

        if (!residentResult.rows.length) {
            return res.status(404).json({
                success: false,
                error: "Resident not found."
            });
        }

        await pool.query(
            `
                INSERT INTO hoa_resident_devices
                (
                    resident_id,
                    device_token,
                    environment,
                    active,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    TRUE,
                    NOW(),
                    NOW()
                )
                ON CONFLICT
                    (resident_id, device_token)
                DO UPDATE SET
                    environment =
                        EXCLUDED.environment,
                    active = TRUE,
                    updated_at = NOW()
            `,
            [
                residentId,
                deviceToken,
                environment
            ]
        );

        return res.status(201).json({
            success: true,
            message:
                "Resident device registered successfully."
        });
    } catch (error) {
        console.error(
            "registerResidentDevice error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                "Unable to register the resident device."
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

