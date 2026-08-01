-- ============================================================
-- Construction Company Management System - Database Schema
-- PostgreSQL 15+
-- ============================================================

-- Clean start (safe to re-run during development)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS employee_requests CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS salary_payments CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS project_employees CASCADE;
DROP TABLE IF EXISTS project_sites CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- ============================================================
-- 1. EMPLOYEES  (the people doing work on-site)
-- ============================================================
CREATE TABLE employees (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20),
    trade_role      VARCHAR(100),          -- e.g. Mason, Electrician, Helper
    monthly_salary  NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. USERS  (login accounts - Admin / Supervisor / Employee)
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    login_id        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'supervisor', 'employee')),
    employee_id     INTEGER REFERENCES employees(id) ON DELETE SET NULL, -- link if this user IS an employee
    must_reset_password BOOLEAN NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. PROJECTS  (self-referencing tree: Project -> Sub-project -> ...)
-- ============================================================
CREATE TABLE projects (
    id                  SERIAL PRIMARY KEY,
    parent_project_id   INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,
    client_name         VARCHAR(150),
    tender_reference    VARCHAR(100),          -- optional tender/contract number
    status              VARCHAR(20) NOT NULL DEFAULT 'ongoing'
                            CHECK (status IN ('ongoing', 'on_hold', 'completed', 'cancelled')),
    progress_percent    SMALLINT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    start_date          DATE,
    end_date            DATE,
    created_by          INTEGER REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_parent ON projects(parent_project_id);

-- Progress update log (history of status/progress notes per project)
CREATE TABLE project_progress_updates (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    note            TEXT NOT NULL,
    progress_percent SMALLINT CHECK (progress_percent BETWEEN 0 AND 100),
    posted_by       INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. SITES  (physical locations; many-to-many with projects)
-- ============================================================
CREATE TABLE sites (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    address     TEXT,
    latitude    NUMERIC(9,6),
    longitude   NUMERIC(9,6),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_sites (
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_id     INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, site_id)
);

-- ============================================================
-- 5. PROJECT <-> EMPLOYEE ASSIGNMENT (many-to-many; employee can be on multiple projects)
-- ============================================================
CREATE TABLE project_employees (
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    removed_date    DATE,                       -- null = currently active on this project
    PRIMARY KEY (project_id, employee_id)
);

-- ============================================================
-- 6. ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status          VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
    marked_by       INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, project_id, attendance_date)
);

CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);

-- ============================================================
-- 7. SALARY PAYMENTS (monthly record + partial payment tracking)
-- ============================================================
CREATE TABLE salary_payments (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pay_month       SMALLINT NOT NULL CHECK (pay_month BETWEEN 1 AND 12),
    pay_year        SMALLINT NOT NULL,
    base_salary     NUMERIC(12,2) NOT NULL,
    total_paid      NUMERIC(12,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'partial', 'paid')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, pay_month, pay_year)
);

-- Individual payment transactions (supports multiple advances/partial payments per month)
CREATE TABLE salary_payment_transactions (
    id                  SERIAL PRIMARY KEY,
    salary_payment_id   INTEGER NOT NULL REFERENCES salary_payments(id) ON DELETE CASCADE,
    amount              NUMERIC(12,2) NOT NULL,
    payment_mode        VARCHAR(30),           -- cash / bank_transfer / upi / other
    payment_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    marked_by           INTEGER REFERENCES users(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. BILLS & INVENTORY  (materials, vendor payments, salary bills, misc)
-- ============================================================
CREATE TABLE bills (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    bill_type       VARCHAR(20) NOT NULL CHECK (bill_type IN ('material', 'vendor', 'salary', 'misc')),
    description     VARCHAR(255) NOT NULL,
    vendor_name     VARCHAR(150),
    amount          NUMERIC(12,2) NOT NULL,
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    image_path      VARCHAR(500),              -- optional photo of physical bill
    created_by      INTEGER REFERENCES users(id),
    updated_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bills_project ON bills(project_id);
CREATE INDEX idx_bills_type ON bills(bill_type);
CREATE INDEX idx_bills_date ON bills(bill_date);

-- ============================================================
-- 9. EMPLOYEE REQUESTS (Supervisor requests a new employee -> Admin approves)
-- ============================================================
CREATE TABLE employee_requests (
    id              SERIAL PRIMARY KEY,
    requested_by    INTEGER NOT NULL REFERENCES users(id),
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20),
    trade_role      VARCHAR(100),
    monthly_salary  NUMERIC(12,2) NOT NULL DEFAULT 0,
    project_id      INTEGER REFERENCES projects(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by     INTEGER REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. AUDIT LOG  (who did what, and when - generic across tables)
-- ============================================================
CREATE TABLE audit_log (
    id              SERIAL PRIMARY KEY,
    table_name      VARCHAR(50) NOT NULL,
    record_id       INTEGER NOT NULL,
    action          VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    changed_by      INTEGER REFERENCES users(id),
    details         JSONB,                     -- e.g. {"field": "amount", "old": 100, "new": 150}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);

-- ============================================================
-- 11. MESSAGING  (project group chats + 1-to-1 direct messages)
-- ============================================================
CREATE TABLE conversations (
    id              SERIAL PRIMARY KEY,
    type            VARCHAR(10) NOT NULL CHECK (type IN ('group', 'direct')),
    project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE, -- set when type = 'group'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_participants (
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id),
    message_text    TEXT,
    image_path      VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- ============================================================
-- Seed: one initial Admin account
-- (password below is a PLACEHOLDER hash - the backend setup script
--  will generate a real bcrypt hash on first run, see /backend/scripts/create-admin.js)
-- ============================================================
-- INSERT INTO users (login_id, password_hash, full_name, role, must_reset_password)
-- VALUES ('admin', '<bcrypt-hash-generated-by-script>', 'Admin', 'admin', true);

-- Links Supervisor users to the specific project(s) they manage.
-- Admin assigns supervisors to projects using this table.

CREATE TABLE IF NOT EXISTS project_supervisors (
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

-- Material catalog (master list of material types)
CREATE TABLE IF NOT EXISTS materials (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    unit        VARCHAR(20) NOT NULL,   -- bag, ton, kg, cft, nos, ltr, etc.
    category    VARCHAR(100),           -- e.g. Cement, Steel, Electrical
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Material coming IN to a project (from a vendor / purchase)
CREATE TABLE IF NOT EXISTS material_receipts (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    material_id     INTEGER NOT NULL REFERENCES materials(id),
    quantity        NUMERIC(12,2) NOT NULL,
    vendor_name     VARCHAR(150),
    receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    notes           TEXT,
    received_by     INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Material going OUT of a project (used / consumed / issued to a work area)
CREATE TABLE IF NOT EXISTS material_issues (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    material_id     INTEGER NOT NULL REFERENCES materials(id),
    quantity        NUMERIC(12,2) NOT NULL,
    issued_to       VARCHAR(150),  -- free text: e.g. "Foundation work", or a person's name
    issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    notes           TEXT,
    issued_by       INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_receipts_project ON material_receipts(project_id);
CREATE INDEX IF NOT EXISTS idx_material_issues_project ON material_issues(project_id);

-- Equipment master list
CREATE TABLE IF NOT EXISTS equipment (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    equipment_type      VARCHAR(100),           -- e.g. Excavator, Crane, Mixer, Generator
    asset_code          VARCHAR(50) UNIQUE,     -- internal tracking number / registration
    project_id          INTEGER REFERENCES projects(id) ON DELETE SET NULL,  -- currently assigned project, nullable
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'maintenance', 'breakdown', 'idle')),
    purchase_date       DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fuel logs
CREATE TABLE IF NOT EXISTS equipment_fuel_logs (
    id              SERIAL PRIMARY KEY,
    equipment_id    INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    fuel_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity        NUMERIC(10,2) NOT NULL,   -- liters
    cost            NUMERIC(12,2),
    notes           TEXT,
    logged_by       INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance logs
CREATE TABLE IF NOT EXISTS equipment_maintenance (
    id              SERIAL PRIMARY KEY,
    equipment_id    INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description     TEXT NOT NULL,
    cost            NUMERIC(12,2),
    next_due_date   DATE,
    logged_by       INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Breakdown logs
CREATE TABLE IF NOT EXISTS equipment_breakdowns (
    id              SERIAL PRIMARY KEY,
    equipment_id    INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    breakdown_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    description     TEXT NOT NULL,
    resolved        BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_date   DATE,
    resolution_notes TEXT,
    reported_by     INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_project ON equipment(project_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_equipment ON equipment_fuel_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_breakdowns_equipment ON equipment_breakdowns(equipment_id);

-- Physical attendance sheet uploads (photo or PDF), scoped per site per day.
-- This is separate from the per-employee digital attendance already tracked.
CREATE TABLE IF NOT EXISTS attendance_uploads (
    id              SERIAL PRIMARY KEY,
    site_id         INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    upload_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    file_path       VARCHAR(500) NOT NULL,
    file_type       VARCHAR(10) NOT NULL,   -- 'image' or 'pdf'
    notes           TEXT,
    uploaded_by     INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_uploads_site_date ON attendance_uploads(site_id, upload_date);

-- Vendors master list
CREATE TABLE IF NOT EXISTS vendors (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    contact_person  VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(150),
    address         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase Requests (PR) - raised by Admin/Supervisor, approved/rejected by Admin
CREATE TABLE IF NOT EXISTS purchase_requests (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    description     TEXT NOT NULL,
    estimated_cost  NUMERIC(12,2),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
    requested_by    INTEGER REFERENCES users(id),
    reviewed_by     INTEGER REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase Orders (PO) - issued to a vendor, optionally linked to an approved PR
CREATE TABLE IF NOT EXISTS purchase_orders (
    id              SERIAL PRIMARY KEY,
    pr_id           INTEGER REFERENCES purchase_requests(id) ON DELETE SET NULL,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    vendor_id       INTEGER NOT NULL REFERENCES vendors(id),
    po_number       VARCHAR(50) UNIQUE,
    description     TEXT NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'partially_received', 'closed', 'cancelled')),
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GRN (Goods Receipt Note) - confirms what arrived against a PO
CREATE TABLE IF NOT EXISTS grns (
    id              SERIAL PRIMARY KEY,
    po_id           INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    received_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    description     TEXT NOT NULL,
    notes           TEXT,
    received_by     INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_project ON purchase_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_po_project ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_grn_po ON grns(po_id);

-- Daily Progress Report - one entry per project per day
CREATE TABLE IF NOT EXISTS dpr_entries (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    report_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    work_summary    TEXT NOT NULL,
    weather         VARCHAR(50),        -- e.g. Sunny, Rainy, Cloudy
    manpower_count  INTEGER,
    notes           TEXT,
    submitted_by    INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, report_date)
);

-- Photos attached to a DPR entry (progress photo gallery)
CREATE TABLE IF NOT EXISTS dpr_photos (
    id              SERIAL PRIMARY KEY,
    dpr_id          INTEGER NOT NULL REFERENCES dpr_entries(id) ON DELETE CASCADE,
    image_path      VARCHAR(500) NOT NULL,
    caption         VARCHAR(255),
    uploaded_by     INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dpr_project_date ON dpr_entries(project_id, report_date);
CREATE INDEX IF NOT EXISTS idx_dpr_photos_dpr ON dpr_photos(dpr_id);

-- Documents: covers both Drawings and Specifications (both are versioned files)
CREATE TABLE IF NOT EXISTS documents (
    id                  SERIAL PRIMARY KEY,
    project_id          INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_type       VARCHAR(20) NOT NULL DEFAULT 'drawing'
                            CHECK (document_type IN ('drawing', 'specification')),
    title               VARCHAR(200) NOT NULL,
    doc_number          VARCHAR(50),
    category            VARCHAR(100),      -- e.g. Architectural, Structural, Electrical, Plumbing
    current_revision     INTEGER NOT NULL DEFAULT 1,
    file_path           VARCHAR(500) NOT NULL,
    file_type           VARCHAR(10) NOT NULL,   -- 'image' or 'pdf'
    status              VARCHAR(20) NOT NULL DEFAULT 'approved'
                            CHECK (status IN ('approved', 'under_review', 'superseded')),
    uploaded_by         INTEGER REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Revision history - old versions kept when a document is updated
CREATE TABLE IF NOT EXISTS document_revisions (
    id                  SERIAL PRIMARY KEY,
    document_id         INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    revision_number      INTEGER NOT NULL,
    file_path            VARCHAR(500) NOT NULL,
    file_type            VARCHAR(10) NOT NULL,
    notes                TEXT,
    uploaded_by           INTEGER REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BOQ (Bill of Quantities) - itemized list per project
CREATE TABLE IF NOT EXISTS boq_items (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_no         VARCHAR(20),
    description     TEXT NOT NULL,
    unit            VARCHAR(20),
    quantity        NUMERIC(12,2) NOT NULL DEFAULT 0,
    rate            NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_revisions_document ON document_revisions(document_id);
CREATE INDEX IF NOT EXISTS idx_boq_project ON boq_items(project_id);

