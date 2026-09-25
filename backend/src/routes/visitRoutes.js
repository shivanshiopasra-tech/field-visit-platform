const express = require("express");

const {
    getVisits,
    getVisitById,
    createVisit,
    updateVisit,
    submitVisit,
    decideVisit,
    resubmitVisit,
    completeVisit,
    getSummary
} = require("../controllers/visitController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/summary",
    authenticateToken,
    getSummary
);

router.get(
    "/",
    authenticateToken,
    getVisits
);

router.post(
    "/",
    authenticateToken,
    createVisit
);

router.get(
    "/:id",
    authenticateToken,
    getVisitById
);

router.put(
    "/:id",
    authenticateToken,
    updateVisit
);

router.patch(
    "/:id/submit",
    authenticateToken,
    submitVisit
);

router.patch(
    "/:id/decision",
    authenticateToken,
    decideVisit
);

router.patch(
    "/:id/resubmit",
    authenticateToken,
    resubmitVisit
);

router.patch(
    "/:id/complete",
    authenticateToken,
    completeVisit
);

module.exports = router;