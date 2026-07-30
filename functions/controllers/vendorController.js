const pool = require('../db/db');
const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");
const http2 = require("http2");

const ALLOWED_REQUEST_STATUSES = new Set([
    'new',
    'viewed',
    'accepted',
    'declined',
    'completed',
    'cancelled'
]);

function normalizePhone(value) {
    const digits = String(value || '').replace(/\D/g, '');

    if (digits.length === 11 && digits.startsWith('1')) {
        return digits.slice(1);
    }

    return digits;
}

function normalizeDeviceToken(value) {
    return String(value || '')
        .replace(/[<>\s]/g, '')
        .trim()
        .toLowerCase();
}

function parsePositiveInteger(value) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}


const APNS_TOKEN_MAX_AGE_SECONDS = 50 * 60;

let cachedApnsJwt = null;
let cachedApnsJwtIssuedAt = 0;

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

    /*
     * Some environment-variable tools preserve wrapping quotes.
     * Remove them without changing the PEM contents.
     */
    if (
        privateKey.startsWith('"') &&
        privateKey.endsWith('"')
    ) {
        privateKey = privateKey.slice(1, -1);
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

    const privateKey = getApnsPrivateKey();

    if (!teamId || !keyId || !privateKey) {
        throw new Error(
            "Missing APPLE_TEAM_ID, APNS_KEY_ID, or APNS_PRIVATE_KEY."
        );
    }

    const now = Math.floor(Date.now() / 1000);

    if (
        cachedApnsJwt &&
        now - cachedApnsJwtIssuedAt <
        APNS_TOKEN_MAX_AGE_SECONDS
    ) {
        return cachedApnsJwt;
    }

    const encodedHeader = toBase64Url(
        JSON.stringify({
            alg: "ES256",
            kid: keyId
        })
    );

    const encodedPayload = toBase64Url(
        JSON.stringify({
            iss: teamId,
            iat: now
        })
    );

    const unsignedToken =
        `${encodedHeader}.${encodedPayload}`;

    const signature = crypto.sign(
        "sha256",
        Buffer.from(unsignedToken),
        {
            key: privateKey,
            dsaEncoding: "ieee-p1363"
        }
    );

    cachedApnsJwt =
        `${unsignedToken}.${toBase64Url(signature)}`;

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
            new Error("An APNs device token is required.")
        );
    }

    const bundleId = String(
        process.env.APNS_BUNDLE_ID ||
        "com.clubhouselinks.app"
    ).trim();

    const apnsEnvironment =
        normalizeApnsEnvironment(environment);

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

    return new Promise((resolve, reject) => {
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
                // Nothing else is required during cleanup.
            }

            callback(value);
        };

        client.on("error", (error) => {
            finish(reject, error);
        });

        const request = client.request({
            ":method": "POST",
            ":path":
                `/3/device/${normalizedToken}`,
            authorization: `bearer ${jwt}`,
            "apns-topic": bundleId,
            "apns-push-type": "alert",
            "apns-priority": "10",
            "content-type": "application/json"
        });

        request.setEncoding("utf8");

        request.on("response", (headers) => {
            statusCode =
                Number(headers[":status"]) || 0;

            apnsId =
                headers["apns-id"] || null;
        });

        request.on("data", (chunk) => {
            responseBody += chunk;
        });

        request.on("error", (error) => {
            finish(reject, error);
        });

        request.on("end", () => {
            let parsedBody = {};

            if (responseBody) {
                try {
                    parsedBody =
                        JSON.parse(responseBody);
                } catch (_) {
                    parsedBody = {
                        raw: responseBody
                    };
                }
            }

            const response = {
                success: statusCode === 200,
                status_code: statusCode,
                apns_id: apnsId,
                reason:
                    parsedBody.reason || null,
                timestamp:
                    parsedBody.timestamp || null,
                environment:
                apnsEnvironment
            };

            if (statusCode === 200) {
                finish(resolve, response);
                return;
            }

            const error = new Error(
                `APNs rejected the notification: ` +
                `${response.reason || statusCode}.`
            );

            error.statusCode = statusCode;
            error.apnsId = apnsId;
            error.reason =
                response.reason || null;
            error.environment =
                apnsEnvironment;

            finish(reject, error);
        });

        request.end(
            JSON.stringify(payload)
        );
    });
}

function residentRequestNotificationCopy({
                                             status,
                                             vendorName,
                                             service
                                         }) {
    const safeVendorName =
        String(vendorName || "Your contractor")
            .trim() ||
        "Your contractor";

    const safeService =
        String(service || "service")
            .trim()
            .toLowerCase() ||
        "service";

    const messages = {
        viewed: {
            title: "Request Viewed",
            body:
                `${safeVendorName} viewed your ` +
                `${safeService} request.`
        },
        accepted: {
            title: "Request Accepted",
            body:
                `${safeVendorName} accepted your ` +
                `${safeService} request.`
        },
        declined: {
            title: "Request Declined",
            body:
                `${safeVendorName} declined your ` +
                `${safeService} request.`
        },
        completed: {
            title: "Request Completed",
            body:
                `${safeVendorName} marked your ` +
                `${safeService} request complete.`
        },
        cancelled: {
            title: "Request Cancelled",
            body:
                `${safeVendorName} cancelled your ` +
                `${safeService} request.`
        }
    };

    return messages[status] || null;
}

async function deactivateRejectedResidentDevice(
    deviceId,
    reason
) {
    const permanentRejectionReasons =
        new Set([
            "BadDeviceToken",
            "DeviceTokenNotForTopic",
            "Unregistered"
        ]);

    if (
        !deviceId ||
        !permanentRejectionReasons.has(reason)
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
        `[APNs] Disabled resident device ${deviceId} ` +
        `after Apple returned ${reason}.`
    );
}

async function notifyResidentOfRequestStatus(
    requestId,
    requestedStatus
) {
    const status = String(
        requestedStatus || ""
    )
        .trim()
        .toLowerCase();

    const requestResult = await pool.query(
        `
            SELECT
                sr.id,
                sr.resident_id,
                sr.vendor_id,
                sr.service,
                sr.status,

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
        `[APNs] Request ${requestId} found ` +
        `${requestResult.rows.length} active ` +
        `resident device(s).`
    );

    if (!requestResult.rows.length) {
        return {
            attempted: 0,
            sent: 0,
            failed: 0,
            message:
                "No active resident devices were found."
        };
    }

    const firstRow =
        requestResult.rows[0];

    const notification =
        residentRequestNotificationCopy({
            status,
            vendorName:
            firstRow.company_name,
            service:
            firstRow.service
        });

    if (!notification) {
        return {
            attempted: 0,
            sent: 0,
            failed: 0,
            message:
                `No resident notification is configured for ${status}.`
        };
    }

    const summary = {
        attempted:
        requestResult.rows.length,
        sent: 0,
        failed: 0,
        results: []
    };

    for (const row of requestResult.rows) {
        const tokenStart =
            String(row.device_token || "")
                .slice(0, 12);

        console.log(
            `[APNs] Sending ${status} notification ` +
            `to resident=${row.resident_id}, ` +
            `token=${tokenStart}...`
        );

        try {
            const result =
                await sendApnsNotification({
                    deviceToken:
                    row.device_token,
                    environment:
                    row.environment,
                    title:
                    notification.title,
                    body:
                    notification.body,
                    data: {
                        notification_type:
                            "resident_service_request_status",
                        request_id:
                            String(row.id),
                        resident_id:
                            String(row.resident_id),
                        vendor_id:
                            String(row.vendor_id),
                        status
                    }
                });

            summary.sent += 1;

            summary.results.push({
                device_id:
                row.device_id,
                success: true,
                ...result
            });

            console.log(
                `[APNs] Apple accepted request ` +
                `${row.id} notification:`,
                result
            );
        } catch (error) {
            summary.failed += 1;

            summary.results.push({
                device_id:
                row.device_id,
                success: false,
                status_code:
                    error.statusCode || null,
                reason:
                    error.reason || null,
                message:
                error.message
            });

            console.error(
                `[APNs] Apple rejected request ` +
                `${row.id} notification:`,
                {
                    status_code:
                        error.statusCode || null,
                    reason:
                        error.reason || null,
                    message:
                    error.message
                }
            );

            try {
                await deactivateRejectedResidentDevice(
                    row.device_id,
                    error.reason
                );
            } catch (deactivateError) {
                console.error(
                    "[APNs] Could not disable rejected " +
                    "resident device:",
                    deactivateError
                );
            }
        }
    }

    return summary;
}

function publicVendorFields(alias = 'v') {
    return `
        ${alias}.id,
        ${alias}.neighborhood_id,
        ${alias}.company_name,
        ${alias}.category,
        ${alias}.contact_name,
        ${alias}.phone,
        ${alias}.email,
        ${alias}.website,
        ${alias}.description,
        ${alias}.logo_url,
        ${alias}.active
    `;
}

/*
 * POST /login
 *
 * Body:
 * {
 *   "phone": "480-780-5775"
 * }
 *
 * This resolves a phone-verified app user to an active hoa_vendors row.
 * Call it only after the app's existing phone-verification flow succeeds.
 */
exports.loginVendor = async (req, res) => {
    try {
        const normalizedPhone = normalizePhone(req.body.phone);

        if (normalizedPhone.length !== 10) {
            return res.status(400).json({
                success: false,
                error: 'A valid 10-digit phone number is required.'
            });
        }

        const result = await pool.query(
            `
                SELECT
                    ${publicVendorFields('v')}
                FROM hoa_vendors v
                WHERE v.active = TRUE
                  AND RIGHT(
                        REGEXP_REPLACE(
                            COALESCE(v.phone, ''),
                            '[^0-9]',
                            '',
                            'g'
                        ),
                        10
                      ) = $1
                ORDER BY v.id ASC
                LIMIT 2
            `,
            [normalizedPhone]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                error: 'No active vendor account was found for this phone number.'
            });
        }

        /*
         * A phone number should identify exactly one vendor account.
         * Refuse ambiguous logins instead of selecting the wrong company.
         */
        if (result.rows.length > 1) {
            return res.status(409).json({
                success: false,
                error: 'This phone number is attached to more than one vendor account.'
            });
        }

        const vendor = result.rows[0];

        return res.json({
            success: true,
            account_type: 'vendor',
            vendor
        });
    } catch (error) {
        console.error('loginVendor error:', error);

        return res.status(500).json({
            success: false,
            error: 'Unable to sign in to the vendor account.'
        });
    }
};

/*
 * GET /:vendorId/profile
 */
exports.getVendorProfile = async (req, res) => {
    try {
        const vendorId = parsePositiveInteger(
            req.params.vendorId
        );

        if (!vendorId) {
            return res.status(400).json({
                success: false,
                error: "A valid vendor ID is required."
            });
        }

        const result = await pool.query(
            `
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
                    active
                FROM hoa_vendors
                WHERE id = $1
                    LIMIT 1
            `,
            [vendorId]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                error: "Vendor not found."
            });
        }

        return res.json({
            success: true,
            vendor: result.rows[0]
        });
    } catch (error) {
        console.error(
            "getVendorProfile error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Unable to load vendor profile."
        });
    }
};
exports.updateVendorLogo = async (req, res) => {
    try {
        const vendorId = parsePositiveInteger(
            req.params.vendorId
        );

        const imageBase64 = String(
            req.body?.image_base64 ??
            req.body?.imageBase64 ??
            ""
        ).trim();

        if (!vendorId) {
            return res.status(400).json({
                success: false,
                error: "A valid vendor ID is required."
            });
        }

        if (!imageBase64) {
            return res.status(400).json({
                success: false,
                error: "A company logo image is required."
            });
        }

        /*
         * Prevent extremely large JSON uploads.
         * The Swift view resizes the logo before sending it.
         */
        if (imageBase64.length > 15_000_000) {
            return res.status(413).json({
                success: false,
                error: "The selected logo image is too large."
            });
        }

        const vendorResult = await pool.query(
            `
                SELECT
                    id,
                    company_name,
                    active
                FROM hoa_vendors
                WHERE id = $1
                LIMIT 1
            `,
            [vendorId]
        );

        if (!vendorResult.rows.length) {
            return res.status(404).json({
                success: false,
                error: "Vendor not found."
            });
        }

        /*
         * A stable public ID means uploading another logo
         * replaces the old Cloudinary image.
         */
        const uploadResult =
            await cloudinary.uploader.upload(
                imageBase64,
                {
                    folder: "clubhouse_vendor_logos",
                    public_id: `vendor_${vendorId}`,
                    overwrite: true,
                    invalidate: true,
                    resource_type: "image",
                    transformation: [
                        {
                            width: 1200,
                            height: 1200,
                            crop: "limit",
                            quality: "auto"
                        }
                    ]
                }
            );

        const updateResult = await pool.query(
            `
                UPDATE hoa_vendors
                SET
                    logo_url = $1,
                    logo_public_id = $2
                WHERE id = $3
                RETURNING
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
                    active
            `,
            [
                uploadResult.secure_url,
                uploadResult.public_id,
                vendorId
            ]
        );

        return res.json({
            success: true,
            vendor: updateResult.rows[0],
            logo_url: uploadResult.secure_url,
            message: "Company logo updated successfully."
        });
    } catch (error) {
        console.error(
            "updateVendorLogo error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Unable to update the company logo."
        });
    }
};
/*
 * POST /:vendorId/devices
 *
 * Body:
 * {
 *   "device_token": "APNS_DEVICE_TOKEN",
 *   "environment": "production",
 *   "bundle_id": "com.clubhouselinks.app"
 * }
 */
exports.registerVendorDevice = async (req, res) => {
    try {
        const vendorId = parsePositiveInteger(req.params.vendorId);
        const deviceToken = normalizeDeviceToken(req.body.device_token);
        const environment =
            String(req.body.environment || 'production')
                .trim()
                .toLowerCase();
        const bundleId =
            String(
                req.body.bundle_id ||
                process.env.APNS_BUNDLE_ID ||
                'com.clubhouselinks.app'
            ).trim();

        if (!vendorId) {
            return res.status(400).json({
                success: false,
                error: 'A valid vendor ID is required.'
            });
        }

        if (
            deviceToken.length < 32 ||
            deviceToken.length > 256 ||
            !/^[a-f0-9]+$/i.test(deviceToken)
        ) {
            return res.status(400).json({
                success: false,
                error: 'A valid APNs device token is required.'
            });
        }

        if (!['development', 'production'].includes(environment)) {
            return res.status(400).json({
                success: false,
                error: 'APNs environment must be development or production.'
            });
        }

        const vendorResult = await pool.query(
            `
                SELECT id
                FROM hoa_vendors
                WHERE id = $1
                  AND active = TRUE
                LIMIT 1
            `,
            [vendorId]
        );

        if (!vendorResult.rows.length) {
            return res.status(404).json({
                success: false,
                error: 'Vendor account not found.'
            });
        }

        const result = await pool.query(
            `
                INSERT INTO hoa_vendor_devices (
                    vendor_id,
                    device_token,
                    platform,
                    app_bundle_id,
                    apns_environment,
                    active,
                    created_at,
                    updated_at
                )
                VALUES (
                    $1,
                    $2,
                    'ios',
                    $3,
                    $4,
                    TRUE,
                    NOW(),
                    NOW()
                )
                ON CONFLICT (device_token)
                DO UPDATE SET
                    vendor_id = EXCLUDED.vendor_id,
                    platform = 'ios',
                    app_bundle_id = EXCLUDED.app_bundle_id,
                    apns_environment = EXCLUDED.apns_environment,
                    active = TRUE,
                    updated_at = NOW()
                RETURNING
                    id,
                    vendor_id,
                    platform,
                    app_bundle_id,
                    apns_environment,
                    active,
                    created_at,
                    updated_at
            `,
            [
                vendorId,
                deviceToken,
                bundleId,
                environment
            ]
        );

        return res.status(201).json({
            success: true,
            device: result.rows[0],
            message: 'Vendor notifications are enabled on this device.'
        });
    } catch (error) {
        console.error('registerVendorDevice error:', error);

        return res.status(500).json({
            success: false,
            error: 'Unable to register the vendor device.'
        });
    }
};

/*
 * DELETE /:vendorId/devices
 *
 * Body:
 * {
 *   "device_token": "APNS_DEVICE_TOKEN"
 * }
 */
exports.unregisterVendorDevice = async (req, res) => {
    try {
        const vendorId = parsePositiveInteger(req.params.vendorId);
        const deviceToken = normalizeDeviceToken(req.body.device_token);

        if (!vendorId) {
            return res.status(400).json({
                success: false,
                error: 'A valid vendor ID is required.'
            });
        }

        if (!deviceToken) {
            return res.status(400).json({
                success: false,
                error: 'A device token is required.'
            });
        }

        const result = await pool.query(
            `
                UPDATE hoa_vendor_devices
                SET
                    active = FALSE,
                    updated_at = NOW()
                WHERE vendor_id = $1
                  AND device_token = $2
                RETURNING id
            `,
            [
                vendorId,
                deviceToken
            ]
        );

        return res.json({
            success: true,
            removed: result.rowCount > 0
        });
    } catch (error) {
        console.error('unregisterVendorDevice error:', error);

        return res.status(500).json({
            success: false,
            error: 'Unable to disable notifications on this device.'
        });
    }
};

/*
 * GET /:vendorId/service-requests
 *
 * Optional query parameters:
 *   status=new
 *   limit=50
 *   offset=0
 */
exports.getVendorServiceRequests = async (req, res) => {
    try {
        const vendorId = parsePositiveInteger(req.params.vendorId);
        const requestedStatus =
            String(req.query.status || '')
                .trim()
                .toLowerCase();

        const limit = Math.min(
            Math.max(Number.parseInt(req.query.limit, 10) || 50, 1),
            100
        );

        const offset = Math.max(
            Number.parseInt(req.query.offset, 10) || 0,
            0
        );

        if (!vendorId) {
            return res.status(400).json({
                success: false,
                error: 'A valid vendor ID is required.'
            });
        }

        if (
            requestedStatus &&
            !ALLOWED_REQUEST_STATUSES.has(requestedStatus)
        ) {
            return res.status(400).json({
                success: false,
                error: 'Invalid service-request status.'
            });
        }

        const values = [vendorId];
        let statusClause = '';

        if (requestedStatus) {
            values.push(requestedStatus);
            statusClause = `AND sr.status = $${values.length}`;
        }

        values.push(limit);
        const limitParameter = `$${values.length}`;

        values.push(offset);
        const offsetParameter = `$${values.length}`;

        const result = await pool.query(
            `
                SELECT
                    sr.id,
                    sr.resident_id,
                    sr.vendor_id,
                    sr.service,
                    sr.sub_service,
                    sr.message,
                    sr.status,
                    sr.created_at,
                    sr.viewed_at,
                    sr.accepted_at,
                    sr.completed_at,

                    COALESCE(
                            r.first_name,
                            sr.lead_name,
                            'Homeowner'
                    ) AS resident_first_name,

                    COALESCE(
                            r.last_name,
                            ''
                    ) AS resident_last_name,

                    COALESCE(
                            r.phone,
                            sr.lead_phone
                    ) AS resident_phone,

                    COALESCE(
                            r.address,
                            sr.lead_address
                    ) AS resident_address,

                    COALESCE(
                            r.display_area_name,
                            NULLIF(
                                    CONCAT_WS(
                                            ', ',
                                            NULLIF(BTRIM(sr.lead_city), ''),
                                            NULLIF(BTRIM(sr.lead_state), '')
                                    ),
                                    ''
                            )
                    ) AS resident_display_area_name,

                    sr.source,
                    sr.source_lead_id,

                    v.company_name AS vendor_company_name,
                    v.category AS vendor_category
                FROM hoa_service_requests sr
                         LEFT JOIN hoa_residents r
                                   ON r.id = sr.resident_id
                         JOIN hoa_vendors v
                              ON v.id = sr.vendor_id
                WHERE sr.vendor_id = $1
                    ${statusClause}
                ORDER BY
                    CASE sr.status
                    WHEN 'new' THEN 0
                    WHEN 'viewed' THEN 1
                    WHEN 'accepted' THEN 2
                    ELSE 3
                END,
                    sr.created_at DESC
                LIMIT ${limitParameter}
                OFFSET ${offsetParameter}
            `,
            values
        );

        const countResult = await pool.query(
            `
                SELECT
                    COUNT(*)::integer AS total_count,
                    COUNT(*) FILTER (
                        WHERE status = 'new'
                    )::integer AS new_count
                FROM hoa_service_requests
                WHERE vendor_id = $1
            `,
            [vendorId]
        );

        return res.json({
            success: true,
            requests: result.rows,
            total_count:
                countResult.rows[0]?.total_count || 0,
            new_count:
                countResult.rows[0]?.new_count || 0,
            limit,
            offset
        });
    } catch (error) {
        console.error('getVendorServiceRequests error:', error);

        return res.status(500).json({
            success: false,
            error: 'Unable to load vendor service requests.'
        });
    }
};

/*
 * GET /:vendorId/service-requests/:requestId
 */
exports.getVendorServiceRequest = async (req, res) => {
    try {
        const vendorId = parsePositiveInteger(req.params.vendorId);
        const requestId = parsePositiveInteger(req.params.requestId);

        if (!vendorId || !requestId) {
            return res.status(400).json({
                success: false,
                error: 'Valid vendor and request IDs are required.'
            });
        }

        const result = await pool.query(
            `
                SELECT
                    sr.id,
                    sr.resident_id,
                    sr.vendor_id,
                    sr.service,
                    sr.sub_service,
                    sr.message,
                    sr.status,
                    sr.created_at,
                    sr.viewed_at,
                    sr.accepted_at,
                    sr.completed_at,

                    COALESCE(
                            r.first_name,
                            sr.lead_name,
                            'Homeowner'
                    ) AS resident_first_name,

                    COALESCE(
                            r.last_name,
                            ''
                    ) AS resident_last_name,

                    COALESCE(
                            r.phone,
                            sr.lead_phone
                    ) AS resident_phone,

                    COALESCE(
                            r.address,
                            sr.lead_address
                    ) AS resident_address,

                    COALESCE(
                            r.display_area_name,
                            NULLIF(
                                    CONCAT_WS(
                                            ', ',
                                            NULLIF(BTRIM(sr.lead_city), ''),
                                            NULLIF(BTRIM(sr.lead_state), '')
                                    ),
                                    ''
                            )
                    ) AS resident_display_area_name,

                    sr.source,
                    sr.source_lead_id,

                    v.company_name AS vendor_company_name,
                    v.category AS vendor_category

                FROM hoa_service_requests sr

                         LEFT JOIN hoa_residents r
                                   ON r.id = sr.resident_id

                         JOIN hoa_vendors v
                              ON v.id = sr.vendor_id

                WHERE sr.id = $1
                  AND sr.vendor_id = $2

                    LIMIT 1
            `,
            [
                requestId,
                vendorId
            ]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                error: 'Service request not found.'
            });
        }

        return res.json({
            success: true,
            request: result.rows[0]
        });
    } catch (error) {
        console.error('getVendorServiceRequest error:', error);

        return res.status(500).json({
            success: false,
            error: 'Unable to load the service request.'
        });
    }
};

/*
 * PATCH /:vendorId/service-requests/:requestId/viewed
 */
exports.markVendorServiceRequestViewed = async (req, res) => {
    try {
        const vendorId =
            parsePositiveInteger(
                req.params.vendorId
            );

        const requestId =
            parsePositiveInteger(
                req.params.requestId
            );

        if (!vendorId || !requestId) {
            return res.status(400).json({
                success: false,
                error:
                    'Valid vendor and request IDs are required.'
            });
        }

        /*
         * Return the previous viewed timestamp so a resident
         * receives "Request Viewed" only the first time the
         * vendor opens the request.
         */
        const result = await pool.query(
            `
                WITH existing AS (
                    SELECT
                        id,
                        status AS previous_status,
                        viewed_at AS previous_viewed_at
                    FROM hoa_service_requests
                    WHERE id = $1
                      AND vendor_id = $2
                    FOR UPDATE
                )

                UPDATE hoa_service_requests sr
                SET
                    status =
                        CASE
                            WHEN sr.status = 'new'
                                THEN 'viewed'
                            ELSE sr.status
                        END,

                    viewed_at =
                        COALESCE(
                            sr.viewed_at,
                            NOW()
                        )

                FROM existing e

                WHERE sr.id = e.id

                RETURNING
                    sr.*,
                    e.previous_status,
                    e.previous_viewed_at
            `,
            [
                requestId,
                vendorId
            ]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                error:
                    'Service request not found.'
            });
        }

        const requestRow = {
            ...result.rows[0]
        };

        const previousViewedAt =
            requestRow.previous_viewed_at;

        delete requestRow.previous_status;
        delete requestRow.previous_viewed_at;

        /*
         * FTN/imported leads can have resident_id = NULL.
         * Only app-resident requests have a resident device
         * that can receive a status notification.
         */
        if (
            requestRow.resident_id &&
            previousViewedAt == null
        ) {
            console.log(
                `[APNs] Preparing resident notification: ` +
                `request=${requestId}, status=viewed`
            );

            try {
                const pushResult =
                    await notifyResidentOfRequestStatus(
                        requestId,
                        "viewed"
                    );

                console.log(
                    "[APNs] Resident viewed notification finished:",
                    pushResult
                );
            } catch (pushError) {
                /*
                 * A push failure must not roll back the status
                 * change or make the vendor screen show an error.
                 */
                console.error(
                    "[APNs] Resident viewed notification failed:",
                    pushError
                );
            }
        }

        return res.json({
            success: true,
            request: requestRow
        });
    } catch (error) {
        console.error(
            'markVendorServiceRequestViewed error:',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                'Unable to mark the service request as viewed.'
        });
    }
};

/*
 * PATCH /:vendorId/service-requests/:requestId/status
 *
 * Body:
 * {
 *   "status": "accepted"
 * }
 */
exports.updateVendorServiceRequestStatus = async (req, res) => {
    try {
        const vendorId =
            parsePositiveInteger(
                req.params.vendorId
            );

        const requestId =
            parsePositiveInteger(
                req.params.requestId
            );

        const status =
            String(req.body.status || '')
                .trim()
                .toLowerCase();

        if (!vendorId || !requestId) {
            return res.status(400).json({
                success: false,
                error:
                    'Valid vendor and request IDs are required.'
            });
        }

        if (!ALLOWED_REQUEST_STATUSES.has(status)) {
            return res.status(400).json({
                success: false,
                error:
                    'Status must be new, viewed, accepted, declined, completed, or cancelled.'
            });
        }

        /*
         * Capture the old status in the same statement so
         * duplicate PATCH requests do not send duplicate
         * resident push notifications.
         */
        const result = await pool.query(
            `
                WITH existing AS (
                    SELECT
                        id,
                        status AS previous_status
                    FROM hoa_service_requests
                    WHERE id = $1
                      AND vendor_id = $2
                    FOR UPDATE
                )

                UPDATE hoa_service_requests sr
                SET
                    status = $3,

                    viewed_at =
                        CASE
                            WHEN $3 IN (
                                'viewed',
                                'accepted',
                                'declined',
                                'completed'
                            )
                                THEN COALESCE(
                                    sr.viewed_at,
                                    NOW()
                                )
                            ELSE sr.viewed_at
                        END,

                    accepted_at =
                        CASE
                            WHEN $3 = 'accepted'
                                THEN COALESCE(
                                    sr.accepted_at,
                                    NOW()
                                )
                            ELSE sr.accepted_at
                        END,

                    completed_at =
                        CASE
                            WHEN $3 = 'completed'
                                THEN COALESCE(
                                    sr.completed_at,
                                    NOW()
                                )
                            ELSE sr.completed_at
                        END

                FROM existing e

                WHERE sr.id = e.id

                RETURNING
                    sr.*,
                    e.previous_status
            `,
            [
                requestId,
                vendorId,
                status
            ]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                error:
                    'Service request not found.'
            });
        }

        const requestRow = {
            ...result.rows[0]
        };

        const previousStatus =
            String(
                requestRow.previous_status || ""
            )
                .trim()
                .toLowerCase();

        delete requestRow.previous_status;

        const residentNotificationStatuses =
            new Set([
                "viewed",
                "accepted",
                "declined",
                "completed",
                "cancelled"
            ]);

        const shouldNotifyResident =
            Boolean(requestRow.resident_id) &&
            previousStatus !== status &&
            residentNotificationStatuses.has(
                status
            );

        if (shouldNotifyResident) {
            console.log(
                `[APNs] Preparing resident notification: ` +
                `request=${requestId}, ` +
                `status=${status}, ` +
                `previousStatus=${previousStatus}`
            );

            try {
                const pushResult =
                    await notifyResidentOfRequestStatus(
                        requestId,
                        status
                    );

                console.log(
                    "[APNs] Resident status notification finished:",
                    pushResult
                );
            } catch (pushError) {
                /*
                 * The status update remains successful even if
                 * Apple temporarily rejects or cannot receive
                 * the notification.
                 */
                console.error(
                    "[APNs] Resident status notification failed:",
                    pushError
                );
            }
        } else {
            console.log(
                `[APNs] Resident notification skipped: ` +
                `request=${requestId}, ` +
                `previousStatus=${previousStatus}, ` +
                `status=${status}, ` +
                `residentId=${requestRow.resident_id || "none"}`
            );
        }

        return res.json({
            success: true,
            request: requestRow,
            message:
                `Service request marked ${status}.`
        });
    } catch (error) {
        console.error(
            'updateVendorServiceRequestStatus error:',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                'Unable to update the service request.'
        });
    }
};

exports.getVendorCompletedProjects = async (req, res) => {
    try {
        const vendorId = parsePositiveInteger(
            req.params.vendorId
        );

        if (!vendorId) {
            return res.status(400).json({
                success: false,
                error: "A valid vendor ID is required."
            });
        }

        const result = await pool.query(
            `
                SELECT
                    rc.id,
                    rc.resident_id,
                    rc.vendor_id,

                    v.company_name AS vendor_name,
                    v.category AS vendor_category,

                    rc.category AS service,
                    rc.finished_photo_url AS image_url,
                    rc.photo_approval_status AS approval_status,
                    rc.moderation_status,
                    rc.photo_submitted_at,
                    rc.photo_approved_at,
                    rc.photo_rejected_at,
                    rc.photo_rejection_reason,

                    r.first_name AS resident_first_name,
                    r.last_name AS resident_last_name,
                    r.phone AS resident_phone,
                    r.address AS resident_address,
                    r.display_area_name
                        AS resident_display_area_name

                FROM hoa_resident_contractors rc

                         JOIN hoa_vendors v
                              ON v.id = rc.vendor_id

                         JOIN hoa_residents r
                              ON r.id = rc.resident_id

                WHERE rc.vendor_id = $1
                  AND rc.finished_photo_url IS NOT NULL
                  AND rc.photo_approval_status = 'approved'
                  AND rc.moderation_status = 'approved'

                ORDER BY
                    COALESCE(
                            rc.photo_approved_at,
                            rc.photo_submitted_at,
                            rc.updated_at
                    ) DESC
            `,
            [vendorId]
        );

        return res.json({
            success: true,
            projects: result.rows,
            total_count: result.rows.length
        });
    } catch (error) {
        console.error(
            "getVendorCompletedProjects error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Failed to load vendor completed projects."
        });
    }
};