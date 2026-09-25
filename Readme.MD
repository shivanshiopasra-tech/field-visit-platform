# Field Visit Management Platform

A small field visit planning and approval platform built as a take-home technical assignment.

The application provides:

- REST API using Node.js and Express
- MySQL relational database
- JWT authentication
- Role-based authorization
- Field visit lifecycle management
- Approval/rejection workflow
- HQ reporting dashboard
- Minimal frontend using HTML, CSS and JavaScript

---

## Tech Stack

### Backend

- Node.js
- Express.js
- MySQL
- JWT
- bcryptjs

### Frontend

- HTML
- CSS
- JavaScript
- Fetch API

---

## Roles

### FIELD_OFFICER

Can:

- Create visits
- Edit own DRAFT/REJECTED visits
- Submit own visits
- Resubmit rejected visits
- View only own visits
- Complete own approved visits

### HQ_APPROVER

Can:

- View submitted visits
- Approve pending visits
- Reject pending visits
- View HQ summary

### ADMIN

Can:

- View all visits
- Approve/reject pending visits
- View HQ summary

---

## Visit Lifecycle

```text
DRAFT
  |
  | Submit
  v
PENDING
  | \
  |  \
  |   \ Reject
  |    v
  |  REJECTED
  |      |
  |      | Resubmit
  |      v
  |    PENDING
  |
  | Approve
  v
APPROVED
  |
  | Complete
  v
COMPLETED
