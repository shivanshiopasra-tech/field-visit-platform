CREATE DATABASE IF NOT EXISTS field_visit_platform;

USE field_visit_platform;

DROP TABLE IF EXISTS approval_decisions;
DROP TABLE IF EXISTS visits;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS users;


-- USERS
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('FIELD_OFFICER', 'HQ_APPROVER', 'ADMIN') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_users_role (role)
);


-- LOCATIONS
CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- VISITS
CREATE TABLE visits (
    id INT AUTO_INCREMENT PRIMARY KEY,

    created_by INT NOT NULL,
    location_id INT NOT NULL,

    title VARCHAR(200) NOT NULL,
    purpose TEXT NOT NULL,
    planned_date DATETIME NOT NULL,
    estimated_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    status ENUM(
        'DRAFT',
        'PENDING',
        'APPROVED',
        'REJECTED',
        'COMPLETED'
    ) NOT NULL DEFAULT 'DRAFT',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_visits_user
        FOREIGN KEY (created_by)
        REFERENCES users(id),

    CONSTRAINT fk_visits_location
        FOREIGN KEY (location_id)
        REFERENCES locations(id),

    CONSTRAINT chk_estimated_cost
        CHECK (estimated_cost >= 0),

    INDEX idx_visits_created_by (created_by),
    INDEX idx_visits_location (location_id),
    INDEX idx_visits_status (status),
    INDEX idx_visits_planned_date (planned_date)
);


-- APPROVAL DECISIONS
CREATE TABLE approval_decisions (
    id INT AUTO_INCREMENT PRIMARY KEY,

    visit_id INT NOT NULL,
    decided_by INT NOT NULL,

    decision ENUM('APPROVED', 'REJECTED') NOT NULL,
    remark TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_decisions_visit
        FOREIGN KEY (visit_id)
        REFERENCES visits(id),

    CONSTRAINT fk_decisions_user
        FOREIGN KEY (decided_by)
        REFERENCES users(id),

    INDEX idx_decisions_visit (visit_id),
    INDEX idx_decisions_user (decided_by)
);