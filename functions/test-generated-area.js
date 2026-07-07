const pool = require("./db/db");
const jwt = require("jsonwebtoken");

const TEST_ADDRESS = "670 Windwalk Dr, Roswell, GA";
const DEFAULT_RADIUS_MILES = 0.35;

const APPLE_MAPS_KEY_ID = process.env.APPLE_MAPS_KEY_ID;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_MAPS_ID = process.env.APPLE_MAPS_ID;
const APPLE_MAPS_PRIVATE_KEY = process.env.APPLE_MAPS_PRIVATE_KEY;

function getSignedAppleMapsJwt() {
    if (!APPLE_MAPS_KEY_ID || !APPLE_TEAM_ID || !APPLE_MAPS_ID || !APPLE_MAPS_PRIVATE_KEY) {
        throw new Error("Missing Apple Maps env vars.");
    }

    return jwt.sign(
        {
            iss: APPLE_TEAM_ID,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 1800,
            origin: APPLE_MAPS_ID
        },
        APPLE_MAPS_PRIVATE_KEY.replace(/\\n/g, "\n"),
        {
            algorithm: "ES256",
            header: {
                kid: APPLE_MAPS_KEY_ID,
                typ: "JWT"
            }
        }
    );
}

async function getAppleMapsAccessToken() {
    const signedJwt = getSignedAppleMapsJwt();

    const response = await fetch("https://maps-api.apple.com/v1/token", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${signedJwt}`
        }
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`Apple token error ${response.status}: ${text}`);
    }

    const json = JSON.parse(text);

    if (!json.accessToken) {
        throw new Error(`Apple token missing accessToken: ${text}`);
    }

    return json.accessToken;
}

async function geocodeAddressWithAppleMaps(address) {
    const accessToken = await getAppleMapsAccessToken();

    const url = new URL("https://maps-api.apple.com/v1/geocode");
    url.searchParams.set("q", address);
    url.searchParams.set("lang", "en-US");

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`Apple geocode error ${response.status}: ${text}`);
    }

    const json = JSON.parse(text);
    const first = json.results?.[0];

    if (!first?.coordinate) {
        throw new Error(`No geocode result for address: ${address}`);
    }

    return {
        lat: Number(first.coordinate.latitude),
        lng: Number(first.coordinate.longitude),
        formattedAddress: first.formattedAddressLines?.join(", ") || address,
        city: first.structuredAddress?.locality || first.locality || null,
        state: first.structuredAddress?.administrativeAreaCode || first.structuredAddress?.administrativeArea || first.administrativeArea || null,
        street: first.structuredAddress?.thoroughfare || null,
        fullStreet: first.structuredAddress?.fullThoroughfare || first.name || null,
        postalCode: first.structuredAddress?.postCode || null,
        country: first.country || null,
        raw: first
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
        WHERE active = true
        ORDER BY created_at DESC
    `);

    for (const area of result.rows) {
        if (Array.isArray(area.polygon) && pointInPolygon(lng, lat, area.polygon)) {
            return area;
        }
    }

    return null;
}

function chooseTemporaryAreaName(geo) {
    const formatted = `${geo.formattedAddress || ""}`.toLowerCase();

    if (formatted.includes("windwalk") || formatted.includes("hembree") || geo.city === "Roswell") {
        return "Hembree Area";
    }

    if (geo.city) {
        return `${geo.city} Area`;
    }

    return "Local Customer Area";
}

async function createGeneratedArea(geo) {
    const areaName = chooseTemporaryAreaName(geo);

    const polygon = createCirclePolygon({
        lat: geo.lat,
        lng: geo.lng,
        radiusMiles: DEFAULT_RADIUS_MILES
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
            geo.city,
            geo.state,
            geo.lat,
            geo.lng,
            DEFAULT_RADIUS_MILES,
            JSON.stringify(polygon),
            "auto_generated_test_script",
            0.70,
            TEST_ADDRESS
        ]
    );

    return result.rows[0];
}

(async () => {
    try {
        console.log("Testing generated area for:", TEST_ADDRESS);

        const geo = await geocodeAddressWithAppleMaps(TEST_ADDRESS);

        console.log("Geocode:");
        console.log({
            lat: geo.lat,
            lng: geo.lng,
            formattedAddress: geo.formattedAddress,
            city: geo.city,
            state: geo.state
        });

        const existing = await findExistingGeneratedArea(geo.lat, geo.lng);

        if (existing) {
            console.log("Existing generated area found:");
            console.log(existing);
            return;
        }

        const created = await createGeneratedArea(geo);

        console.log("Created generated area:");
        console.log({
            id: created.id,
            area_name: created.area_name,
            city: created.city,
            state: created.state,
            center_lat: created.center_lat,
            center_lng: created.center_lng,
            radius_miles: created.radius_miles,
            polygon_points: created.polygon?.length
        });
    } catch (err) {
        console.error("ERROR:", err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
