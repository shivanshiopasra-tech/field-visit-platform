const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const pool = require("./config/db");
const authenticateToken = require("./middleware/authMiddleware");
const authorizeRoles = require("./middleware/roleMiddleware");
const visitRoutes = require("./routes/visitRoutes");
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/visits", visitRoutes);

app.use("/api/auth", authRoutes);

app.get("/api/test-protected", authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: "You accessed a protected route",
        user: req.user
    });
});
app.get(
    "/api/test-admin",
    authenticateToken,
    authorizeRoles("ADMIN"),
    (req, res) => {
        res.json({
            success: true,
            message: "Admin access granted",
            user: req.user
        });
    }
);

// Health check
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Field Visit API is running"
    });
});


// Database health check
app.get("/health/db", async (req, res) => {
    try {

        const [rows] = await pool.query("SELECT 1 AS result");

        res.json({
            success: true,
            message: "MySQL connection is working",
            database: rows[0].result
        });

    } catch (error) {

        console.error("Database error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});