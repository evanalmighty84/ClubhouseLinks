const crypto = require("crypto");
const http2 = require("http2");

const pool = require("../db/db");

const APNS_TOKEN_MAX_AGE_SECONDS =
    50 * 60;

let cachedApnsJwt = null;
let cachedApnsJwtIssuedAt = 0;

function normalizeDeviceToken(value) {
    return String(value || "")
        .replace(/[<>\s]/g, "")
        .trim()
        .toLowerCase();
}

function toBase64Url(value) {
    const buffer = Buffer.isBuffer(value)
        ? value
        : Buffer.from(String(value));

    return buffer.toString("base64url");
}

function getApnsPrivateKey() {
    let privateKey = String(
        process.env.APNS_PRIVATE_KEY || ""
    )
        .replace(/\\n/g, "\n")
        .trim();

    if (
        privateKey.startsWith('"') &&
        privateKey.endsWith('"')
    ) {
        privateKey =
            privateKey.slice(1, -1);
    }

    return privateKey;
}

function createApnsJwt() {
    const teamId = String(
        process.env.APPLE_TEAM_ID || ""
    ).trim();

    const keyId = String(
        process.env.APNS_KEY_ID || ""
    ).trim();

    const privateKey =
        getApnsPrivateKey();

    if (
        !teamId ||
        !keyId ||
        !privateKey
    ) {
        throw new Error(
            "Missing APPLE_TEAM_ID, " +
            "APNS_KEY_ID, or " +
            "APNS_PRIVATE_KEY."
        );
    }

    const now =
        Math.floor(Date.now() / 1000);

    if (
        cachedApnsJwt &&
        now - cachedApnsJwtIssuedAt <
        APNS_TOKEN_MAX_AGE_SECONDS
    ) {
        return cachedApnsJwt;
    }

    const encodedHeader =
        toBase64Url(
            JSON.stringify({
                alg: "ES256",
                kid: keyId
            })
        );

    const encodedPayload =
        toBase64Url(
            JSON.stringify({
                iss: teamId,
                iat: now
            })
        );

    const unsignedToken =
        `${encodedHeader}.` +
        `${encodedPayload}`;

    const signature = crypto.sign(
        "sha256",
        Buffer.from(unsignedToken),
        {
            key: privateKey,
            dsaEncoding: "ieee-p1363"
        }
    );

    cachedApnsJwt =
        `${unsignedToken}.` +
        `${toBase64Url(signature)}`;

    cachedApnsJwtIssuedAt = now;

    return cachedApnsJwt;
}

function normalizeApnsEnvironment(value) {
    const normalized = String(
        value || "production"
    )
        .trim()
        .toLowerCase();

    if (
        normalized === "development" ||
        normalized === "sandbox"
    ) {
        return "development";
    }

    return "production";
}

function sendApnsNotification({
                                  deviceToken,
                                  environment,
                                  title,
                                  body,
                                  data = {}
                              }) {
    const normalizedToken =
        normalizeDeviceToken(deviceToken);

    if (!normalizedToken) {
        return Promise.reject(
            new Error(
                "An APNs device token is required."
            )
        );
    }

    const bundleId = String(
        process.env.APNS_BUNDLE_ID ||
        "com.clubhouselinks.app"
    ).trim();

    const apnsEnvironment =
        normalizeApnsEnvironment(
            environment
        );

    const host =
        apnsEnvironment === "development"
            ? "api.sandbox.push.apple.com"
            : "api.push.apple.com";

    const jwt = createApnsJwt();

    const payload = {
        aps: {
            alert: {
                title,
                body
            },
            sound: "default"
        },
        ...data
    };

    return new Promise(
        (resolve, reject) => {
            let settled = false;
            let responseBody = "";
            let statusCode = 0;
            let apnsId = null;

            const client = http2.connect(
                `https://${host}`
            );

            const finish = (
                callback,
                value
            ) => {
                if (settled) {
                    return;
                }

                settled = true;

                try {
                    client.close();
                } catch (_) {
                    // No cleanup action required.
                }

                callback(value);
            };

            client.on(
                "error",
                (error) => {
                    finish(
                        reject,
                        error
                    );
                }
            );

            const request =
                client.request({
                    ":method": "POST",
                    ":path":
                        `/3/device/` +
                        normalizedToken,
                    authorization:
                        `bearer ${jwt}`,
                    "apns-topic":
                    bundleId,
                    "apns-push-type":
                        "alert",
                    "apns-priority":
                        "10",
                    "content-type":
                        "application/json"
                });

            request.setEncoding("utf8");

            request.on(
                "response",
                (headers) => {
                    statusCode =
                        Number(
                            headers[":status"]
                        ) || 0;

                    apnsId =
                        headers["apns-id"] ||
                        null;
                }
            );

            request.on(
                "data",
                (chunk) => {
                    responseBody += chunk;
                }
            );

            request.on(
                "error",
                (error) => {
                    finish(
                        reject,
                        error
                    );
                }
            );

            request.on(
                "end",
                () => {
                    let parsedBody = {};

                    if (responseBody) {
                        try {
                            parsedBody =
                                JSON.parse(
                                    responseBody
                                );
                        } catch (_) {
                            parsedBody = {
                                raw:
                                responseBody
                            };
                        }
                    }

                    const response = {
                        success:
                            statusCode === 200,
                        status_code:
                        statusCode,
                        apns_id:
                        apnsId,
                        reason:
                            parsedBody.reason ||
                            null,
                        timestamp:
                            parsedBody.timestamp ||
                            null,
                        environment:
                        apnsEnvironment
                    };

                    if (
                        statusCode === 200
                    ) {
                        finish(
                            resolve,
                            response
                        );
                        return;
                    }

                    const error =
                        new Error(
                            "APNs rejected the " +
                            "notification: " +
                            `${response.reason || statusCode}.`
                        );

                    error.statusCode =
                        statusCode;

                    error.reason =
                        response.reason ||
                        null;

                    finish(
                        reject,
                        error
                    );
                }
            );

            request.end(
                JSON.stringify(payload)
            );
        }
    );
}

async function deactivateRejectedDevice(
    deviceId,
    reason
) {
    const permanentReasons =
        new Set([
            "BadDeviceToken",
            "DeviceTokenNotForTopic",
            "Unregistered"
        ]);

    if (
        !deviceId ||
        !permanentReasons.has(reason)
    ) {
        return;
    }

    await pool.query(
        `
            UPDATE hoa_resident_devices
            SET
                active = FALSE,
                updated_at = NOW()
            WHERE id = $1
        `,
        [deviceId]
    );

    console.warn(
        `[APNs] Disabled resident ` +
        `device ${deviceId} after ` +
        `Apple returned ${reason}.`
    );
}

async function notifyResidentRequestReceived(
    requestId
) {
    const result = await pool.query(
        `
            SELECT
                sr.id,
                sr.resident_id,
                sr.vendor_id,
                sr.service,

                v.company_name,

                d.id AS device_id,
                d.device_token,

                COALESCE(
                    NULLIF(
                        BTRIM(d.environment),
                        ''
                    ),
                    'production'
                ) AS environment

            FROM hoa_service_requests sr

            JOIN hoa_vendors v
              ON v.id = sr.vendor_id

            JOIN hoa_resident_devices d
              ON d.resident_id =
                    sr.resident_id
             AND d.active = TRUE

            WHERE sr.id = $1
              AND sr.resident_id IS NOT NULL

            ORDER BY d.updated_at DESC
        `,
        [requestId]
    );

    console.log(
        `[APNs] Request ${requestId} ` +
        `confirmation found ` +
        `${result.rows.length} active ` +
        `resident device(s).`
    );

    const summary = {
        attempted:
        result.rows.length,
        sent: 0,
        failed: 0,
        results: []
    };

    for (const row of result.rows) {
        const safeService =
            String(
                row.service ||
                "service"
            )
                .trim()
                .toLowerCase() ||
            "service";

        const safeVendorName =
            String(
                row.company_name ||
                "the selected vendor"
            ).trim() ||
            "the selected vendor";

        try {
            const pushResult =
                await sendApnsNotification({
                    deviceToken:
                    row.device_token,
                    environment:
                    row.environment,
                    title:
                        "Request Received",
                    body:
                        `We received your ` +
                        `${safeService} request ` +
                        `for ${safeVendorName}.`,
                    data: {
                        notification_type:
                            "resident_service_request_received",
                        request_id:
                            String(row.id),
                        resident_id:
                            String(
                                row.resident_id
                            ),
                        vendor_id:
                            String(
                                row.vendor_id
                            ),
                        status: "new"
                    }
                });

            summary.sent += 1;

            summary.results.push({
                device_id:
                row.device_id,
                success: true,
                ...pushResult
            });

            console.log(
                `[APNs] Apple accepted ` +
                `request ${row.id} ` +
                `received notification:`,
                pushResult
            );
        } catch (error) {
            summary.failed += 1;

            summary.results.push({
                device_id:
                row.device_id,
                success: false,
                status_code:
                    error.statusCode ||
                    null,
                reason:
                    error.reason ||
                    null,
                message:
                error.message
            });

            console.error(
                `[APNs] Request received ` +
                `notification failed:`,
                {
                    request_id:
                    row.id,
                    resident_id:
                    row.resident_id,
                    device_id:
                    row.device_id,
                    status_code:
                        error.statusCode ||
                        null,
                    reason:
                        error.reason ||
                        null,
                    message:
                    error.message
                }
            );

            try {
                await deactivateRejectedDevice(
                    row.device_id,
                    error.reason
                );
            } catch (
                deactivateError
                ) {
                console.error(
                    "[APNs] Could not " +
                    "deactivate rejected " +
                    "resident device:",
                    deactivateError
                );
            }
        }
    }

    return summary;
}

module.exports = {
    notifyResidentRequestReceived
};
