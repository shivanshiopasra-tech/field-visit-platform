const API_URL = "http://localhost:5000/api";

let token = localStorage.getItem("token");

let currentUser = JSON.parse(
    localStorage.getItem("user") || "null"
);

let currentPage = 1;

const limit = 5;

let totalPages = 1;


/* =========================
   INITIAL LOAD
========================= */

document.addEventListener("DOMContentLoaded", () => {

    if (token && currentUser) {
        showDashboard();
    }

});


/* =========================
   API HELPER
========================= */

async function apiRequest(url, options = {}) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_URL}${url}`,
        {
            ...options,
            headers
        }
    );

    const data = await response.json();

    if (response.status === 401) {

        logout();

        throw new Error(
            "Session expired. Please login again."
        );
    }

    if (!response.ok) {
        throw new Error(
            data.message || "Something went wrong"
        );
    }

    return data;
}


/* =========================
   LOGIN
========================= */

async function login() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const message =
        document.getElementById("loginMessage");

    message.textContent = "Signing in...";
    message.style.color = "#667085";

    try {

        const response = await fetch(
            `${API_URL}/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Invalid login"
            );
        }

        token = data.token;
        currentUser = data.user;

        localStorage.setItem(
            "token",
            token
        );

        localStorage.setItem(
            "user",
            JSON.stringify(currentUser)
        );

        message.textContent = "";

        showDashboard();

    } catch (error) {

        message.textContent = error.message;
        message.style.color = "#dc2626";

    }
}


/* =========================
   DASHBOARD
========================= */

function showDashboard() {

    document
        .getElementById("loginSection")
        .classList.add("hidden");

    document
        .getElementById("dashboardSection")
        .classList.remove("hidden");


    const name =
        currentUser?.name || "User";

    const role =
        currentUser?.role || "USER";


    document.getElementById("userName").textContent =
        name;

    document.getElementById("userRole").textContent =
        role.replace("_", " ");


    document.getElementById("sidebarUserName").textContent =
        name;

    document.getElementById("sidebarUserRole").textContent =
        role.replace("_", " ");


    const initial =
        name.charAt(0).toUpperCase();

    document.getElementById("headerAvatar").textContent =
        initial;

    document.getElementById("sidebarAvatar").textContent =
        initial;


    /* FIELD OFFICER */

    if (role === "FIELD_OFFICER") {

        document
            .getElementById("createSection")
            .classList.remove("hidden");

        document
            .getElementById("summarySection")
            .classList.add("hidden");

        document
            .getElementById("summaryNav")
            .classList.add("hidden");

        document
            .getElementById("dashboardStats")
            .classList.add("hidden");
    }


    /* HQ APPROVER / ADMIN */

    if (
        role === "HQ_APPROVER" ||
        role === "ADMIN"
    ) {

        document
            .getElementById("createSection")
            .classList.add("hidden");

        document
            .getElementById("summarySection")
            .classList.remove("hidden");

        document
            .getElementById("summaryNav")
            .classList.remove("hidden");

        document
            .getElementById("dashboardStats")
            .classList.remove("hidden");

        loadSummary();
    }


    currentPage = 1;

    loadVisits();
}


/* =========================
   LOGOUT
========================= */

function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    token = null;
    currentUser = null;

    document
        .getElementById("dashboardSection")
        .classList.add("hidden");

    document
        .getElementById("loginSection")
        .classList.remove("hidden");

    document.getElementById("email").value = "";
    document.getElementById("password").value = "";

}


/* =========================
   CREATE VISIT
========================= */

async function createVisit() {

    const message =
        document.getElementById("createMessage");

    const title =
        document.getElementById("title").value.trim();

    const purpose =
        document.getElementById("purpose").value.trim();

    const plannedDate =
        document.getElementById("plannedDate").value;

    const estimatedCost =
        Number(
            document.getElementById("estimatedCost").value
        );

    const locationId =
        Number(
            document.getElementById("locationId").value
        );


    try {

        const data = await apiRequest(
            "/visits",
            {
                method: "POST",

                body: JSON.stringify({
                    title,
                    purpose,
                    planned_date: plannedDate,
                    estimated_cost: estimatedCost,
                    location_id: locationId
                })
            }
        );


        message.textContent =
            "Visit created successfully.";

        message.style.color =
            "#15803d";


        document.getElementById("title").value = "";
        document.getElementById("purpose").value = "";
        document.getElementById("plannedDate").value = "";
        document.getElementById("estimatedCost").value = "";
        document.getElementById("locationId").value = "";


        currentPage = 1;

        loadVisits();


    } catch (error) {

        message.textContent =
            error.message;

        message.style.color =
            "#dc2626";
    }
}


/* =========================
   LOAD VISITS
========================= */

async function loadVisits() {

    const visitsContainer =
        document.getElementById("visits");

    visitsContainer.innerHTML =
        `<div class="loading">Loading visits...</div>`;


    const status =
        document.getElementById("statusFilter").value;

    const location =
        document.getElementById("locationFilter").value;


    let query =
        `?page=${currentPage}&limit=${limit}`;


    if (status) {
        query +=
            `&status=${encodeURIComponent(status)}`;
    }

    if (location) {
        query +=
            `&location_id=${encodeURIComponent(location)}`;
    }


    try {

        const data =
            await apiRequest(
                `/visits${query}`
            );


        const visits =
            data.visits || [];


        totalPages =
            data.total_pages || 1;


        displayVisits(visits);


        document.getElementById("pageNumber").textContent =
            `Page ${currentPage} of ${totalPages}`;


        document.getElementById("previousBtn").disabled =
            currentPage <= 1;

        document.getElementById("nextBtn").disabled =
            currentPage >= totalPages;


    } catch (error) {

        visitsContainer.innerHTML =
            `<div class="error-state">
                ${escapeHtml(error.message)}
            </div>`;
    }
}


/* =========================
   DISPLAY VISITS
========================= */

function displayVisits(visits) {

    const container =
        document.getElementById("visits");


    if (!visits.length) {

        container.innerHTML =
            `<div class="empty-state">
                No visits found.
            </div>`;

        return;
    }


    container.innerHTML =
        visits.map(visit => {

            const status =
                visit.status || "DRAFT";


            return `

                <div class="visit-card">

                    <div class="visit-card-top">

                        <div>

                            <h3>
                                ${escapeHtml(
                                    visit.title
                                )}
                            </h3>

                            <span class="visit-id">
                                Visit #${visit.id}
                            </span>

                        </div>

                        <span
                            class="status-badge status-${status}"
                        >
                            ${status}
                        </span>

                    </div>


                    <p class="visit-purpose">
                        ${escapeHtml(
                            visit.purpose || ""
                        )}
                    </p>


                    <div class="visit-meta">

                        <span>
                            📅
                            ${formatDate(
                                visit.planned_date
                            )}
                        </span>

                        <span>
                            💰
                            ₹${formatMoney(
                                visit.estimated_cost
                            )}
                        </span>

                        ${
                            visit.location_name
                            ?
                            `<span>
                                📍
                                ${escapeHtml(
                                    visit.location_name
                                )}
                            </span>`
                            :
                            ""
                        }

                        ${
                            visit.creator_name
                            ?
                            `<span>
                                👤
                                ${escapeHtml(
                                    visit.creator_name
                                )}
                            </span>`
                            :
                            ""
                        }

                    </div>


                    <div class="visit-actions">

                        <button
                            class="action-btn"
                            onclick="viewVisit(${visit.id})"
                        >
                            View Details
                        </button>


                        ${getActionButtons(visit)}

                    </div>

                </div>

            `;

        }).join("");
}


/* =========================
   ROLE ACTION BUTTONS
========================= */

function getActionButtons(visit) {

    const role =
        currentUser?.role;


    let buttons = "";


    if (
        role === "FIELD_OFFICER" &&
        visit.status === "DRAFT"
    ) {

        buttons += `
            <button
                class="action-btn"
                onclick="submitVisit(${visit.id})"
            >
                Submit
            </button>
        `;
    }


    if (
        role === "FIELD_OFFICER" &&
        visit.status === "REJECTED"
    ) {

        buttons += `
            <button
                class="action-btn"
                onclick="resubmitVisit(${visit.id})"
            >
                Resubmit
            </button>
        `;
    }


    if (
        role === "FIELD_OFFICER" &&
        visit.status === "APPROVED"
    ) {

        buttons += `
            <button
                class="action-btn approve"
                onclick="completeVisit(${visit.id})"
            >
                Mark Completed
            </button>
        `;
    }


    if (
        role === "HQ_APPROVER" &&
        visit.status === "PENDING"
    ) {

        buttons += `

            <button
                class="action-btn approve"
                onclick="approveVisit(${visit.id})"
            >
                ✓ Approve
            </button>

            <button
                class="action-btn reject"
                onclick="rejectVisit(${visit.id})"
            >
                ✕ Reject
            </button>

        `;
    }


    return buttons;
}


/* =========================
   SUBMIT
========================= */

async function submitVisit(id) {

    await performAction(
        `/visits/${id}/submit`,
        "Visit submitted successfully."
    );
}


/* =========================
   RESUBMIT
========================= */

async function resubmitVisit(id) {

    await performAction(
        `/visits/${id}/resubmit`,
        "Visit resubmitted successfully."
    );
}


/* =========================
   COMPLETE
========================= */

async function completeVisit(id) {

    const confirmed =
        confirm(
            "Mark this approved visit as completed?"
        );

    if (!confirmed) return;


    await performAction(
        `/visits/${id}/complete`,
        "Visit marked as completed."
    );
}


/* =========================
   APPROVE
========================= */

async function approveVisit(id) {

    const remark =
        prompt(
            "Approval remark (optional):"
        );


    if (remark === null) return;


    await performAction(
        `/visits/${id}/decision`,
        "Visit approved successfully.",
        {
            decision: "APPROVED",
            remark
        }
    );
}


/* =========================
   REJECT
========================= */

async function rejectVisit(id) {

    const remark =
        prompt(
            "Enter rejection remark:"
        );


    if (
        remark === null ||
        !remark.trim()
    ) {

        alert(
            "Rejection remark is required."
        );

        return;
    }


    await performAction(
        `/visits/${id}/decision`,
        "Visit rejected successfully.",
        {
            decision: "REJECTED",
            remark: remark.trim()
        }
    );
}


/* =========================
   PERFORM ACTION
========================= */

async function performAction(
    url,
    successMessage,
    body = {}
) {

    try {

        const data =
            await apiRequest(
                url,
                {
                    method: "PATCH",

                    body: JSON.stringify(body)
                }
            );


        alert(successMessage);

        loadVisits();

        if (
            currentUser?.role === "HQ_APPROVER" ||
            currentUser?.role === "ADMIN"
        ) {
            loadSummary();
        }


    } catch (error) {

        alert(error.message);
    }
}


/* =========================
   VIEW VISIT DETAILS
========================= */

async function viewVisit(id) {

    try {

        const data =
            await apiRequest(
                `/visits/${id}`
            );


        const visit =
            data.visit;


        const history =
            data.decision_history ||
            data.approval_history ||
            [];


        document.getElementById(
            "modalTitle"
        ).textContent =
            visit.title;


        let historyHtml = "";


        if (history.length) {

            historyHtml =
                history.map(item => `

                    <div class="history-item">

                        <strong>
                            ${escapeHtml(
                                item.decision
                            )}
                        </strong>

                        <p>
                            ${
                                item.remark
                                ?
                                escapeHtml(
                                    item.remark
                                )
                                :
                                "No remark"
                            }
                        </p>

                        <p>
                            ${item.decided_by_name
                                ?
                                `By ${escapeHtml(
                                    item.decided_by_name
                                )}`
                                :
                                ""
                            }
                        </p>

                    </div>

                `).join("");

        } else {

            historyHtml =
                `<div class="empty-state">
                    No approval decisions yet.
                </div>`;
        }


        document.getElementById(
            "modalBody"
        ).innerHTML = `

            <div class="detail-grid">

                <div class="detail-item">

                    <label>Visit ID</label>

                    <strong>
                        #${visit.id}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>Status</label>

                    <strong>
                        <span
                            class="status-badge status-${visit.status}"
                        >
                            ${visit.status}
                        </span>
                    </strong>

                </div>


                <div class="detail-item">

                    <label>Planned Date</label>

                    <strong>
                        ${formatDate(
                            visit.planned_date
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>Estimated Cost</label>

                    <strong>
                        ₹${formatMoney(
                            visit.estimated_cost
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>Location</label>

                    <strong>
                        ${escapeHtml(
                            visit.location_name ||
                            `Location #${visit.location_id}`
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>Created By</label>

                    <strong>
                        ${escapeHtml(
                            visit.creator_name ||
                            "Unknown"
                        )}
                    </strong>

                </div>

            </div>


            <div class="detail-item" style="margin-top:15px">

                <label>Purpose</label>

                <strong>
                    ${escapeHtml(
                        visit.purpose
                    )}
                </strong>

            </div>


            <div class="history">

                <h3>
                    Approval History
                </h3>

                ${historyHtml}

            </div>

        `;


        document
            .getElementById("detailsModal")
            .classList.remove("hidden");


    } catch (error) {

        alert(error.message);
    }
}


/* =========================
   MODAL
========================= */

function closeDetailsModal() {

    document
        .getElementById("detailsModal")
        .classList.add("hidden");
}


function closeModal(event) {

    if (
        event.target.id ===
        "detailsModal"
    ) {
        closeDetailsModal();
    }
}


/* =========================
   SUMMARY
========================= */

async function loadSummary() {

    try {

        const data =
            await apiRequest(
                "/visits/summary"
            );


        const summary =
            data.summary;


        renderSummary(summary);


    } catch (error) {

        document.getElementById(
            "summaryCards"
        ).innerHTML =
            `<div class="error-state">
                ${escapeHtml(
                    error.message
                )}
            </div>`;
    }
}


/* =========================
   RENDER SUMMARY
========================= */

function renderSummary(summary) {

    const byStatus =
        summary.by_status || [];

    const byLocation =
        summary.by_location || [];


    const statusCounts = {};


    byStatus.forEach(item => {

        statusCounts[item.status] =
            Number(item.count);

    });


    const total =
        Object.values(statusCounts)
            .reduce(
                (sum, value) =>
                    sum + value,
                0
            );


    const plannedCost =
        byLocation.reduce(
            (sum, item) =>
                sum +
                Number(
                    item.total_planned_cost || 0
                ),
            0
        );


    document.getElementById(
        "totalVisits"
    ).textContent = total;


    document.getElementById(
        "pendingVisits"
    ).textContent =
        statusCounts.PENDING || 0;


    document.getElementById(
        "approvedVisits"
    ).textContent =
        statusCounts.APPROVED || 0;


    document.getElementById(
        "plannedCost"
    ).textContent =
        `₹${formatMoney(plannedCost)}`;


    document.getElementById(
        "summaryCards"
    ).innerHTML = `

        <div class="summary-mini-card">
            <span>DRAFT</span>
            <strong>
                ${statusCounts.DRAFT || 0}
            </strong>
        </div>

        <div class="summary-mini-card">
            <span>PENDING</span>
            <strong>
                ${statusCounts.PENDING || 0}
            </strong>
        </div>

        <div class="summary-mini-card">
            <span>APPROVED</span>
            <strong>
                ${statusCounts.APPROVED || 0}
            </strong>
        </div>

        <div class="summary-mini-card">
            <span>REJECTED</span>
            <strong>
                ${statusCounts.REJECTED || 0}
            </strong>
        </div>

        <div class="summary-mini-card">
            <span>COMPLETED</span>
            <strong>
                ${statusCounts.COMPLETED || 0}
            </strong>
        </div>

    `;


    document.getElementById(
        "locationSummary"
    ).innerHTML = `

        <table class="summary-table">

            <thead>

                <tr>
                    <th>Location</th>
                    <th>Visits</th>
                    <th>Planned Cost</th>
                </tr>

            </thead>

            <tbody>

                ${
                    byLocation.length
                    ?
                    byLocation.map(item => `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    item.location_name
                                )}
                            </td>

                            <td>
                                ${item.visit_count}
                            </td>

                            <td>
                                ₹${formatMoney(
                                    item.total_planned_cost
                                )}
                            </td>

                        </tr>

                    `).join("")
                    :
                    `
                        <tr>
                            <td colspan="3">
                                No location data.
                            </td>
                        </tr>
                    `
                }

            </tbody>

        </table>

    `;
}


/* =========================
   PAGINATION
========================= */

function previousPage() {

    if (currentPage <= 1) return;

    currentPage--;

    loadVisits();
}


function nextPage() {

    if (currentPage >= totalPages) return;

    currentPage++;

    loadVisits();
}


/* =========================
   DATE FORMAT
========================= */

function formatDate(date) {

    if (!date) return "";

    /*
       MySQL DATE values may come from the API
       as an ISO string. Taking the first 10
       characters prevents timezone shifting.
    */

    const value =
        String(date).substring(0, 10);

    const parts =
        value.split("-");


    if (parts.length !== 3) {
        return value;
    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


/* =========================
   MONEY
========================= */

function formatMoney(value) {

    const number =
        Number(value || 0);


    return number.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


/* =========================
   HTML ESCAPE
========================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}