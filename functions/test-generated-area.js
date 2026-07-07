const pool = require("./db/db");
const jwt = require("jsonwebtoken");

const TEST_ADDRESS = "650 Windwalk Dr, Roswell, GA";

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
        lat: first.coordinate.latitude,
        lng: first.coordinate.longitude,
        formattedAddress: first.formattedAddressLines?.join(", ") || address,
        locality: first.locality || null,
        administrativeArea: first.administrativeArea || null,
        country: first.country || null,
        raw: first
    };
}

(async () => {
    try {
        const geo = await geocodeAddressWithAppleMaps(TEST_ADDRESS);

        console.log("Geocode result:");
        console.log(JSON.stringify(geo, null, 2));
    } catch (err) {
        console.error("ERROR:", err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
