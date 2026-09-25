const bcrypt = require("bcryptjs");
const pool = require("../config/db");
require("dotenv").config();

async function seed() {
    const connection = await pool.getConnection();

    try {
        console.log("Starting database seed...");

        await connection.beginTransaction();

        // ----------------------------------------
        // 1. CLEAR EXISTING SEED DATA
        // ----------------------------------------

        await connection.query("DELETE FROM approval_decisions");
        await connection.query("DELETE FROM visits");
        await connection.query("DELETE FROM locations");
        await connection.query("DELETE FROM users");

        // Reset auto increment values
        await connection.query(
            "ALTER TABLE users AUTO_INCREMENT = 1"
        );

        await connection.query(
            "ALTER TABLE locations AUTO_INCREMENT = 1"
        );

        await connection.query(
            "ALTER TABLE visits AUTO_INCREMENT = 1"
        );

        await connection.query(
            "ALTER TABLE approval_decisions AUTO_INCREMENT = 1"
        );


        // ----------------------------------------
        // 2. HASH PASSWORDS
        // ----------------------------------------

        const officer1Hash = await bcrypt.hash(
            process.env.SEED_OFFICER1_PASSWORD,
            12
        );

        const officer2Hash = await bcrypt.hash(
            process.env.SEED_OFFICER2_PASSWORD,
            12
        );

        const approverHash = await bcrypt.hash(
            process.env.SEED_APPROVER_PASSWORD,
            12
        );

        const adminHash = await bcrypt.hash(
            process.env.SEED_ADMIN_PASSWORD,
            12
        );


        // ----------------------------------------
        // 3. CREATE USERS
        // ----------------------------------------

        const [usersResult] = await connection.query(
            `
            INSERT INTO users
                (name, email, password_hash, role)
            VALUES
                (?, ?, ?, ?),
                (?, ?, ?, ?),
                (?, ?, ?, ?),
                (?, ?, ?, ?)
            `,
            [
                "Priya Sharma",
                "officer1@example.com",
                officer1Hash,
                "FIELD_OFFICER",

                "Rahul Verma",
                "officer2@example.com",
                officer2Hash,
                "FIELD_OFFICER",

                "Anita Singh",
                "approver@example.com",
                approverHash,
                "HQ_APPROVER",

                "Admin User",
                "admin@example.com",
                adminHash,
                "ADMIN"
            ]
        );

        console.log(
            `Created ${usersResult.affectedRows} users`
        );


        // ----------------------------------------
        // 4. GET USER IDS
        // ----------------------------------------

        const [users] = await connection.query(
            `
            SELECT id, email, role
            FROM users
            ORDER BY id
            `
        );

        const officer1 = users.find(
            user => user.email === "officer1@example.com"
        );

        const officer2 = users.find(
            user => user.email === "officer2@example.com"
        );

        const approver = users.find(
            user => user.email === "approver@example.com"
        );

        const admin = users.find(
            user => user.email === "admin@example.com"
        );


        // ----------------------------------------
        // 5. CREATE LOCATIONS
        // ----------------------------------------

        const [locationsResult] = await connection.query(
            `
            INSERT INTO locations
                (name, address)
            VALUES
                (?, ?),
                (?, ?)
            `,
            [
                "Delhi Program Office",
                "New Delhi, Delhi",

                "Noida Field Site",
                "Sector 62, Noida, Uttar Pradesh"
            ]
        );

        console.log(
            `Created ${locationsResult.affectedRows} locations`
        );


        // ----------------------------------------
        // 6. GET LOCATION IDS
        // ----------------------------------------

        const [locations] = await connection.query(
            `
            SELECT id, name
            FROM locations
            ORDER BY id
            `
        );

        const delhi = locations.find(
            location => location.name === "Delhi Program Office"
        );

        const noida = locations.find(
            location => location.name === "Noida Field Site"
        );


        // ----------------------------------------
        // 7. CREATE VISITS
        // ----------------------------------------

        const [visitsResult] = await connection.query(
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
            VALUES
                (?, ?, ?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?, ?, ?)
            `,
            [

                // DRAFT
                officer1.id,
                delhi.id,
                "Delhi Water Quality Survey",
                "Collect field water quality observations.",
                "2026-10-05",
                5000.00,
                "DRAFT",


                // PENDING
                officer1.id,
                noida.id,
                "Noida Community Visit",
                "Conduct household survey and collect operational data.",
                "2026-10-08",
                7500.00,
                "PENDING",


                // APPROVED
                officer2.id,
                delhi.id,
                "Delhi Training Visit",
                "Conduct field staff training session.",
                "2026-10-12",
                10000.00,
                "APPROVED",


                // REJECTED
                officer2.id,
                noida.id,
                "Noida Follow-up Survey",
                "Follow up on previously collected survey responses.",
                "2026-10-15",
                6500.00,
                "REJECTED",


                // COMPLETED
                officer2.id,
                delhi.id,
                "Delhi Completed Visit",
                "Completed field inspection and reporting.",
                "2026-09-20",
                4000.00,
                "COMPLETED"
            ]
        );

        console.log(
            `Created ${visitsResult.affectedRows} visits`
        );


        // ----------------------------------------
        // 8. GET VISIT IDS
        // ----------------------------------------

        const [visits] = await connection.query(
            `
            SELECT
                id,
                title,
                status
            FROM visits
            ORDER BY id
            `
        );

        const approvedVisit = visits.find(
            visit => visit.status === "APPROVED"
        );

        const rejectedVisit = visits.find(
            visit => visit.status === "REJECTED"
        );

        const pendingVisit = visits.find(
            visit => visit.status === "PENDING"
        );


        // ----------------------------------------
        // 9. CREATE APPROVAL HISTORY
        // ----------------------------------------

        await connection.query(
            `
            INSERT INTO approval_decisions
                (
                    visit_id,
                    decided_by,
                    decision,
                    remark
                )
            VALUES
                (?, ?, ?, ?),
                (?, ?, ?, ?)
            `,
            [

                // Approved visit
                approvedVisit.id,
                approver.id,
                "APPROVED",
                "Visit approved for field operations.",

                // Rejected visit
                rejectedVisit.id,
                approver.id,
                "REJECTED",
                "Please provide a clearer field activity plan."
            ]
        );


        // ----------------------------------------
        // 10. COMMIT
        // ----------------------------------------

        await connection.commit();

        console.log("");
        console.log("====================================");
        console.log("DATABASE SEED COMPLETED SUCCESSFULLY");
        console.log("====================================");
        console.log("");

        console.log("Test credentials:");
        console.log("");

        console.log(
            "FIELD_OFFICER:",
            "officer1@example.com"
        );

        console.log(
            "FIELD_OFFICER:",
            "officer2@example.com"
        );

        console.log(
            "HQ_APPROVER:",
            "approver@example.com"
        );

        console.log(
            "ADMIN:",
            "admin@example.com"
        );

        console.log("");
        console.log("Passwords are defined in your local .env file.");
        console.log("They are never stored in the database as plain text.");
        console.log("");

    } catch (error) {

        await connection.rollback();

        console.error("Seed failed:");
        console.error(error.message);

        process.exitCode = 1;

    } finally {

        connection.release();
        await pool.end();

    }
}

seed();