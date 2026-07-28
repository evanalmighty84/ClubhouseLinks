const pool = require('../db/db');

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
        const vendorId = parsePositiveInteger(req.params.vendorId);

        if (!vendorId) {
            return res.status(400).json({
                success: false,
                error: 'A valid vendor ID is required.'
            });
        }

        const result = await pool.query(
            `
                SELECT
                    ${publicVendorFields('v')},
                    n.name AS neighborhood_name,
                    (
                        SELECT COUNT(*)::integer
                        FROM hoa_service_requests sr
                        WHERE sr.vendor_id = v.id
                          AND sr.status = 'new'
                    ) AS new_request_count
                FROM hoa_vendors v
                LEFT JOIN hoa_neighborhoods n
                  ON n.id = v.neighborhood_id
                WHERE v.id = $1
                  AND v.active = TRUE
                LIMIT 1
            `,
            [vendorId]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                error: 'Vendor account not found.'
            });
        }

        return res.json({
            success: true,
            vendor: result.rows[0]
        });
    } catch (error) {
        console.error('getVendorProfile error:', error);

        return res.status(500).json({
            success: false,
            error: 'Unable to load the vendor profile.'
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

                    r.first_name AS resident_first_name,
                    r.last_name AS resident_last_name,
                    r.phone AS resident_phone,
                    r.address AS resident_address,
                    r.display_area_name AS resident_display_area_name,

                    v.company_name AS vendor_company_name,
                    v.category AS vendor_category
                FROM hoa_service_requests sr
                JOIN hoa_residents r
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

                    r.first_name AS resident_first_name,
                    r.last_name AS resident_last_name,
                    r.phone AS resident_phone,
                    r.address AS resident_address,
                    r.display_area_name AS resident_display_area_name,

                    v.company_name AS vendor_company_name,
                    v.category AS vendor_category
                FROM hoa_service_requests sr
                JOIN hoa_residents r
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
                UPDATE hoa_service_requests
                SET
                    status =
                        CASE
                            WHEN status = 'new'
                                THEN 'viewed'
                            ELSE status
                        END,
                    viewed_at = COALESCE(viewed_at, NOW())
                WHERE id = $1
                  AND vendor_id = $2
                RETURNING *
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
        console.error(
            'markVendorServiceRequestViewed error:',
            error
        );

        return res.status(500).json({
            success: false,
            error: 'Unable to mark the service request as viewed.'
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
        const vendorId = parsePositiveInteger(req.params.vendorId);
        const requestId = parsePositiveInteger(req.params.requestId);
        const status =
            String(req.body.status || '')
                .trim()
                .toLowerCase();

        if (!vendorId || !requestId) {
            return res.status(400).json({
                success: false,
                error: 'Valid vendor and request IDs are required.'
            });
        }

        if (!ALLOWED_REQUEST_STATUSES.has(status)) {
            return res.status(400).json({
                success: false,
                error:
                    'Status must be new, viewed, accepted, declined, completed, or cancelled.'
            });
        }

        const result = await pool.query(
            `
                UPDATE hoa_service_requests
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
                                THEN COALESCE(viewed_at, NOW())
                            ELSE viewed_at
                        END,
                    accepted_at =
                        CASE
                            WHEN $3 = 'accepted'
                                THEN COALESCE(accepted_at, NOW())
                            ELSE accepted_at
                        END,
                    completed_at =
                        CASE
                            WHEN $3 = 'completed'
                                THEN COALESCE(completed_at, NOW())
                            ELSE completed_at
                        END
                WHERE id = $1
                  AND vendor_id = $2
                RETURNING *
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
                error: 'Service request not found.'
            });
        }

        return res.json({
            success: true,
            request: result.rows[0],
            message: `Service request marked ${status}.`
        });
    } catch (error) {
        console.error(
            'updateVendorServiceRequestStatus error:',
            error
        );

        return res.status(500).json({
            success: false,
            error: 'Unable to update the service request.'
        });
    }
};
