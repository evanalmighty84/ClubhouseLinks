const pool = require('../db/db');

const MAX_LIMIT = 250;
const DEFAULT_LIMIT = 50;
const DEFAULT_MONTHS = 8;
const MAX_MONTHS = 24;
const DEFAULT_DAYS = 90;
const MAX_DAYS = 365;

const toInt = (value, fallback, min, max) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return fallback;

    const rounded = Math.floor(parsed);

    if (rounded < min) return min;
    if (rounded > max) return max;

    return rounded;
};

const cleanState = (value) => {
    const state = String(value || 'ALL').trim().toUpperCase();
    return state || 'ALL';
};

const cleanText = (value) => {
    const text = String(value || '').trim();
    return text || null;
};

const cleanLeadType = (value) => {
    const leadType = String(value || '').trim().toLowerCase();
    return leadType || null;
};

const addParam = (params, value) => {
    params.push(value);
    return `$${params.length}`;
};

const buildNextdoorWhere = (query = {}, options = {}) => {
    const params = [];
    const where = [];

    const state = cleanState(query.state);
    const city = cleanText(query.city);
    const leadType = cleanLeadType(query.lead_type || query.industry);
    const days = toInt(query.days, options.defaultDays || DEFAULT_DAYS, 1, MAX_DAYS);
    const includeDateFilter = options.includeDateFilter !== false;

    if (state !== 'ALL') {
        where.push(`UPPER(TRIM(n.state)) = ${addParam(params, state)}`);
    }

    if (city) {
        where.push(`LOWER(TRIM(n.city)) = LOWER(TRIM(${addParam(params, city)}))`);
    }

    if (leadType) {
        where.push(`EXISTS (
            SELECT 1
            FROM unnest(string_to_array(LOWER(COALESCE(n.lead_type, '')), ',')) AS item(value)
            WHERE TRIM(item.value) = ${addParam(params, leadType)}
        )`);
    }

    if (includeDateFilter) {
        where.push(`n.timestamp >= NOW() - make_interval(days => ${addParam(params, days)}::int)`);
    }

    return {
        params,
        whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
        days,
        state,
        city,
        leadType,
    };
};

const buildFamilyTreeWhere = (query = {}, options = {}) => {
    const params = [];
    const where = [];

    const state = cleanState(query.state);
    const city = cleanText(query.city);
    const leadType = cleanLeadType(query.lead_type || query.industry);
    const months = toInt(query.months, options.defaultMonths || DEFAULT_MONTHS, 1, MAX_MONTHS);
    const leadSentOnly = options.leadSentOnly !== false;
    const includeDateFilter = options.includeDateFilter !== false;

    if (leadSentOnly) {
        where.push('f.lead_sent = TRUE');
    }

    if (state !== 'ALL') {
        where.push(`UPPER(TRIM(f.state)) = ${addParam(params, state)}`);
    }

    if (city) {
        where.push(`LOWER(TRIM(f.city)) = LOWER(TRIM(${addParam(params, city)}))`);
    }

    if (leadType) {
        where.push(`EXISTS (
            SELECT 1
            FROM unnest(string_to_array(LOWER(COALESCE(f.lead_type, '')), ',')) AS item(value)
            WHERE TRIM(item.value) = ${addParam(params, leadType)}
        )`);
    }

    if (includeDateFilter) {
        where.push(`f.scraped_at >= NOW() - make_interval(months => ${addParam(params, months)}::int)`);
    }

    return {
        params,
        whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
        months,
        state,
        city,
        leadType,
    };
};

const getRows = (rows) => Array.isArray(rows) ? rows : [];

// =========================================================
// Main endpoint for ReportsMapPage
// GET /api/marketing/reports/leads?state=TX&months=8
// =========================================================
exports.getLeadReports = async (req, res) => {
    try {
        const selectedState = cleanState(req.query.state);
        const months = toInt(req.query.months, DEFAULT_MONTHS, 1, MAX_MONTHS);

        const ftWhere = buildFamilyTreeWhere(
            { ...req.query, state: selectedState, months },
            { defaultMonths: months, leadSentOnly: true, includeDateFilter: true }
        );

        const ndWhere = buildNextdoorWhere(
            { ...req.query, state: selectedState },
            { includeDateFilter: false }
        );

        const monthlyByLeadTypeQuery = `
            SELECT
                DATE_TRUNC('month', expanded.scraped_at)::date AS month,
                expanded.lead_type,
                COUNT(*)::int AS leads_sent
            FROM (
                SELECT
                    f.scraped_at,
                    TRIM(item.value) AS lead_type
                FROM familytreenow f
                CROSS JOIN LATERAL unnest(
                    string_to_array(LOWER(COALESCE(f.lead_type, '')), ',')
                ) AS item(value)
                ${ftWhere.whereSql}
            ) expanded
            WHERE expanded.lead_type <> ''
            GROUP BY DATE_TRUNC('month', expanded.scraped_at), expanded.lead_type
            ORDER BY month DESC, leads_sent DESC;
        `;

        const nextdoorLeadTypeCountQuery = `
            SELECT
                TRIM(item.value) AS lead_type,
                COUNT(*)::int AS lead_count
            FROM nextdoor_messages n
            CROSS JOIN LATERAL unnest(
                string_to_array(LOWER(COALESCE(n.lead_type, '')), ',')
            ) AS item(value)
            ${ndWhere.whereSql}
            GROUP BY TRIM(item.value)
            HAVING TRIM(item.value) <> ''
            ORDER BY lead_count DESC;
        `;

        let cityCountQuery = `
            SELECT
                INITCAP(TRIM(n.city)) AS city,
                COUNT(*)::int AS lead_count
            FROM nextdoor_messages n
            ${ndWhere.whereSql}
        `;

        if (ndWhere.whereSql) {
            cityCountQuery += `
                AND n.city IS NOT NULL
                AND TRIM(n.city) <> ''
            `;
        } else {
            cityCountQuery += `
                WHERE n.city IS NOT NULL
                AND TRIM(n.city) <> ''
            `;
        }

        cityCountQuery += `
            GROUP BY INITCAP(TRIM(n.city))
            ORDER BY lead_count DESC
            LIMIT 25;
        `;

        const [monthlyResult, nextdoorTypeResult, cityResult] = await Promise.all([
            pool.query(monthlyByLeadTypeQuery, ftWhere.params),
            pool.query(nextdoorLeadTypeCountQuery, ndWhere.params),
            pool.query(cityCountQuery, ndWhere.params),
        ]);

        res.status(200).json({
            ok: true,
            state: selectedState,
            months,
            monthlyByLeadType: getRows(monthlyResult.rows),
            nextdoorLeadTypeCounts: getRows(nextdoorTypeResult.rows),
            cityCounts: getRows(cityResult.rows),
        });
    } catch (error) {
        console.error('Error fetching lead reports:', error);
        res.status(500).json({ error: 'Failed to fetch lead reports.' });
    }
};

// =========================================================
// Filter options for frontend dropdowns
// GET /api/marketing/filters
// =========================================================
exports.getMarketingFilters = async (req, res) => {
    try {
        const statesQuery = `
            SELECT DISTINCT UPPER(TRIM(state)) AS state
            FROM (
                SELECT state FROM nextdoor_messages WHERE state IS NOT NULL
                UNION ALL
                SELECT state FROM familytreenow WHERE state IS NOT NULL
            ) states
            WHERE TRIM(state) <> ''
            ORDER BY state;
        `;

        const citiesQuery = `
            SELECT DISTINCT
                UPPER(TRIM(state)) AS state,
                INITCAP(TRIM(city)) AS city
            FROM (
                SELECT state, city FROM nextdoor_messages WHERE state IS NOT NULL AND city IS NOT NULL
                UNION ALL
                SELECT state, city FROM familytreenow WHERE state IS NOT NULL AND city IS NOT NULL
            ) cities
            WHERE TRIM(state) <> ''
            AND TRIM(city) <> ''
            ORDER BY state, city;
        `;

        const industriesQuery = `
            SELECT DISTINCT TRIM(item.value) AS lead_type
            FROM (
                SELECT lead_type FROM nextdoor_messages WHERE lead_type IS NOT NULL
                UNION ALL
                SELECT lead_type FROM familytreenow WHERE lead_type IS NOT NULL
            ) source
            CROSS JOIN LATERAL unnest(
                string_to_array(LOWER(COALESCE(source.lead_type, '')), ',')
            ) AS item(value)
            WHERE TRIM(item.value) <> ''
            ORDER BY lead_type;
        `;

        const [statesResult, citiesResult, industriesResult] = await Promise.all([
            pool.query(statesQuery),
            pool.query(citiesQuery),
            pool.query(industriesQuery),
        ]);

        res.status(200).json({
            states: statesResult.rows,
            cities: citiesResult.rows,
            industries: industriesResult.rows,
        });
    } catch (error) {
        console.error('Error fetching marketing filters:', error);
        res.status(500).json({ error: 'Failed to fetch marketing filters.' });
    }
};

// =========================================================
// Marketing summary metrics
// GET /api/marketing/summary?days=30
// =========================================================
exports.getMarketingSummary = async (req, res) => {
    const days = toInt(req.query.days, 30, 1, MAX_DAYS);

    try {
        const summaryQuery = `
            SELECT json_build_object(
                'nextdoor_total', (
                    SELECT COUNT(*)::int
                    FROM nextdoor_messages
                    WHERE timestamp >= NOW() - make_interval(days => $1::int)
                ),
                'familytreenow_sent_total', (
                    SELECT COUNT(*)::int
                    FROM familytreenow
                    WHERE lead_sent = TRUE
                    AND scraped_at >= NOW() - make_interval(days => $1::int)
                ),
                'states_covered', (
                    SELECT COUNT(DISTINCT UPPER(TRIM(state)))::int
                    FROM (
                        SELECT state FROM nextdoor_messages WHERE state IS NOT NULL
                        UNION ALL
                        SELECT state FROM familytreenow WHERE state IS NOT NULL
                    ) s
                    WHERE TRIM(state) <> ''
                ),
                'cities_covered', (
                    SELECT COUNT(DISTINCT LOWER(TRIM(city)))::int
                    FROM (
                        SELECT city FROM nextdoor_messages WHERE city IS NOT NULL
                        UNION ALL
                        SELECT city FROM familytreenow WHERE city IS NOT NULL
                    ) c
                    WHERE TRIM(city) <> ''
                ),
                'active_marketing_window_days', $1::int
            ) AS summary;
        `;

        const result = await pool.query(summaryQuery, [days]);

        res.status(200).json(result.rows[0]?.summary || {});
    } catch (error) {
        console.error('Error fetching marketing summary:', error);
        res.status(500).json({ error: 'Failed to fetch marketing summary.' });
    }
};

// =========================================================
// Potential leads from Nextdoor
// GET /api/marketing/potential-leads?state=TX&industry=pool&days=90&limit=50
// =========================================================
exports.getPotentialLeads = async (req, res) => {
    const limit = toInt(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);

    try {
        const where = buildNextdoorWhere(req.query, {
            defaultDays: DEFAULT_DAYS,
            includeDateFilter: true,
        });

        const limitParam = addParam(where.params, limit);

        const potentialLeadsQuery = `
            SELECT
                n.id,
                UPPER(TRIM(n.state)) AS state,
                INITCAP(TRIM(n.city)) AS city,
                n.lead_type,
                n.timestamp,
                LEFT(COALESCE(n.description, ''), 280) AS description_preview,
                COALESCE(NULLIF(TRIM(n.location), ''), INITCAP(TRIM(n.city))) AS location
            FROM nextdoor_messages n
            ${where.whereSql}
            ORDER BY n.timestamp DESC NULLS LAST
            LIMIT ${limitParam};
        `;

        const result = await pool.query(potentialLeadsQuery, where.params);

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'No potential leads found for the selected filters.', leads: [] });
        }

        res.status(200).json({
            filters: {
                state: where.state,
                city: where.city,
                lead_type: where.leadType,
                days: where.days,
                limit,
            },
            leads: result.rows,
        });
    } catch (error) {
        console.error('Error fetching potential leads:', error);
        res.status(500).json({ error: 'Failed to fetch potential leads.' });
    }
};

// =========================================================
// Existing POST route: lead count by industry from Nextdoor
// POST /api/marketing/lead-count-by-industry
// Body: { state, city, industry, days }
// =========================================================
exports.getLeadsByIndustry = async (req, res) => {
    try {
        const bodyQuery = {
            ...req.query,
            ...req.body,
        };

        const where = buildNextdoorWhere(bodyQuery, {
            defaultDays: DEFAULT_DAYS,
            includeDateFilter: true,
        });

        const leadCountByIndustryQuery = `
            SELECT
                TRIM(item.value) AS lead_type,
                COUNT(*)::int AS lead_count
            FROM nextdoor_messages n
            CROSS JOIN LATERAL unnest(
                string_to_array(LOWER(COALESCE(n.lead_type, '')), ',')
            ) AS item(value)
            ${where.whereSql}
            GROUP BY TRIM(item.value)
            HAVING TRIM(item.value) <> ''
            ORDER BY lead_count DESC;
        `;

        const result = await pool.query(leadCountByIndustryQuery, where.params);

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'No lead counts found for the selected filters.', rows: [] });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching lead count by industry:', error);
        res.status(500).json({ error: 'Failed to fetch lead count by industry.' });
    }
};

// =========================================================
// GET lead counts by industry from Nextdoor
// GET /api/marketing/lead-count-by-industry?state=TX&days=90
// =========================================================
exports.getLeadCountByIndustry = async (req, res) => {
    try {
        const where = buildNextdoorWhere(req.query, {
            defaultDays: DEFAULT_DAYS,
            includeDateFilter: true,
        });

        const leadCountByIndustryQuery = `
            SELECT
                TRIM(item.value) AS lead_type,
                COUNT(*)::int AS lead_count
            FROM nextdoor_messages n
            CROSS JOIN LATERAL unnest(
                string_to_array(LOWER(COALESCE(n.lead_type, '')), ',')
            ) AS item(value)
            ${where.whereSql}
            GROUP BY TRIM(item.value)
            HAVING TRIM(item.value) <> ''
            ORDER BY lead_count DESC;
        `;

        const result = await pool.query(leadCountByIndustryQuery, where.params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching lead count by industry:', error);
        res.status(500).json({ error: 'Failed to fetch lead count by industry.' });
    }
};

// =========================================================
// Lead counts by state from Nextdoor
// GET /api/marketing/lead-count-by-state?days=90
// =========================================================
exports.getLeadCountByState = async (req, res) => {
    const days = toInt(req.query.days, DEFAULT_DAYS, 1, MAX_DAYS);

    try {
        const leadCountByStateQuery = `
            SELECT
                UPPER(TRIM(n.state)) AS state,
                COUNT(*)::int AS lead_count
            FROM nextdoor_messages n
            WHERE
                n.timestamp >= NOW() - make_interval(days => $1::int)
                AND n.state IS NOT NULL
                AND TRIM(n.state) <> ''
            GROUP BY UPPER(TRIM(n.state))
            ORDER BY lead_count DESC, state;
        `;

        const result = await pool.query(leadCountByStateQuery, [days]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching lead count by state:', error);
        res.status(500).json({ error: 'Failed to fetch lead count by state.' });
    }
};

// =========================================================
// Lead counts by city from Nextdoor
// GET /api/marketing/lead-count-by-city?state=TX&days=90
// =========================================================
exports.getLeadCountByCity = async (req, res) => {
    const limit = toInt(req.query.limit, 50, 1, MAX_LIMIT);

    try {
        const where = buildNextdoorWhere(req.query, {
            defaultDays: DEFAULT_DAYS,
            includeDateFilter: true,
        });

        const limitParam = addParam(where.params, limit);

        let leadCountByCityQuery = `
            SELECT
                UPPER(TRIM(n.state)) AS state,
                INITCAP(TRIM(n.city)) AS city,
                COUNT(*)::int AS lead_count
            FROM nextdoor_messages n
            ${where.whereSql}
        `;

        if (where.whereSql) {
            leadCountByCityQuery += `
                AND n.city IS NOT NULL
                AND TRIM(n.city) <> ''
            `;
        } else {
            leadCountByCityQuery += `
                WHERE n.city IS NOT NULL
                AND TRIM(n.city) <> ''
            `;
        }

        leadCountByCityQuery += `
            GROUP BY UPPER(TRIM(n.state)), INITCAP(TRIM(n.city))
            ORDER BY lead_count DESC, state, city
            LIMIT ${limitParam};
        `;

        const result = await pool.query(leadCountByCityQuery, where.params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching lead count by city:', error);
        res.status(500).json({ error: 'Failed to fetch lead count by city.' });
    }
};

// =========================================================
// Market list: city/state/count/lead types
// GET /api/marketing/markets?days=90&limit=100
// =========================================================
exports.getMarkets = async (req, res) => {
    const days = toInt(req.query.days, DEFAULT_DAYS, 1, MAX_DAYS);
    const limit = toInt(req.query.limit, 100, 1, MAX_LIMIT);

    try {
        const marketsQuery = `
            SELECT
                UPPER(TRIM(n.state)) AS state,
                INITCAP(TRIM(n.city)) AS city,
                COUNT(*)::int AS lead_count,
                ARRAY_AGG(DISTINCT TRIM(item.value) ORDER BY TRIM(item.value)) AS lead_types
            FROM nextdoor_messages n
            CROSS JOIN LATERAL unnest(
                string_to_array(LOWER(COALESCE(n.lead_type, '')), ',')
            ) AS item(value)
            WHERE
                n.timestamp >= NOW() - make_interval(days => $1::int)
                AND n.state IS NOT NULL
                AND TRIM(n.state) <> ''
                AND n.city IS NOT NULL
                AND TRIM(n.city) <> ''
                AND TRIM(item.value) <> ''
            GROUP BY UPPER(TRIM(n.state)), INITCAP(TRIM(n.city))
            ORDER BY lead_count DESC, state, city
            LIMIT $2;
        `;

        const result = await pool.query(marketsQuery, [days, limit]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching markets:', error);
        res.status(500).json({ error: 'Failed to fetch markets.' });
    }
};

// =========================================================
// Monthly FamilyTreeNow sent leads by type
// GET /api/marketing/familytreenow/monthly-leads-by-type?state=TX&months=8
// =========================================================
exports.getMonthlySentLeadsByType = async (req, res) => {
    try {
        const where = buildFamilyTreeWhere(req.query, {
            defaultMonths: DEFAULT_MONTHS,
            leadSentOnly: true,
            includeDateFilter: true,
        });

        const monthlySentLeadsByTypeQuery = `
            SELECT
                DATE_TRUNC('month', expanded.scraped_at)::date AS month,
                expanded.lead_type,
                COUNT(*)::int AS leads_sent
            FROM (
                SELECT
                    f.scraped_at,
                    TRIM(item.value) AS lead_type
                FROM familytreenow f
                CROSS JOIN LATERAL unnest(
                    string_to_array(LOWER(COALESCE(f.lead_type, '')), ',')
                ) AS item(value)
                ${where.whereSql}
            ) expanded
            WHERE expanded.lead_type <> ''
            GROUP BY DATE_TRUNC('month', expanded.scraped_at), expanded.lead_type
            ORDER BY month DESC, leads_sent DESC;
        `;

        const result = await pool.query(monthlySentLeadsByTypeQuery, where.params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching monthly sent leads by type:', error);
        res.status(500).json({ error: 'Failed to fetch monthly sent leads by type.' });
    }
};

// =========================================================
// Recent FamilyTreeNow sent leads
// GET /api/marketing/familytreenow/recent-sent-leads?state=TX&months=8&limit=50
// =========================================================
exports.getRecentFamilyTreeNowSentLeads = async (req, res) => {
    const limit = toInt(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);

    try {
        const where = buildFamilyTreeWhere(req.query, {
            defaultMonths: DEFAULT_MONTHS,
            leadSentOnly: true,
            includeDateFilter: true,
        });

        const limitParam = addParam(where.params, limit);

        const recentSentLeadsQuery = `
            SELECT
                f.id,
                UPPER(TRIM(f.state)) AS state,
                INITCAP(TRIM(f.city)) AS city,
                f.lead_type,
                f.scraped_at,
                LEFT(COALESCE(f.description, ''), 280) AS description_preview,
                COALESCE(NULLIF(TRIM(f.location), ''), INITCAP(TRIM(f.city))) AS location
            FROM familytreenow f
            ${where.whereSql}
            ORDER BY f.scraped_at DESC NULLS LAST
            LIMIT ${limitParam};
        `;

        const result = await pool.query(recentSentLeadsQuery, where.params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching recent sent leads:', error);
        res.status(500).json({ error: 'Failed to fetch recent sent leads.' });
    }
};

// =========================================================
// Sent leads by company
// GET /api/marketing/familytreenow/sent-by-company?months=8&limit=50
// =========================================================
exports.getSentLeadsByCompany = async (req, res) => {
    const months = toInt(req.query.months, DEFAULT_MONTHS, 1, MAX_MONTHS);
    const limit = toInt(req.query.limit, 50, 1, MAX_LIMIT);

    try {
        const sentLeadsByCompanyQuery = `
            SELECT
                TRIM(company) AS company,
                COUNT(*)::int AS leads_sent
            FROM (
                SELECT unnest(f.company_name) AS company
                FROM familytreenow f
                WHERE
                    f.lead_sent = TRUE
                    AND f.company_name IS NOT NULL
                    AND f.scraped_at >= NOW() - make_interval(months => $1::int)
            ) t
            WHERE TRIM(company) <> ''
            GROUP BY TRIM(company)
            ORDER BY leads_sent DESC
            LIMIT $2;
        `;

        const result = await pool.query(sentLeadsByCompanyQuery, [months, limit]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching sent leads by company:', error);
        res.status(500).json({ error: 'Failed to fetch sent leads by company.' });
    }
};

// Alias names in case routes use these directly
exports.getNextdoorLeadTypeCounts = exports.getLeadCountByIndustry;
exports.getNextdoorCityCounts = exports.getLeadCountByCity;
exports.getRecentNextdoorLeads = exports.getPotentialLeads;
