"use strict";

const pool =
    require("../db/db");

const {
    sendResidentPush
} =
    require("./apnsService");


    require("./apnsService");
async function notifyHoaEventPublished({
                                           eventId,
                                           neighborhoodId,
                                           neighborhoodName,
                                           boardResidentId,
                                           title,
                                           startsAt
                                       }) {

    const cleanEventId =
        Number(eventId);

    const cleanNeighborhoodId =
        Number(
            neighborhoodId
        );


    if (
        !Number.isInteger(
            cleanEventId
        ) ||
        cleanEventId <= 0
    ) {

        throw new Error(
            "Invalid eventId."
        );
    }


    if (
        !Number.isInteger(
            cleanNeighborhoodId
        ) ||
        cleanNeighborhoodId <= 0
    ) {

        throw new Error(
            "Invalid neighborhoodId."
        );
    }


    /*
     * Every real active resident device
     * in this neighborhood.
     *
     * Support devices are excluded.
     */
    const result =
        await pool.query(
            `
                SELECT DISTINCT ON (
                    d.device_token
                )

                    d.id
                        AS device_id,

                    d.resident_id,

                    d.device_token,

                    COALESCE(
                        NULLIF(
                            BTRIM(
                                d.environment
                            ),
                            ''
                        ),
                        'production'
                    )
                        AS environment

                FROM hoa_resident_devices d

                INNER JOIN hoa_residents r
                    ON r.id =
                       d.resident_id

                WHERE
                    r.neighborhood_id =
                    $1

                    AND d.active =
                        TRUE

                    AND d.device_token
                        IS NOT NULL

                    AND BTRIM(
                        d.device_token
                    ) <> ''

                    AND COALESCE(
                        d.is_support_device,
                        FALSE
                    ) = FALSE

                ORDER BY
                    d.device_token,
                    d.updated_at DESC
            `,
            [
                cleanNeighborhoodId
            ]
        );


    const devices =
        result.rows;


    const safeNeighborhoodName =
        String(
            neighborhoodName ||
            "Your Neighborhood"
        ).trim();


    const safeTitle =
        String(
            title ||
            "Neighborhood Event"
        ).trim();


    const notificationTitle =
        `New Event in ${safeNeighborhoodName}`;


    const notificationBody =
        `Your HOA posted "${safeTitle}". ` +
        `Tap to view the event details.`;


    const summary = {
        attempted:
        devices.length,

        sent: 0,

        failed: 0
    };


    for (
        const device
        of devices
        ) {

        try {

            const pushResult =
                await sendResidentPush({

                    deviceToken:
                    device.device_token,

                    environment:
                    device.environment,

                    title:
                    notificationTitle,

                    body:
                    notificationBody,

                    residentId:
                    device.resident_id,

                    notificationType:
                        "hoa_event_published",

                    customData: {

                        event_id:
                            String(
                                cleanEventId
                            ),

                        neighborhood_id:
                            String(
                                cleanNeighborhoodId
                            )
                    }
                });


            if (
                pushResult.success
            ) {

                summary.sent += 1;

            } else {

                summary.failed += 1;


                console.error(
                    "[HOA Event Push] Failed:",
                    {
                        residentId:
                        device
                            .resident_id,

                        eventId:
                        cleanEventId,

                        result:
                        pushResult
                    }
                );


                if (
                    pushResult
                        .deactivateToken
                ) {

                    await pool.query(
                        `
                            UPDATE
                                hoa_resident_devices

                            SET
                                active =
                                    FALSE,

                                updated_at =
                                    NOW()

                            WHERE id =
                                $1
                        `,
                        [
                            device
                                .device_id
                        ]
                    );
                }
            }

        } catch (error) {

            summary.failed += 1;


            console.error(
                "[HOA Event Push] Error:",
                {
                    residentId:
                    device
                        .resident_id,

                    eventId:
                    cleanEventId,

                    error:
                    error.message
                }
            );
        }
    }


    console.log(
        `[HOA Event Push] Event ${cleanEventId}:`,
        summary
    );


    return summary;
}


async function notifyCommunityJobCompleted({
                                               projectId,
                                               residentId,
                                               neighborhoodId,
                                               vendorId,
                                               vendorName,
                                               service
                                           }) {

    const cleanProjectId =
        Number(projectId);

    const cleanResidentId =
        Number(residentId);

    const cleanNeighborhoodId =
        Number(neighborhoodId);


    if (
        !Number.isInteger(cleanProjectId) ||
        cleanProjectId <= 0
    ) {
        throw new Error(
            "Invalid projectId."
        );
    }


    if (
        !Number.isInteger(cleanResidentId) ||
        cleanResidentId <= 0
    ) {
        throw new Error(
            "Invalid residentId."
        );
    }


    if (
        !Number.isInteger(
            cleanNeighborhoodId
        ) ||
        cleanNeighborhoodId <= 0
    ) {
        throw new Error(
            "Invalid neighborhoodId."
        );
    }


    /*
     * Find real resident devices in the same
     * neighborhood.
     *
     * Exclude:
     * - the resident who submitted the project
     * - Aspen/support-mode devices
     *
     * DISTINCT ON prevents the same physical
     * token from receiving the notification twice.
     */
    const result =
        await pool.query(
            `
                SELECT DISTINCT ON (
                    d.device_token
                )

                    d.id
                        AS device_id,

                    d.resident_id,

                    d.device_token,

                    COALESCE(
                        NULLIF(
                            BTRIM(
                                d.environment
                            ),
                            ''
                        ),
                        'production'
                    )
                        AS environment,

                    n.name
                        AS neighborhood_name

                FROM hoa_resident_devices d

                JOIN hoa_residents r
                    ON r.id =
                       d.resident_id

                JOIN hoa_neighborhoods n
                    ON n.id =
                       r.neighborhood_id

                WHERE
                    r.neighborhood_id = $1

                    AND r.id <> $2

                    AND d.active = TRUE

                    AND d.device_token
                        IS NOT NULL

                    AND BTRIM(
                        d.device_token
                    ) <> ''

                    AND COALESCE(
                        d.is_support_device,
                        FALSE
                    ) = FALSE

                ORDER BY
                    d.device_token,
                    d.updated_at DESC
            `,
            [
                cleanNeighborhoodId,
                cleanResidentId
            ]
        );


    const devices =
        result.rows;


    const neighborhoodName =
        devices[0]?.neighborhood_name ||
        "Your Neighborhood";


    const cleanVendorName =
        String(
            vendorName ||
            "A local professional"
        ).trim();


    const cleanService =
        String(
            service ||
            "home service"
        ).trim();


    const title =
        `New Project in ${neighborhoodName}`;


    const body =
        `${cleanVendorName} just completed ` +
        `a ${cleanService} project for one ` +
        `of your neighbors. Tap to see ` +
        `the finished work.`;


    console.log(
        `[Notifications] Project ${cleanProjectId}: ` +
        `${devices.length} neighborhood ` +
        `device(s) eligible.`
    );


    const summary = {
        attempted:
        devices.length,

        sent: 0,

        failed: 0
    };


    for (
        const device
        of devices
        ) {

        const pushResult =
            await sendResidentPush({

                deviceToken:
                device.device_token,

                environment:
                device.environment,

                title,

                body,

                residentId:
                device.resident_id,

                vendorId,

                notificationType:
                    "community_job_completed",

                customData: {

                    project_id:
                        String(
                            cleanProjectId
                        ),

                    neighborhood_id:
                        String(
                            cleanNeighborhoodId
                        ),

                    service:
                    cleanService
                }
            });


        if (pushResult.success) {

            summary.sent += 1;

            console.log(
                `[Notifications] Project ${cleanProjectId} ` +
                `sent to resident ` +
                `${device.resident_id}.`
            );

        } else {

            summary.failed += 1;

            console.error(
                `[Notifications] Project ${cleanProjectId} ` +
                `failed for resident ` +
                `${device.resident_id}:`,
                pushResult
            );


            /*
             * Your APNs service already tells us when
             * Apple considers the token permanently dead.
             */
            if (
                pushResult.deactivateToken
            ) {

                await pool.query(
                    `
                        UPDATE hoa_resident_devices

                        SET
                            active = FALSE,
                            updated_at = NOW()

                        WHERE id = $1
                    `,
                    [
                        device.device_id
                    ]
                );
            }
        }
    }


    console.log(
        "[Notifications] Community job summary:",
        summary
    );


    return summary;
}


module.exports = {
    notifyHoaEventPublished,
    notifyCommunityJobCompleted
};