const pool = require('../db/db');

// 🧾 GET /api/appointmentsalescalls
// Supports optional filters: ?city=&lead_type=&date=last7days
exports.getAllAppointmentSalesCalls = async (req, res) => {
    try {
        const { city, lead_type, date } = req.query;

        const where = [];
        const values = [];
        let i = 1;

        // Date filter (lastDay, last7Days, last30Days)
        if (date) {
            let interval;
            if (date === 'lastDay') interval = '1 day';
            else if (date === 'last7Days') interval = '7 days';
            else if (date === 'last30Days') interval = '30 days';

            if (interval) {
                where.push(`scraped_at >= NOW() - INTERVAL '${interval}'`);
            }
        }

        if (city) {
            where.push(`LOWER(city) = LOWER($${i++})`);
            values.push(city);
        }

        if (lead_type) {
            where.push(`LOWER(lead_type) = LOWER($${i++})`);
            values.push(lead_type);
        }

        let query = `
            SELECT id, lead_id, author, location, description, phones, email,
                   physical_address, city, lead_type, company_name, professionalNumberToCall, scraped_at
            FROM familytreenow
        `;

        if (where.length) query += ` WHERE ${where.join(' AND ')}`;
        query += ' ORDER BY scraped_at DESC';

        const { rows } = await pool.query(query, values);

        res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        console.error('❌ Error fetching appointment sales calls:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};


// 🧠 GET a single record by ID
exports.getAppointmentSalesCallById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM familytreenow WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching appointment sales call by ID:', error);
        res.status(500).json({ error: 'Failed to fetch appointment sales call' });
    }
};


// ➕ CREATE (used by scraper inserts or manual testing)
exports.createAppointmentSalesCall = async (req, res) => {
    const {
        lead_id,
        author,
        location,
        description,
        phones = [],
        email,
        physical_address,
        city,
        lead_type,
        company_name,
        professionalToCall
    } = req.body;

    try {
        const result = await pool.query(
            `
                INSERT INTO familytreenow
                (lead_id, author, location, description, phones, email, physical_address, city, lead_type, company_name, professionalToCall)
                VALUES
                    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    RETURNING *
            `,
            [lead_id, author, location, description, phones, email, physical_address, city, lead_type, company_name, professionalToCall]
        );

        res.status(201).json({
            message: 'Appointment/Sales call record created successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error creating appointment sales call:', error);
        res.status(500).json({ error: 'Failed to create appointment sales call' });
    }
};


// 🧾 Update existing record by ID
exports.updateAppointmentSalesCall = async (req, res) => {
    const { id } = req.params;
    const {
        author,
        location,
        description,
        phones,
        email,
        physical_address,
        city,
        lead_type,
        company_name,
        professionalToCall
    } = req.body;

    try {
        const result = await pool.query(
            `
                UPDATE familytreenow
                SET author = COALESCE($1, author),
                    location = COALESCE($2, location),
                    description = COALESCE($3, description),
                    phones = COALESCE($4, phones),
                    email = COALESCE($5, email),
                    physical_address = COALESCE($6, physical_address),
                    city = COALESCE($7, city),
                    lead_type = COALESCE($8, lead_type),
                    company_name = COALESCE($9, company_name),
                    professionalToCall = COALESCE($10, professionalToCall),
                    scraped_at = NOW()
                WHERE id = $11
                    RETURNING *
            `,
            [author, location, description, phones, email, physical_address, city, lead_type, company_name, professionalToCall, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.status(200).json({
            message: 'Appointment/Sales call updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating appointment sales call:', error);
        res.status(500).json({ error: 'Failed to update appointment sales call' });
    }
};


// ❌ DELETE by ID
exports.deleteAppointmentSalesCall = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM familytreenow WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.status(200).json({
            message: 'Appointment/Sales call deleted successfully',
            deleted: result.rows[0],
        });
    } catch (error) {
        console.error('Error deleting appointment sales call:', error);
        res.status(500).json({ error: 'Failed to delete appointment sales call' });
    }
};


// ✅ Test database connection
exports.testDatabaseConnection = async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() AS timestamp');
        res.status(200).json({
            message: 'Database connection successful',
            timestamp: result.rows[0].timestamp,
        });
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
};
