const pool = require('../db/db');

const {
    sendVendorPush
} = require('../services/apnsService');

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
            req.body.service || ''
        ).trim();

    const subService =
        String(
            req.body.sub_service || ''
        ).trim();

    const message =
        String(
            req.body.message || ''
        ).trim();

    if (!residentId) {
        return res.status(400).json({
            success: false,
            error:
                'A valid resident ID is required.'
        });
    }

    if (!vendorId) {
        return res.status(400).json({
            success: false,
            error:
                'A valid vendor ID is required.'
        });
    }

    if (!service) {
        return res.status(400).json({
            success: false,
            error: 'A service is required.'
        });
    }

    if (!message) {
        return res.status(400).json({
            success: false,
            error: 'A message is required.'
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
                    'The resident or selected vendor could not be found.'
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
                ? `A resident requested ${subService}. Tap to view the request.`
                : 'A resident sent a new service request. Tap to view it.';

        const pushResults =
            await Promise.all(
                deviceResult.rows.map(
                    async (device) => {
                        const result =
                            await sendVendorPush({
                                deviceToken:
                                device.device_token,
                                environment:
                                device.apns_environment,
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
                                'APNs delivery failed:',
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

        const sentCount =
            pushResults.filter(
                (result) =>
                    result.success
            ).length;

        return res.status(201).json({
            success: true,
            request_id:
                String(serviceRequest.id),
            request: serviceRequest,
            notification_sent:
                sentCount > 0,
            notification_sent_count:
            sentCount,
            message:
                `Your request was sent to ${account.company_name}.`
        });
    } catch (error) {
        console.error(
            'submitServiceRequest error:',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                'Unable to submit the service request.'
        });
    }
};
