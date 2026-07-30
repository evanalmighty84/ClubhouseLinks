const pool = require("../db/db");

const {
    sendVendorPush
} = require("../services/apnsService");

const {
    notifyResidentRequestReceived
} = require(
    "../services/residentRequestPushService"
);

function positiveInteger(value) {
    const parsed = Number(value);

    return Number.isInteger(parsed) &&
    parsed > 0
        ? parsed
        : null;
}

/*
 * POST
 * /api/residents/:residentId/service-requests
 *
 * Body:
 * {
 *   "vendor_id": 35,
 *   "service": "Landscaping",
 *   "sub_service": "Lawn Care",
 *   "message": "I need help..."
 * }
 */
exports.submitServiceRequest = async (
    req,
    res
) => {
    const residentId =
        positiveInteger(
            req.params.residentId
        );

    const vendorId =
        positiveInteger(
            req.body.vendor_id
        );

    const service =
        String(
            req.body.service || ""
        ).trim();

    const subService =
        String(
            req.body.sub_service || ""
        ).trim();

    const message =
        String(
            req.body.message || ""
        ).trim();

    if (!residentId) {
        return res.status(400).json({
            success: false,
            error:
                "A valid resident ID is required."
        });
    }

    if (!vendorId) {
        return res.status(400).json({
            success: false,
            error:
                "A valid vendor ID is required."
        });
    }

    if (!service) {
        return res.status(400).json({
            success: false,
            error:
                "A service is required."
        });
    }

    if (!message) {
        return res.status(400).json({
            success: false,
            error:
                "A message is required."
        });
    }

    try {
        const accountResult =
            await pool.query(
                `
                    SELECT
                        r.id AS resident_id,
                        r.first_name,
                        r.last_name,

                        v.id AS vendor_id,
                        v.company_name,
                        v.category

                    FROM hoa_residents r

                             CROSS JOIN hoa_vendors v

                    WHERE r.id = $1
                      AND v.id = $2
                      AND v.active = TRUE

                        LIMIT 1
                `,
                [
                    residentId,
                    vendorId
                ]
            );

        if (!accountResult.rows.length) {
            return res.status(404).json({
                success: false,
                error:
                    "The resident or selected vendor could not be found."
            });
        }

        const account =
            accountResult.rows[0];

        const insertedResult =
            await pool.query(
                `
                    INSERT INTO
                        hoa_service_requests
                    (
                        resident_id,
                        vendor_id,
                        service,
                        sub_service,
                        message,
                        status,
                        created_at
                    )
                    VALUES
                        (
                            $1,
                            $2,
                            $3,
                            NULLIF($4, ''),
                            $5,
                            'new',
                            NOW()
                        )
                        RETURNING
                        id,
                        resident_id,
                        vendor_id,
                        service,
                        sub_service,
                        message,
                        status,
                        created_at
                `,
                [
                    residentId,
                    vendorId,
                    service,
                    subService,
                    message
                ]
            );

        const serviceRequest =
            insertedResult.rows[0];

        /*
         * Start the resident confirmation push immediately.
         * It runs at the same time as the vendor notification work.
         */
        const residentPushPromise =
            notifyResidentRequestReceived(
                serviceRequest.id
            )
                .catch((error) => {
                    console.error(
                        "[APNs] Request received " +
                        "notification failed:",
                        error
                    );

                    return {
                        attempted: 0,
                        sent: 0,
                        failed: 1,
                        results: []
                    };
                });

        const [
            deviceResult,
            countResult
        ] = await Promise.all([
            pool.query(
                `
                    SELECT
                        id,
                        device_token,
                        apns_environment

                    FROM hoa_vendor_devices

                    WHERE vendor_id = $1
                      AND active = TRUE
                `,
                [vendorId]
            ),
            pool.query(
                `
                    SELECT
                        COUNT(*)::integer
                            AS new_count

                    FROM hoa_service_requests

                    WHERE vendor_id = $1
                      AND status = 'new'
                `,
                [vendorId]
            )
        ]);

        const newCount =
            countResult.rows[0]
                ?.new_count || 1;

        const notificationTitle =
            `New ${service} Request`;

        const notificationBody =
            subService
                ? `A resident requested ` +
                `${subService}. Tap to view ` +
                `the request.`
                : "A resident sent a new " +
                "service request. Tap to " +
                "view it.";

        const vendorPushResults =
            await Promise.all(
                deviceResult.rows.map(
                    async (device) => {
                        const result =
                            await sendVendorPush({
                                deviceToken:
                                device
                                    .device_token,
                                environment:
                                device
                                    .apns_environment,
                                title:
                                notificationTitle,
                                body:
                                notificationBody,
                                requestId:
                                serviceRequest.id,
                                vendorId,
                                badge:
                                newCount
                            });

                        if (
                            result.deactivateToken
                        ) {
                            await pool.query(
                                `
                                    UPDATE
                                        hoa_vendor_devices

                                    SET
                                        active = FALSE,
                                        updated_at = NOW()

                                    WHERE id = $1
                                `,
                                [device.id]
                            );
                        }

                        if (!result.success) {
                            console.error(
                                "APNs vendor " +
                                "delivery failed:",
                                {
                                    vendorId,
                                    deviceId:
                                    device.id,
                                    status:
                                    result.status,
                                    reason:
                                    result.reason
                                }
                            );
                        }

                        return result;
                    }
                )
            );

        const vendorSentCount =
            vendorPushResults.filter(
                (result) =>
                    result.success
            ).length;

        const residentPushSummary =
            await residentPushPromise;

        return res.status(201).json({
            success: true,
            request_id:
                String(serviceRequest.id),
            request:
            serviceRequest,

            notification_sent:
                vendorSentCount > 0,
            notification_sent_count:
            vendorSentCount,

            resident_notification_sent:
                residentPushSummary.sent > 0,
            resident_notification_sent_count:
            residentPushSummary.sent,

            message:
                `Your request was sent to ` +
                `${account.company_name}.`
        });
    } catch (error) {
        console.error(
            "submitServiceRequest error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                "Unable to submit the service request."
        });
    }
};

/*
 * GET
 * /api/residents/:residentId/service-requests
 *
 * Returns the resident's newest service requests,
 * including the current vendor status.
 */
exports.getResidentServiceRequests = async (
    req,
    res
) => {
    const residentId =
        positiveInteger(
            req.params.residentId
        );

    const limit = Math.min(
        Math.max(
            Number.parseInt(
                req.query.limit,
                10
            ) || 20,
            1
        ),
        50
    );

    if (!residentId) {
        return res.status(400).json({
            success: false,
            error:
                "A valid resident ID is required."
        });
    }

    try {
        const residentResult =
            await pool.query(
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
                error:
                    "Resident not found."
            });
        }

        const [
            requestsResult,
            countResult
        ] = await Promise.all([
            pool.query(
                `
                    SELECT
                        sr.id::text AS id,
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

                        v.company_name
                            AS vendor_company_name,

                        v.category
                            AS vendor_category,

                        v.logo_url
                            AS vendor_logo_url

                    FROM hoa_service_requests sr

                    JOIN hoa_vendors v
                      ON v.id = sr.vendor_id

                    WHERE sr.resident_id = $1

                    ORDER BY
                        sr.created_at DESC

                    LIMIT $2
                `,
                [
                    residentId,
                    limit
                ]
            ),
            pool.query(
                `
                    SELECT
                        COUNT(*)::integer
                            AS total_count

                    FROM hoa_service_requests

                    WHERE resident_id = $1
                `,
                [residentId]
            )
        ]);

        return res.json({
            success: true,
            requests:
            requestsResult.rows,
            total_count:
                countResult.rows[0]
                    ?.total_count || 0
        });
    } catch (error) {
        console.error(
            "getResidentServiceRequests error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                "Unable to load service requests."
        });
    }
};
