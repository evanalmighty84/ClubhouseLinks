const pool = require('../db/db');


// ============================================================
// NEXTDOOR SEARCH CARRYOVER / RESUME QUEUE
// ============================================================

const NEXTDOOR_SEARCH_QUEUE_TABLE =
    'nextdoor_search_carryover';


async function ensureNextdoorSearchQueueTable(client = pool) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS ${NEXTDOOR_SEARCH_QUEUE_TABLE} (
            id BIGSERIAL PRIMARY KEY,

            scraper_key TEXT NOT NULL,
            scraper_name TEXT NOT NULL,

            search_term TEXT NOT NULL,
            term_source TEXT,

            position INTEGER NOT NULL DEFAULT 0,

            originating_run_id TEXT,

            throttle_term TEXT,
            throttle_wait_seconds INTEGER,

            queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            UNIQUE (scraper_key, search_term)
        );
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS
            idx_nextdoor_search_carryover_scraper_position
        ON ${NEXTDOOR_SEARCH_QUEUE_TABLE}
            (scraper_key, position);
    `);
}


function normalizeScraperKey(value = '') {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
}


function normalizeSearchTermEntry(entry, index = 0) {
    /*
     * Accept either:
     *
     * "window replacement"
     *
     * OR:
     *
     * {
     *     query: "window replacement",
     *     source: "fixed"
     * }
     *
     * OR:
     *
     * {
     *     search_term: "window replacement",
     *     term_source: "fixed"
     * }
     */

    if (typeof entry === 'string') {
        const query = entry.trim();

        if (!query) {
            return null;
        }

        return {
            query,
            source: null,
            position: index,
        };
    }


    if (!entry || typeof entry !== 'object') {
        return null;
    }


    const query = String(
        entry.query ||
        entry.search_term ||
        ''
    ).trim();


    if (!query) {
        return null;
    }


    const rawSource =
        entry.source ||
        entry.term_source ||
        null;


    return {
        query,
        source:
            rawSource === null ||
            rawSource === undefined
                ? null
                : String(rawSource).trim() || null,

        position: index,
    };
}


// ============================================================
// EXISTING NEXTDOOR LEADS ENDPOINT
// ============================================================

exports.getNextDoorLeads = async (req, res) => {
    const { userId } = req.params;

    try {
        // 1️⃣ Get user's industries
        const userResult = await pool.query(
            'SELECT industry FROM users WHERE id = $1',
            [userId]
        );

        const industryArray =
            userResult.rows[0]?.industry || [];

        const normalizedIndustries =
            industryArray.map((s) =>
                String(s).toLowerCase()
            );


        // 2️⃣ Always join familytreenow for enrichment
        const sql = `
            SELECT
                nm.id,
                nm.author,
                nm.location,
                nm.city,
                nm.lead_type,

                COALESCE(
                    ftn.phone,
                    NULL
                ) AS phone,

                COALESCE(
                    ftn.physical_address,
                    NULL
                ) AS physical_address,

                COALESCE(
                    ftn.description,
                    nm.description
                ) AS description,

                nm.timestamp,
                nm.state,
                ftn.company_name,
                ftn.professionalnumbertocall,
                ftn.phones AS enriched_phones,

                CASE
                    WHEN ftn.phone IS NOT NULL
                    THEN TRUE
                    ELSE FALSE
                END AS enriched

            FROM nextdoor_messages nm

            LEFT JOIN familytreenow ftn
                ON ftn.lead_id = nm.id

            WHERE
                array_length(
                    $1::text[],
                    1
                ) IS NULL

                OR EXISTS (
                    SELECT 1
                    FROM unnest(
                        $1::text[]
                    ) AS i

                    WHERE LOWER(
                        nm.lead_type
                    ) LIKE '%' || i || '%'
                )

            ORDER BY
                nm.timestamp DESC;
        `;


        const { rows } =
            await pool.query(
                sql,
                [normalizedIndustries]
            );


        console.log(
            `✅ Found ${rows.length} enriched leads ` +
            `(joined with familytreenow) for user ${userId}`
        );


        res.json(rows);

    } catch (err) {
        console.error(
            '❌ Error fetching Nextdoor leads:',
            err
        );

        res.status(500).json({
            error: 'Failed to fetch leads'
        });
    }
};


// ============================================================
// GET CARRYOVER SEARCH TERMS
//
// GET /nextdoor/search-queue/:scraperKey
//
// Called when a scraper starts.
//
// These terms are searches that a PREVIOUS run did not reach
// because Nextdoor throttled the scraper.
//
// Important:
// A term returning zero results is NOT stored here.
// ============================================================

exports.getNextdoorSearchQueue = async (req, res) => {
    const scraperKey =
        normalizeScraperKey(
            req.params.scraperKey
        );


    if (!scraperKey) {
        return res.status(400).json({
            success: false,
            error: 'scraperKey is required'
        });
    }


    try {
        await ensureNextdoorSearchQueueTable();


        const { rows } = await pool.query(
            `
                SELECT
                    scraper_key,
                    scraper_name,
                    search_term,
                    term_source,
                    position,
                    originating_run_id,
                    throttle_term,
                    throttle_wait_seconds,
                    queued_at

                FROM ${NEXTDOOR_SEARCH_QUEUE_TABLE}

                WHERE scraper_key = $1

                ORDER BY
                    position ASC,
                    queued_at ASC
            `,
            [scraperKey]
        );


        const pendingTerms =
            rows.map((row) => ({
                query: row.search_term,
                source:
                    row.term_source ||
                    'carryover'
            }));


        console.log(
            `♻️ Nextdoor queue lookup: ` +
            `${scraperKey} → ` +
            `${pendingTerms.length} unfinished term(s)`
        );


        return res.json({
            success: true,

            scraper_key:
            scraperKey,

            scraper_name:
                rows[0]?.scraper_name ||
                null,

            pending_count:
            pendingTerms.length,

            pending_terms:
            pendingTerms,

            queue_metadata:
                rows.length
                    ? {
                        originating_run_id:
                        rows[0]
                            .originating_run_id,

                        throttle_term:
                        rows[0]
                            .throttle_term,

                        throttle_wait_seconds:
                        rows[0]
                            .throttle_wait_seconds,

                        queued_at:
                        rows[0]
                            .queued_at
                    }
                    : null
        });

    } catch (err) {
        console.error(
            `❌ Error loading Nextdoor search queue ` +
            `for ${scraperKey}:`,
            err
        );


        return res.status(500).json({
            success: false,
            error:
                'Failed to load Nextdoor search queue'
        });
    }
};


// ============================================================
// SAVE REMAINING TERMS AFTER THROTTLE
//
// POST /nextdoor/search-queue/throttled
//
// Payload example:
//
// {
//     "scraper_key": "specialty",
//     "scraper_name":
//         "Realtor Bookkeeping Lighting Misc Scraper",
//     "run_id": "abc-123",
//     "throttled_term": "windows",
//     "wait_seconds": 3600,
//     "remaining_terms": [
//         {
//             "query": "windows",
//             "source": "fixed"
//         },
//         {
//             "query": "door repair",
//             "source": "fixed"
//         }
//     ]
// }
//
// IMPORTANT:
// remaining_terms should begin with the term that actually
// encountered the throttle.
//
// Heroku REPLACES the previous unfinished queue for this
// scraper with this new snapshot.
// ============================================================

exports.saveNextdoorThrottleQueue = async (req, res) => {
    const {
        scraper_key,
        scraper_name,
        run_id,
        throttled_term,
        wait_seconds,
        remaining_terms
    } = req.body || {};


    const scraperKey =
        normalizeScraperKey(
            scraper_key
        );


    const scraperName =
        String(
            scraper_name ||
            scraperKey ||
            ''
        ).trim();


    if (!scraperKey) {
        return res.status(400).json({
            success: false,
            error: 'scraper_key is required'
        });
    }


    if (!scraperName) {
        return res.status(400).json({
            success: false,
            error: 'scraper_name is required'
        });
    }


    if (!Array.isArray(remaining_terms)) {
        return res.status(400).json({
            success: false,
            error:
                'remaining_terms must be an array'
        });
    }


    /*
     * Normalize and de-duplicate terms.
     *
     * We intentionally do NOT look at result counts here.
     *
     * Heroku only knows:
     *
     *     "These searches were unfinished because the
     *      scraper was interrupted."
     */

    const seen = new Set();

    const normalizedTerms = [];


    for (
        let index = 0;
        index < remaining_terms.length;
        index += 1
    ) {
        const normalized =
            normalizeSearchTermEntry(
                remaining_terms[index],
                index
            );


        if (!normalized) {
            continue;
        }


        const key =
            normalized.query
                .trim()
                .toLowerCase();


        if (seen.has(key)) {
            continue;
        }


        seen.add(key);


        normalizedTerms.push({
            ...normalized,
            position:
            normalizedTerms.length
        });
    }


    const client =
        await pool.connect();


    try {
        await client.query('BEGIN');


        await ensureNextdoorSearchQueueTable(
            client
        );


        /*
         * This is intentionally a full replacement.
         *
         * The scraper sends the authoritative list of
         * everything that remains from THIS execution plan.
         */

        await client.query(
            `
                DELETE FROM
                    ${NEXTDOOR_SEARCH_QUEUE_TABLE}

                WHERE scraper_key = $1
            `,
            [scraperKey]
        );


        for (
            const term of normalizedTerms
            ) {
            await client.query(
                `
                    INSERT INTO
                        ${NEXTDOOR_SEARCH_QUEUE_TABLE}
                    (
                        scraper_key,
                        scraper_name,
                        search_term,
                        term_source,
                        position,
                        originating_run_id,
                        throttle_term,
                        throttle_wait_seconds,
                        queued_at
                    )

                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        NOW()
                    )

                    ON CONFLICT (
                        scraper_key,
                        search_term
                    )

                    DO UPDATE SET
                        scraper_name =
                            EXCLUDED.scraper_name,

                        term_source =
                            EXCLUDED.term_source,

                        position =
                            EXCLUDED.position,

                        originating_run_id =
                            EXCLUDED.originating_run_id,

                        throttle_term =
                            EXCLUDED.throttle_term,

                        throttle_wait_seconds =
                            EXCLUDED.throttle_wait_seconds,

                        queued_at =
                            NOW()
                `,
                [
                    scraperKey,
                    scraperName,
                    term.query,
                    term.source,
                    term.position,
                    run_id
                        ? String(run_id)
                        : null,
                    throttled_term
                        ? String(
                            throttled_term
                        )
                        : null,
                    Number.isFinite(
                        Number(wait_seconds)
                    )
                        ? Number(
                            wait_seconds
                        )
                        : null
                ]
            );
        }


        await client.query('COMMIT');


        console.log(
            `⛔ Saved Nextdoor throttle carryover: ` +
            `${scraperName} (${scraperKey}) → ` +
            `${normalizedTerms.length} unfinished term(s)` +
            `${
                throttled_term
                    ? ` | throttle term: "${throttled_term}"`
                    : ''
            }` +
            `${
                wait_seconds
                    ? ` | wait: ${wait_seconds}s`
                    : ''
            }`
        );


        return res.json({
            success: true,

            status:
                'carryover_saved',

            scraper_key:
            scraperKey,

            scraper_name:
            scraperName,

            originating_run_id:
                run_id || null,

            throttled_term:
                throttled_term || null,

            throttle_wait_seconds:
                Number.isFinite(
                    Number(wait_seconds)
                )
                    ? Number(wait_seconds)
                    : null,

            pending_count:
            normalizedTerms.length,

            pending_terms:
                normalizedTerms.map(
                    (term) => ({
                        query:
                        term.query,

                        source:
                        term.source
                    })
                )
        });

    } catch (err) {
        await client
            .query('ROLLBACK')
            .catch(() => {});


        console.error(
            `❌ Error saving Nextdoor throttle queue ` +
            `for ${scraperKey}:`,
            err
        );


        return res.status(500).json({
            success: false,
            error:
                'Failed to save Nextdoor throttle queue'
        });

    } finally {
        client.release();
    }
};


// ============================================================
// CLEAR CARRYOVER AFTER FULL SUCCESSFUL RUN
//
// POST /nextdoor/search-queue/completed
//
// {
//     "scraper_key": "specialty",
//     "run_id": "abc-123"
// }
//
// We only clear the queue after the scraper says the complete
// execution plan finished.
//
// Individual searches returning zero results do NOT matter.
// ============================================================

exports.completeNextdoorSearchQueue = async (req, res) => {
    const {
        scraper_key,
        run_id
    } = req.body || {};


    const scraperKey =
        normalizeScraperKey(
            scraper_key
        );


    if (!scraperKey) {
        return res.status(400).json({
            success: false,
            error: 'scraper_key is required'
        });
    }


    try {
        await ensureNextdoorSearchQueueTable();


        const result =
            await pool.query(
                `
                    DELETE FROM
                        ${NEXTDOOR_SEARCH_QUEUE_TABLE}

                    WHERE scraper_key = $1
                `,
                [scraperKey]
            );


        console.log(
            `✅ Cleared Nextdoor carryover queue: ` +
            `${scraperKey} → ` +
            `${result.rowCount} term(s) removed` +
            `${
                run_id
                    ? ` | completed run: ${run_id}`
                    : ''
            }`
        );


        return res.json({
            success: true,

            status:
                'queue_cleared',

            scraper_key:
            scraperKey,

            completed_run_id:
                run_id || null,

            cleared_count:
            result.rowCount
        });

    } catch (err) {
        console.error(
            `❌ Error clearing Nextdoor search queue ` +
            `for ${scraperKey}:`,
            err
        );


        return res.status(500).json({
            success: false,
            error:
                'Failed to clear Nextdoor search queue'
        });
    }
};