// controllers/hoaBoardMemberController.js

"use strict";

const pool =
    require("../db/db");

const cloudinary =
    require("cloudinary").v2;

const notificationService =
    require(
        "../services/notificationService"
    );


/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function isPositiveInteger(
    value
) {

    const parsed =
        Number(value);

    return (
        Number.isInteger(parsed) &&
        parsed > 0
    );
}


function cleanString(
    value
) {

    return String(
        value ?? ""
    ).trim();
}


/*
 * The EventsView currently sends raw JPEG Base64.
 *
 * Cloudinary wants either:
 *
 * data:image/jpeg;base64,...
 *
 * or another uploadable source.
 *
 * This supports both raw Base64 and an already-complete
 * data URI.
 */
function normalizeImageBase64(
    value
) {

    const cleanValue =
        cleanString(value);


    if (!cleanValue) {
        return "";
    }


    if (
        cleanValue.startsWith(
            "data:image/"
        )
    ) {

        return cleanValue;
    }


    return (
        "data:image/jpeg;base64," +
        cleanValue
    );
}


/*
 * =========================================================
 * HOA BOARD AUTHORIZATION
 * =========================================================
 *
 * HOA board members remain rows in hoa_residents.
 *
 * They are authorized when:
 *
 *     board_of_directors = TRUE
 *
 * Their neighborhood ALWAYS comes from hoa_residents.
 * Never accept neighborhood_id from the mobile client.
 */

async function getAuthorizedHoaMember(
    residentId,
    db = pool
) {

    if (
        !isPositiveInteger(
            residentId
        )
    ) {

        return null;
    }


    const result =
        await db.query(
            `
                SELECT
                    r.id,
                    r.first_name,
                    r.last_name,
                    r.phone,

                    r.neighborhood_id,

                    r.board_of_directors,

                    n.name
                        AS neighborhood_name,

                    n.city,

                    n.state

                FROM hoa_residents r

                INNER JOIN hoa_neighborhoods n
                    ON n.id =
                       r.neighborhood_id

                WHERE
                    r.id = $1

                    AND r.board_of_directors =
                        TRUE

                LIMIT 1
            `,
            [
                Number(
                    residentId
                )
            ]
        );


    return (
        result.rows[0] ||
        null
    );
}


/*
 * =========================================================
 * GET HOA BOARD EVENTS
 * =========================================================
 *
 * GET
 *
 * /api/hoaBoardMembers/:residentId/events
 *
 * Returns the events for the board member's neighborhood.
 */

exports.getEvents =
    async (req, res) => {

        try {

            const residentId =
                Number(
                    req.params.residentId
                );


            if (
                !isPositiveInteger(
                    residentId
                )
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Invalid resident ID."
                    });
            }


            const hoaMember =
                await getAuthorizedHoaMember(
                    residentId
                );


            if (!hoaMember) {

                return res
                    .status(403)
                    .json({
                        success: false,
                        error:
                            "HOA board access is required."
                    });
            }


            const result =
                await pool.query(
                    `
                    SELECT
                        e.id::INTEGER AS id,

                        e.title,

                        e.neighborhood_id,

                        n.name
                            AS neighborhood_name,

                        n.city,

                        n.state,

                        e.address,

                        e.starts_at,

                        e.ends_at,

                        e.status,

                        e.signup_label,

                        e.description,

                        e.image_url,

                        e.created_by_resident_id,

                        e.published_at,

                        e.created_at,

                        e.updated_at

                    FROM hoa_events e

                    INNER JOIN hoa_neighborhoods n
                        ON n.id =
                           e.neighborhood_id

                    WHERE
                        e.neighborhood_id =
                        $1

                    ORDER BY
                        e.starts_at ASC,
                        e.id ASC
                `,
                    [
                        hoaMember
                            .neighborhood_id
                    ]
                );


            return res
                .status(200)
                .json({
                    success: true,

                    neighborhood: {
                        id:
                        hoaMember
                            .neighborhood_id,

                        name:
                        hoaMember
                            .neighborhood_name,

                        city:
                        hoaMember.city,

                        state:
                        hoaMember.state
                    },

                    events:
                    result.rows
                });

        } catch (error) {

            console.error(
                "[HOA Board] getEvents error:",
                error
            );


            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        "Could not load HOA events."
                });
        }
    };


/*
 * =========================================================
 * CREATE / PUBLISH HOA EVENT
 * =========================================================
 *
 * POST
 *
 * /api/hoaBoardMembers/:residentId/events
 *
 *
 * Expected body:
 *
 * {
 *     title,
 *     description,
 *     address,
 *     starts_at,
 *     ends_at,
 *     image_base64,
 *     publish
 * }
 */

exports.createEvent =
    async (req, res) => {

        let client =
            null;

        let uploadedImageURL =
            null;

        let uploadedImagePublicId =
            null;

        let committed =
            false;


        try {

            const residentId =
                Number(
                    req.params.residentId
                );


            /*
             * ---------------------------------------------
             * Validate resident ID
             * ---------------------------------------------
             */

            if (
                !isPositiveInteger(
                    residentId
                )
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Invalid resident ID."
                    });
            }


            /*
             * ---------------------------------------------
             * Confirm actual HOA board membership
             * ---------------------------------------------
             */

            const hoaMember =
                await getAuthorizedHoaMember(
                    residentId
                );


            if (!hoaMember) {

                return res
                    .status(403)
                    .json({
                        success: false,
                        error:
                            "HOA board access is required."
                    });
            }


            /*
             * ---------------------------------------------
             * Read request
             * ---------------------------------------------
             */

            const body =
                req.body || {};


            const title =
                cleanString(
                    body.title
                );


            const description =
                cleanString(
                    body.description
                );


            const address =
                cleanString(
                    body.address
                );


            const startsAtRaw =
                cleanString(
                    body.starts_at ??
                    body.startsAt
                );


            const endsAtRaw =
                cleanString(
                    body.ends_at ??
                    body.endsAt
                );


            const imageBase64 =
                normalizeImageBase64(
                    body.image_base64 ??
                    body.imageBase64
                );


            /*
             * Your current Swift screen publishes immediately.
             *
             * Keeping this here makes it easy to add
             * "Save Draft" later.
             */
            const shouldPublish =
                body.publish !== false;


            /*
             * ---------------------------------------------
             * Validate event content
             * ---------------------------------------------
             */

            if (!title) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Event title is required."
                    });
            }


            if (!description) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Event description is required."
                    });
            }


            if (!startsAtRaw) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Event start date and time are required."
                    });
            }


            const startsAt =
                new Date(
                    startsAtRaw
                );


            const endsAt =
                endsAtRaw
                    ? new Date(
                        endsAtRaw
                    )
                    : null;


            if (
                Number.isNaN(
                    startsAt.getTime()
                )
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Invalid event start date."
                    });
            }


            if (
                endsAt &&
                Number.isNaN(
                    endsAt.getTime()
                )
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Invalid event end date."
                    });
            }


            if (
                endsAt &&
                endsAt <= startsAt
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Event end time must be after the start time."
                    });
            }


            /*
             * ---------------------------------------------
             * Upload optional event image
             * ---------------------------------------------
             */

            if (imageBase64) {

                const uploadResult =
                    await cloudinary
                        .uploader
                        .upload(
                            imageBase64,
                            {
                                folder:
                                    "clubhouse_hoa_events",

                                resource_type:
                                    "image"
                            }
                        );


                uploadedImageURL =
                    uploadResult
                        .secure_url;


                uploadedImagePublicId =
                    uploadResult
                        .public_id;
            }


            /*
             * ---------------------------------------------
             * Insert event
             * ---------------------------------------------
             */

            client =
                await pool.connect();


            await client.query(
                "BEGIN"
            );


            /*
             * Do NOT use neighborhood_id from req.body.
             *
             * This comes directly from the authorized
             * resident's account.
             */
            const neighborhoodId =
                Number(
                    hoaMember
                        .neighborhood_id
                );


            const eventStatus =
                shouldPublish
                    ? "published"
                    : "draft";


            const insertResult =
                await client.query(
                    `
                    INSERT INTO hoa_events
                    (
                        neighborhood_id,

                        created_by_resident_id,

                        title,

                        description,

                        address,

                        starts_at,

                        ends_at,

                        image_url,

                        image_public_id,

                        status,

                        signup_label,

                        published_at,

                        created_at,

                        updated_at
                    )

                    VALUES
                    (
                        $1,

                        $2,

                        $3,

                        $4,

                        $5,

                        $6,

                        $7,

                        $8,

                        $9,

                        $10,

                        $11,

                        CASE
                            WHEN $10 = 'published'
                                THEN NOW()
                            ELSE NULL
                        END,

                        NOW(),

                        NOW()
                    )

                        RETURNING
    id::INTEGER AS id,

                        neighborhood_id,

                        created_by_resident_id,

                        title,

                        description,

                        address,

                        starts_at,

                        ends_at,

                        image_url,

                        status,

                        signup_label,

                        published_at,

                        created_at,

                        updated_at
                `,
                    [
                        neighborhoodId,

                        hoaMember.id,

                        title,

                        description,

                        address ||
                        null,

                        startsAt,

                        endsAt,

                        uploadedImageURL,

                        uploadedImagePublicId,

                        eventStatus,

                        "HOA Event"
                    ]
                );


            const savedEvent =
                insertResult.rows[0];


            await client.query(
                "COMMIT"
            );


            committed =
                true;


            /*
             * ---------------------------------------------
             * Build Swift-friendly event response
             * ---------------------------------------------
             *
             * NeighborhoodEvent.swift expects:
             *
             * neighborhood_name
             * city
             * state
             *
             * in addition to the hoa_events fields.
             */

            const event = {

                ...savedEvent,

                neighborhood_name:
                hoaMember
                    .neighborhood_name,

                city:
                hoaMember.city,

                state:
                hoaMember.state
            };


            /*
             * ---------------------------------------------
             * Notify neighborhood
             * ---------------------------------------------
             *
             * IMPORTANT:
             *
             * The event has already committed.
             *
             * Notification failure must NOT cause the
             * endpoint to report that event creation failed.
             */

            let notificationResult =
                null;


            if (shouldPublish) {

                try {

                    notificationResult =
                        await notificationService
                            .notifyHoaEventPublished({
                                eventId:
                                event.id,

                                neighborhoodId,

                                neighborhoodName:
                                hoaMember
                                    .neighborhood_name,

                                boardResidentId:
                                hoaMember.id,

                                title:
                                event.title,

                                startsAt:
                                event.starts_at
                            });


                    console.log(
                        "[HOA Event] Notification result:",
                        notificationResult
                    );

                } catch (
                    notificationError
                    ) {

                    console.error(
                        "[HOA Event] Push notification failed:",
                        notificationError
                    );
                }
            }


            console.log(
                "[HOA Event] Event created:",
                {
                    eventId:
                    event.id,

                    createdBy:
                    hoaMember.id,

                    neighborhoodId,

                    neighborhood:
                    hoaMember
                        .neighborhood_name,

                    title:
                    event.title,

                    status:
                    event.status
                }
            );


            /*
             * ---------------------------------------------
             * Success
             * ---------------------------------------------
             */

            return res
                .status(201)
                .json({
                    success: true,

                    event,

                    notification:
                    notificationResult,

                    message:
                        shouldPublish
                            ? "Event published successfully."
                            : "Event draft saved successfully."
                });


        } catch (error) {

            /*
             * ---------------------------------------------
             * Roll back DB transaction
             * ---------------------------------------------
             */

            if (
                client &&
                !committed
            ) {

                try {

                    await client.query(
                        "ROLLBACK"
                    );

                } catch (
                    rollbackError
                    ) {

                    console.error(
                        "[HOA Event] Rollback failed:",
                        rollbackError
                    );
                }
            }


            /*
             * ---------------------------------------------
             * Remove orphaned Cloudinary photo
             * ---------------------------------------------
             *
             * If the photo uploaded successfully but the
             * database INSERT failed, don't leave the photo
             * sitting in Cloudinary.
             */

            if (
                uploadedImagePublicId &&
                !committed
            ) {

                try {

                    await cloudinary
                        .uploader
                        .destroy(
                            uploadedImagePublicId
                        );

                } catch (
                    cleanupError
                    ) {

                    console.error(
                        "[HOA Event] Cloudinary cleanup failed:",
                        cleanupError
                    );
                }
            }


            console.error(
                "[HOA Board] createEvent error:",
                error
            );


            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        "Could not create the HOA event."
                });

        } finally {

            if (client) {

                client.release();
            }
        }
    };