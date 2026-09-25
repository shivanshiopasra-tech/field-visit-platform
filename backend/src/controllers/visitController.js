const pool = require("../config/db");

// GET /api/visits
const getVisits = async (req, res) => {
    try {
        const {
            status,
            location_id,
            page = 1,
            limit = 10
        } = req.query;

        const allowedStatuses = [
            "DRAFT",
            "PENDING",
            "APPROVED",
            "REJECTED",
            "COMPLETED"
        ];

        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(
            Math.max(Number(limit) || 10, 1),
            100
        );
        const offset = (pageNumber - 1) * limitNumber;

        let conditions = [];
        let params = [];

        // FIELD_OFFICER can only see own visits
        if (req.user.role === "FIELD_OFFICER") {
            conditions.push("v.created_by = ?");
            params.push(req.user.id);
        }

        if (status) {
            conditions.push("v.status = ?");
            params.push(status);
        }

        if (location_id) {
            if (isNaN(Number(location_id))) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid location_id"
                });
            }

            conditions.push("v.location_id = ?");
            params.push(Number(location_id));
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        const [countRows] = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM visits v
            ${whereClause}
            `,
            params
        );

        const [visits] = await pool.query(
            `
            SELECT
                v.id,
                v.title,
                v.purpose,
                v.planned_date,
                v.estimated_cost,
                v.status,
                v.created_by,
                v.location_id,
                v.created_at,
                v.updated_at,
                l.name AS location_name,
                l.address AS location_address,
                u.name AS created_by_name,
                u.email AS created_by_email
            FROM visits v
            JOIN locations l
                ON v.location_id = l.id
            JOIN users u
                ON v.created_by = u.id
            ${whereClause}
            ORDER BY v.created_at DESC
            LIMIT ? OFFSET ?
            `,
            [...params, limitNumber, offset]
        );

        const total = Number(countRows[0].total);

        res.json({
            success: true,
            page: pageNumber,
            limit: limitNumber,
            total,
            total_pages: Math.ceil(total / limitNumber),
            count: visits.length,
            visits
        });

    } catch (error) {
        console.error("Get visits error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch visits"
        });
    }
};


// GET /api/visits/:id
const getVisitById = async (req, res) => {
    try {
        const { id } = req.params;

        const [visits] = await pool.query(
            `
            SELECT
                v.*,
                l.name AS location_name,
                l.address AS location_address,
                u.name AS created_by_name,
                u.email AS created_by_email
            FROM visits v
            JOIN locations l
                ON v.location_id = l.id
            JOIN users u
                ON v.created_by = u.id
            WHERE v.id = ?
            `,
            [id]
        );

        if (visits.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Visit not found"
            });
        }

        const visit = visits[0];

        if (
            req.user.role === "FIELD_OFFICER" &&
            visit.created_by !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const [decisions] = await pool.query(
            `
            SELECT
                ad.id,
                ad.decision,
                ad.remark,
                ad.created_at,
                u.name AS decided_by_name,
                u.email AS decided_by_email
            FROM approval_decisions ad
            JOIN users u
                ON ad.decided_by = u.id
            WHERE ad.visit_id = ?
            ORDER BY ad.created_at ASC
            `,
            [id]
        );

        res.json({
            success: true,
            visit: {
                ...visit,
                decision_history: decisions
            }
        });

    } catch (error) {
        console.error("Get visit error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch visit"
        });
    }
};


// POST /api/visits
const createVisit = async (req, res) => {
    try {
        if (req.user.role !== "FIELD_OFFICER") {
            return res.status(403).json({
                success: false,
                message: "Only field officers can create visits"
            });
        }

        const {
            title,
            purpose,
            planned_date,
            estimated_cost,
            location_id
        } = req.body;

        if (
            !title ||
            !purpose ||
            !planned_date ||
            estimated_cost === undefined ||
            !location_id
        ) {
            return res.status(400).json({
                success: false,
                message: "All visit fields are required"
            });
        }

        const [locations] = await pool.query(
            "SELECT id FROM locations WHERE id = ?",
            [location_id]
        );

        if (locations.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid location"
            });
        }

        const [result] = await pool.query(
            `
            INSERT INTO visits
            (
                created_by,
                location_id,
                title,
                purpose,
                planned_date,
                estimated_cost,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'DRAFT')
            `,
            [
                req.user.id,
                location_id,
                title,
                purpose,
                planned_date,
                estimated_cost
            ]
        );

        res.status(201).json({
            success: true,
            message: "Visit created successfully",
            visit_id: result.insertId,
            status: "DRAFT"
        });

    } catch (error) {
        console.error("Create visit error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create visit"
        });
    }
};


// PUT /api/visits/:id
const updateVisit = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== "FIELD_OFFICER") {
            return res.status(403).json({
                success: false,
                message: "Only field officers can update visits"
            });
        }

        const [visits] = await pool.query(
            "SELECT * FROM visits WHERE id = ?",
            [id]
        );

        if (visits.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Visit not found"
            });
        }

        const visit = visits[0];

        if (visit.created_by !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can only update your own visits"
            });
        }

        if (!["DRAFT", "REJECTED"].includes(visit.status)) {
            return res.status(400).json({
                success: false,
                message: "Visit can only be edited while DRAFT or REJECTED"
            });
        }

        const {
            title,
            purpose,
            planned_date,
            estimated_cost,
            location_id
        } = req.body;

        if (
            !title ||
            !purpose ||
            !planned_date ||
            estimated_cost === undefined ||
            !location_id
        ) {
            return res.status(400).json({
                success: false,
                message: "All visit fields are required"
            });
        }

        const [locations] = await pool.query(
            "SELECT id FROM locations WHERE id = ?",
            [location_id]
        );

        if (locations.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid location"
            });
        }

        await pool.query(
            `
            UPDATE visits
            SET
                title = ?,
                purpose = ?,
                planned_date = ?,
                estimated_cost = ?,
                location_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [
                title,
                purpose,
                planned_date,
                estimated_cost,
                location_id,
                id
            ]
        );

        res.json({
            success: true,
            message: "Visit updated successfully",
            visit_id: Number(id)
        });

    } catch (error) {
        console.error("Update visit error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update visit"
        });
    }
};


// PATCH /api/visits/:id/submit
const submitVisit = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== "FIELD_OFFICER") {
            return res.status(403).json({
                success: false,
                message: "Only field officers can submit visits"
            });
        }

        const [visits] = await pool.query(
            "SELECT * FROM visits WHERE id = ?",
            [id]
        );

        if (visits.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Visit not found"
            });
        }

        const visit = visits[0];

        if (visit.created_by !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can only submit your own visits"
            });
        }

        if (!["DRAFT", "REJECTED"].includes(visit.status)) {
            return res.status(400).json({
                success: false,
                message: "Only DRAFT or REJECTED visits can be submitted"
            });
        }

        await pool.query(
            `
            UPDATE visits
            SET
                status = 'PENDING',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [id]
        );

        res.json({
            success: true,
            message: "Visit submitted successfully",
            visit_id: Number(id),
            old_status: visit.status,
            new_status: "PENDING"
        });

    } catch (error) {
        console.error("Submit visit error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to submit visit"
        });
    }
};


// PATCH /api/visits/:id/decision
const decideVisit = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision, remark } = req.body;

        if (req.user.role !== "HQ_APPROVER") {
            return res.status(403).json({
                success: false,
                message: "Only HQ approver can approve or reject visits"
            });
        }

        if (!["APPROVED", "REJECTED"].includes(decision)) {
            return res.status(400).json({
                success: false,
                message: "Decision must be APPROVED or REJECTED"
            });
        }

        if (decision === "REJECTED" && !remark?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Rejection remark is required"
            });
        }

        const [visits] = await pool.query(
            "SELECT * FROM visits WHERE id = ?",
            [id]
        );

        if (visits.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Visit not found"
            });
        }

        const visit = visits[0];

        if (visit.created_by === req.user.id) {
            return res.status(403).json({
                success: false,
                message: "An approver cannot approve or reject their own visit"
            });
        }

        if (visit.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "Only PENDING visits can be approved or rejected"
            });
        }

        await pool.query(
            `
            UPDATE visits
            SET
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [decision, id]
        );

        await pool.query(
            `
            INSERT INTO approval_decisions
            (
                visit_id,
                decided_by,
                decision,
                remark
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                id,
                req.user.id,
                decision,
                remark?.trim() || null
            ]
        );

        res.json({
            success: true,
            message: `Visit ${decision.toLowerCase()} successfully`,
            visit_id: Number(id),
            decision,
            remark: remark?.trim() || null
        });

    } catch (error) {
        console.error("Decide visit error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to process visit decision"
        });
    }
};


// PATCH /api/visits/:id/resubmit
const resubmitVisit = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== "FIELD_OFFICER") {
            return res.status(403).json({
                success: false,
                message: "Only field officers can resubmit visits"
            });
        }

        const [visits] = await pool.query(
            "SELECT * FROM visits WHERE id = ?",
            [id]
        );

        if (visits.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Visit not found"
            });
        }

        const visit = visits[0];

        if (visit.created_by !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can only resubmit your own visits"
            });
        }

        if (visit.status !== "REJECTED") {
            return res.status(400).json({
                success: false,
                message: "Only REJECTED visits can be resubmitted"
            });
        }

        await pool.query(
            `
            UPDATE visits
            SET
                status = 'PENDING',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [id]
        );

        res.json({
            success: true,
            message: "Visit resubmitted successfully",
            visit_id: Number(id),
            old_status: "REJECTED",
            new_status: "PENDING"
        });

    } catch (error) {
        console.error("Resubmit visit error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to resubmit visit"
        });
    }
};


// PATCH /api/visits/:id/complete
const completeVisit = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== "FIELD_OFFICER") {
            return res.status(403).json({
                success: false,
                message: "Only field officers can complete visits"
            });
        }

        const [visits] = await pool.query(
            "SELECT * FROM visits WHERE id = ?",
            [id]
        );

        if (visits.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Visit not found"
            });
        }

        const visit = visits[0];

        if (visit.created_by !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can only complete your own visits"
            });
        }

        if (visit.status !== "APPROVED") {
            return res.status(400).json({
                success: false,
                message: "Only APPROVED visits can be completed"
            });
        }

        await pool.query(
            `
            UPDATE visits
            SET
                status = 'COMPLETED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [id]
        );

        res.json({
            success: true,
            message: "Visit completed successfully",
            visit_id: Number(id),
            old_status: "APPROVED",
            new_status: "COMPLETED"
        });

    } catch (error) {
        console.error("Complete visit error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to complete visit"
        });
    }
};


// GET /api/visits/summary
const getSummary = async (req, res) => {
    try {
        if (
            !["HQ_APPROVER", "ADMIN"].includes(req.user.role)
        ) {
            return res.status(403).json({
                success: false,
                message: "Only approvers and admins can view summary"
            });
        }

        const [statusSummary] = await pool.query(
            `
            SELECT
                status,
                COUNT(*) AS count
            FROM visits
            GROUP BY status
            ORDER BY status
            `
        );

        const [locationSummary] = await pool.query(
            `
            SELECT
                l.id AS location_id,
                l.name AS location_name,
                COUNT(v.id) AS visit_count,
                COALESCE(SUM(v.estimated_cost), 0) AS total_planned_cost
            FROM locations l
            LEFT JOIN visits v
                ON v.location_id = l.id
            GROUP BY l.id, l.name
            ORDER BY l.name
            `
        );

        res.json({
            success: true,
            summary: {
                by_status: statusSummary,
                by_location: locationSummary
            }
        });

    } catch (error) {
        console.error("Summary error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch summary"
        });
    }
};


module.exports = {
    getVisits,
    getVisitById,
    createVisit,
    updateVisit,
    submitVisit,
    decideVisit,
    resubmitVisit,
    completeVisit,
    getSummary
};