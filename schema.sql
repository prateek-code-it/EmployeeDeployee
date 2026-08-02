-- ============================================================
-- Construction Company Management System
-- PostgreSQL 15+
-- Production Ready Schema
-- Version : 2.0
-- ============================================================

BEGIN;

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- DROP TABLES (Reverse Dependency Order)
-- ============================================================

DROP TABLE IF EXISTS document_revisions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS boq_items CASCADE;
DROP TABLE IF EXISTS dpr_photos CASCADE;
DROP TABLE IF EXISTS dpr_entries CASCADE;
DROP TABLE IF EXISTS grns CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS attendance_uploads CASCADE;
DROP TABLE IF EXISTS equipment_breakdowns CASCADE;
DROP TABLE IF EXISTS equipment_maintenance CASCADE;
DROP TABLE IF EXISTS equipment_fuel_logs CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS material_issues CASCADE;
DROP TABLE IF EXISTS material_receipts CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS project_supervisors CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS employee_requests CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS salary_payment_transactions CASCADE;
DROP TABLE IF EXISTS salary_payments CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS project_employees CASCADE;
DROP TABLE IF EXISTS project_sites CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS project_progress_updates CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ============================================================
-- DROP FUNCTIONS
-- ============================================================

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS audit_trigger() CASCADE;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE role_type AS ENUM
(
    'super_admin',
    'company_head',
    'supervisor',
    'employee'
);

CREATE TYPE project_status AS ENUM
(
    'ongoing',
    'completed',
    'cancelled',
    'on_hold'
);

CREATE TYPE attendance_status AS ENUM
(
    'present',
    'absent',
    'leave',
    'half_day'
);

CREATE TYPE payment_status AS ENUM
(
    'pending',
    'partial',
    'paid'
);

CREATE TYPE bill_type AS ENUM
(
    'material',
    'vendor',
    'salary',
    'misc'
);

CREATE TYPE approval_status AS ENUM
(
    'pending',
    'approved',
    'rejected'
);

CREATE TYPE conversation_type AS ENUM
(
    'group',
    'direct'
);

-- ============================================================
-- COMMON FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
AS
$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- ============================================================
-- AUDIT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER
AS
$$
BEGIN

IF TG_OP='DELETE' THEN

INSERT INTO audit_log
(
table_name,
record_id,
action,
details,
created_at
)

VALUES
(
TG_TABLE_NAME,
OLD.id,
'delete',
to_jsonb(OLD),
NOW()
);

RETURN OLD;

ELSIF TG_OP='UPDATE' THEN

INSERT INTO audit_log
(
table_name,
record_id,
action,
details,
created_at
)

VALUES
(
TG_TABLE_NAME,
NEW.id,
'update',
jsonb_build_object(
'old',to_jsonb(OLD),
'new',to_jsonb(NEW)
),
NOW()
);

RETURN NEW;

ELSE

INSERT INTO audit_log
(
table_name,
record_id,
action,
details,
created_at
)

VALUES
(
TG_TABLE_NAME,
NEW.id,
'create',
to_jsonb(NEW),
NOW()
);

RETURN NEW;

END IF;

END;
$$
LANGUAGE plpgsql;

-- ============================================================
-- COMPANIES
-- ============================================================

CREATE TABLE companies
(
    id              SERIAL PRIMARY KEY,

    name            VARCHAR(150)
                    NOT NULL,

    gst_number      VARCHAR(30),

    email           VARCHAR(150),

    phone           VARCHAR(30),

    address         TEXT,

    logo_path       VARCHAR(500),

    is_active       BOOLEAN
                    NOT NULL
                    DEFAULT TRUE,

    created_at      TIMESTAMPTZ
                    NOT NULL
                    DEFAULT NOW(),

    updated_at      TIMESTAMPTZ
                    NOT NULL
                    DEFAULT NOW(),

    CONSTRAINT uq_company_name
    UNIQUE(name)
);

-- ============================================================
-- EMPLOYEES
-- ============================================================

CREATE TABLE employees
(

    id                  SERIAL PRIMARY KEY,

    company_id          INTEGER
                        NOT NULL
                        REFERENCES companies(id)
                        ON DELETE CASCADE,

    employee_code       VARCHAR(30)
                        NOT NULL,

    full_name           VARCHAR(150)
                        NOT NULL,

    phone               VARCHAR(20),

    email               VARCHAR(150),

    aadhaar_number      VARCHAR(20),

    pan_number          VARCHAR(20),

    trade_role          VARCHAR(100),

    monthly_salary      NUMERIC(12,2)
                        NOT NULL
                        DEFAULT 0,

    joining_date        DATE,

    leaving_date        DATE,

    emergency_contact   VARCHAR(20),

    address             TEXT,

    is_active           BOOLEAN
                        DEFAULT TRUE,

    created_at          TIMESTAMPTZ
                        NOT NULL
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        NOT NULL
                        DEFAULT NOW(),

    CONSTRAINT uq_employee_code
    UNIQUE(company_id,employee_code)
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users
(

    id                  SERIAL PRIMARY KEY,

    company_id          INTEGER
                        REFERENCES companies(id)
                        ON DELETE CASCADE,

    employee_id         INTEGER
                        REFERENCES employees(id)
                        ON DELETE SET NULL,

    login_id            VARCHAR(60)
                        NOT NULL,

    password_hash       VARCHAR(255)
                        NOT NULL,

    full_name           VARCHAR(150)
                        NOT NULL,

    role                role_type
                        NOT NULL,

    must_reset_password BOOLEAN
                        NOT NULL
                        DEFAULT TRUE,

    last_login          TIMESTAMPTZ,

    failed_attempts     INTEGER
                        DEFAULT 0,

    is_locked           BOOLEAN
                        DEFAULT FALSE,

    is_active           BOOLEAN
                        DEFAULT TRUE,

    created_at          TIMESTAMPTZ
                        NOT NULL
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        NOT NULL
                        DEFAULT NOW(),

    CONSTRAINT uq_login
    UNIQUE(login_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_employee_company
ON employees(company_id);

CREATE INDEX idx_employee_name
ON employees(full_name);

CREATE INDEX idx_users_company
ON users(company_id);

CREATE INDEX idx_users_employee
ON users(employee_id);

CREATE INDEX idx_users_role
ON users(role);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_company_updated
BEFORE UPDATE
ON companies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_employee_updated
BEFORE UPDATE
ON employees
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_updated
BEFORE UPDATE
ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE projects
(

    id                      SERIAL PRIMARY KEY,

    company_id              INTEGER
                            NOT NULL
                            REFERENCES companies(id)
                            ON DELETE CASCADE,

    parent_project_id       INTEGER
                            REFERENCES projects(id)
                            ON DELETE CASCADE,

    project_code            VARCHAR(30) NOT NULL,

    name                    VARCHAR(200) NOT NULL,

    description             TEXT,

    client_name             VARCHAR(150),

    tender_reference        VARCHAR(100),

    estimated_budget        NUMERIC(15,2)
                            DEFAULT 0,

    spent_budget            NUMERIC(15,2)
                            DEFAULT 0,

    progress_percent        SMALLINT
                            NOT NULL
                            DEFAULT 0
                            CHECK
                            (
                                progress_percent BETWEEN 0 AND 100
                            ),

    status                  project_status
                            NOT NULL
                            DEFAULT 'ongoing',

    start_date              DATE,

    expected_end_date       DATE,

    actual_end_date         DATE,

    created_by              INTEGER
                            REFERENCES users(id)
                            ON DELETE SET NULL,

    created_at              TIMESTAMPTZ
                            NOT NULL
                            DEFAULT NOW(),

    updated_at              TIMESTAMPTZ
                            NOT NULL
                            DEFAULT NOW(),

    CONSTRAINT uq_project_code
    UNIQUE(company_id,project_code)

);

-- ============================================================
-- PROJECT PROGRESS HISTORY
-- ============================================================

CREATE TABLE project_progress_updates
(

    id                  SERIAL PRIMARY KEY,

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    progress_percent    SMALLINT
                        CHECK
                        (
                            progress_percent BETWEEN 0 AND 100
                        ),

    note                TEXT NOT NULL,

    posted_by           INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        NOT NULL
                        DEFAULT NOW()

);

-- ============================================================
-- SITES
-- ============================================================

CREATE TABLE sites
(

    id                  SERIAL PRIMARY KEY,

    company_id          INTEGER
                        NOT NULL
                        REFERENCES companies(id)
                        ON DELETE CASCADE,

    site_code           VARCHAR(30) NOT NULL,

    name                VARCHAR(150)
                        NOT NULL,

    address             TEXT,

    city                VARCHAR(100),

    state               VARCHAR(100),

    pincode             VARCHAR(15),

    latitude            NUMERIC(10,7),

    longitude           NUMERIC(10,7),

    created_at          TIMESTAMPTZ
                        NOT NULL
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        NOT NULL
                        DEFAULT NOW(),

    CONSTRAINT uq_site_code
    UNIQUE(company_id,site_code)

);

-- ============================================================
-- PROJECT ↔ SITE
-- ============================================================

CREATE TABLE project_sites
(

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    site_id             INTEGER
                        NOT NULL
                        REFERENCES sites(id)
                        ON DELETE CASCADE,

    assigned_at         TIMESTAMPTZ
                        DEFAULT NOW(),

    PRIMARY KEY(project_id,site_id)

);

-- ============================================================
-- PROJECT SUPERVISORS
-- ============================================================

CREATE TABLE project_supervisors
(

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    user_id             INTEGER
                        NOT NULL
                        REFERENCES users(id)
                        ON DELETE CASCADE,

    assigned_at         TIMESTAMPTZ
                        DEFAULT NOW(),

    PRIMARY KEY(project_id,user_id)

);

-- ============================================================
-- PROJECT EMPLOYEES
-- ============================================================

CREATE TABLE project_employees
(

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    employee_id         INTEGER
                        NOT NULL
                        REFERENCES employees(id)
                        ON DELETE CASCADE,

    assigned_date       DATE
                        NOT NULL
                        DEFAULT CURRENT_DATE,

    removed_date        DATE,

    daily_wage_override NUMERIC(10,2),

    PRIMARY KEY(project_id,employee_id)

);

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE attendance
(

    id                  SERIAL PRIMARY KEY,

    employee_id         INTEGER
                        NOT NULL
                        REFERENCES employees(id)
                        ON DELETE CASCADE,

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    attendance_date     DATE
                        NOT NULL,

    status              attendance_status
                        NOT NULL,

    check_in            TIMESTAMP,

    check_out           TIMESTAMP,

    overtime_hours      NUMERIC(5,2)
                        DEFAULT 0,

    remarks             TEXT,

    marked_by           INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        NOT NULL
                        DEFAULT NOW(),

    UNIQUE
    (
        employee_id,
        attendance_date
    )

);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_projects_company
ON projects(company_id);

CREATE INDEX idx_projects_parent
ON projects(parent_project_id);

CREATE INDEX idx_projects_status
ON projects(status);

CREATE INDEX idx_projects_dates
ON projects(start_date,expected_end_date);

CREATE INDEX idx_project_updates
ON project_progress_updates(project_id);

CREATE INDEX idx_sites_company
ON sites(company_id);

CREATE INDEX idx_project_employee
ON project_employees(employee_id);

CREATE INDEX idx_project_supervisor
ON project_supervisors(user_id);

CREATE INDEX idx_attendance_employee
ON attendance(employee_id);

CREATE INDEX idx_attendance_project
ON attendance(project_id);

CREATE INDEX idx_attendance_date
ON attendance(attendance_date);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_projects_updated
BEFORE UPDATE
ON projects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sites_updated
BEFORE UPDATE
ON sites
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- AUDIT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_projects_audit
AFTER INSERT OR UPDATE OR DELETE
ON projects
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_employees_audit
AFTER INSERT OR UPDATE OR DELETE
ON employees
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_users_audit
AFTER INSERT OR UPDATE OR DELETE
ON users
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();



-- ============================================================
-- SALARY PAYMENTS
-- ============================================================

CREATE TABLE salary_payments
(

    id                  SERIAL PRIMARY KEY,

    employee_id         INTEGER
                        NOT NULL
                        REFERENCES employees(id)
                        ON DELETE CASCADE,

    pay_month           SMALLINT
                        NOT NULL
                        CHECK (pay_month BETWEEN 1 AND 12),

    pay_year            SMALLINT
                        NOT NULL,

    base_salary         NUMERIC(12,2)
                        NOT NULL,

    bonus               NUMERIC(12,2)
                        DEFAULT 0,

    deduction           NUMERIC(12,2)
                        DEFAULT 0,

    overtime_amount     NUMERIC(12,2)
                        DEFAULT 0,

    total_amount        NUMERIC(12,2)
                        NOT NULL,

    total_paid          NUMERIC(12,2)
                        NOT NULL
                        DEFAULT 0,

    status              payment_status
                        DEFAULT 'pending',

    remarks             TEXT,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    CONSTRAINT uq_salary_month
    UNIQUE(employee_id,pay_month,pay_year)

);

-- ============================================================
-- SALARY PAYMENT TRANSACTIONS
-- ============================================================

CREATE TABLE salary_payment_transactions
(

    id                  SERIAL PRIMARY KEY,

    salary_payment_id   INTEGER
                        NOT NULL
                        REFERENCES salary_payments(id)
                        ON DELETE CASCADE,

    amount              NUMERIC(12,2)
                        NOT NULL,

    payment_mode        VARCHAR(30),

    transaction_no      VARCHAR(100),

    payment_date        DATE
                        NOT NULL
                        DEFAULT CURRENT_DATE,

    notes               TEXT,

    marked_by           INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- BILLS
-- ============================================================

CREATE TABLE bills
(

    id                  SERIAL PRIMARY KEY,

    company_id          INTEGER
                        NOT NULL
                        REFERENCES companies(id)
                        ON DELETE CASCADE,

    project_id          INTEGER
                        REFERENCES projects(id)
                        ON DELETE SET NULL,

    bill_number         VARCHAR(100),

    bill_type           bill_type
                        NOT NULL,

    vendor_name         VARCHAR(150),

    description         TEXT
                        NOT NULL,

    amount              NUMERIC(12,2)
                        NOT NULL,

    gst_amount          NUMERIC(12,2)
                        DEFAULT 0,

    payment_status      payment_status
                        DEFAULT 'pending',

    payment_date        DATE,

    bill_date           DATE
                        DEFAULT CURRENT_DATE,

    file_path           VARCHAR(500),

    created_by          INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- EMPLOYEE REQUESTS
-- ============================================================

CREATE TABLE employee_requests
(

    id                  SERIAL PRIMARY KEY,

    requested_by        INTEGER
                        NOT NULL
                        REFERENCES users(id)
                        ON DELETE CASCADE,

    project_id          INTEGER
                        REFERENCES projects(id)
                        ON DELETE SET NULL,

    full_name           VARCHAR(150)
                        NOT NULL,

    phone               VARCHAR(20),

    trade_role          VARCHAR(100),

    expected_salary     NUMERIC(12,2),

    status              approval_status
                        DEFAULT 'pending',

    reviewed_by         INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    reviewed_at         TIMESTAMPTZ,

    rejection_reason    TEXT,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log
(

    id                  BIGSERIAL PRIMARY KEY,

    table_name          VARCHAR(100)
                        NOT NULL,

    record_id           BIGINT
                        NOT NULL,

    action              VARCHAR(20)
                        NOT NULL,

    details             JSONB,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- CONVERSATIONS
-- ============================================================

CREATE TABLE conversations
(

    id                  SERIAL PRIMARY KEY,

    type                conversation_type
                        NOT NULL,

    project_id          INTEGER
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    created_by          INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- CONVERSATION PARTICIPANTS
-- ============================================================

CREATE TABLE conversation_participants
(

    conversation_id     INTEGER
                        REFERENCES conversations(id)
                        ON DELETE CASCADE,

    user_id             INTEGER
                        REFERENCES users(id)
                        ON DELETE CASCADE,

    joined_at           TIMESTAMPTZ
                        DEFAULT NOW(),

    PRIMARY KEY
    (
        conversation_id,
        user_id
    )

);

-- ============================================================
-- MESSAGES
-- ============================================================

CREATE TABLE messages
(

    id                  BIGSERIAL PRIMARY KEY,

    conversation_id     INTEGER
                        NOT NULL
                        REFERENCES conversations(id)
                        ON DELETE CASCADE,

    sender_id           INTEGER
                        NOT NULL
                        REFERENCES users(id)
                        ON DELETE CASCADE,

    message_text        TEXT,

    attachment_path     VARCHAR(500),

    is_edited           BOOLEAN
                        DEFAULT FALSE,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_salary_employee
ON salary_payments(employee_id);

CREATE INDEX idx_salary_status
ON salary_payments(status);

CREATE INDEX idx_salary_year_month
ON salary_payments(pay_year,pay_month);

CREATE INDEX idx_salary_transaction
ON salary_payment_transactions(salary_payment_id);

CREATE INDEX idx_bill_company
ON bills(company_id);

CREATE INDEX idx_bill_project
ON bills(project_id);

CREATE INDEX idx_bill_status
ON bills(payment_status);

CREATE INDEX idx_employee_request
ON employee_requests(status);

CREATE INDEX idx_audit_table
ON audit_log(table_name);

CREATE INDEX idx_audit_record
ON audit_log(record_id);

CREATE INDEX idx_messages_conversation
ON messages(conversation_id);

CREATE INDEX idx_messages_sender
ON messages(sender_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_salary_updated
BEFORE UPDATE
ON salary_payments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bill_updated
BEFORE UPDATE
ON bills
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_message_updated
BEFORE UPDATE
ON messages
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- AUDIT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_salary_audit
AFTER INSERT OR UPDATE OR DELETE
ON salary_payments
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_bill_audit
AFTER INSERT OR UPDATE OR DELETE
ON bills
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_message_audit
AFTER INSERT OR UPDATE OR DELETE
ON messages
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();

-- ============================================================
-- MATERIAL MASTER
-- ============================================================

CREATE TABLE materials
(

    id                  SERIAL PRIMARY KEY,

    company_id          INTEGER
                        NOT NULL
                        REFERENCES companies(id)
                        ON DELETE CASCADE,

    material_code       VARCHAR(30)
                        NOT NULL,

    name                VARCHAR(150)
                        NOT NULL,

    category            VARCHAR(100),

    unit                VARCHAR(30)
                        NOT NULL,

    minimum_stock       NUMERIC(12,2)
                        DEFAULT 0,

    description         TEXT,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    CONSTRAINT uq_material_code
    UNIQUE(company_id,material_code),

    CONSTRAINT uq_material_name
    UNIQUE(company_id,name)

);

-- ============================================================
-- MATERIAL RECEIPTS
-- ============================================================

CREATE TABLE material_receipts
(

    id                  SERIAL PRIMARY KEY,

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    material_id         INTEGER
                        NOT NULL
                        REFERENCES materials(id)
                        ON DELETE CASCADE,

    vendor_id           INTEGER,

    quantity            NUMERIC(12,2)
                        NOT NULL,

    unit_price          NUMERIC(12,2)
                        DEFAULT 0,

    total_cost          NUMERIC(12,2)
                        DEFAULT 0,

    invoice_number      VARCHAR(100),

    receipt_date        DATE
                        DEFAULT CURRENT_DATE,

    notes               TEXT,

    received_by         INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- MATERIAL ISSUES
-- ============================================================

CREATE TABLE material_issues
(

    id                  SERIAL PRIMARY KEY,

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    material_id         INTEGER
                        NOT NULL
                        REFERENCES materials(id)
                        ON DELETE CASCADE,

    quantity            NUMERIC(12,2)
                        NOT NULL,

    issued_to           VARCHAR(150),

    issue_date          DATE
                        DEFAULT CURRENT_DATE,

    notes               TEXT,

    issued_by           INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- VENDORS
-- ============================================================

CREATE TABLE vendors
(

    id                  SERIAL PRIMARY KEY,

    company_id          INTEGER
                        NOT NULL
                        REFERENCES companies(id)
                        ON DELETE CASCADE,

    vendor_code         VARCHAR(30)
                        NOT NULL,

    name                VARCHAR(150)
                        NOT NULL,

    contact_person      VARCHAR(100),

    phone               VARCHAR(20),

    email               VARCHAR(150),

    gst_number          VARCHAR(30),

    address             TEXT,

    remarks             TEXT,

    is_active           BOOLEAN
                        DEFAULT TRUE,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    CONSTRAINT uq_vendor_code
    UNIQUE(company_id,vendor_code)

);

-- ============================================================
-- PURCHASE REQUESTS
-- ============================================================

CREATE TABLE purchase_requests
(

    id                  SERIAL PRIMARY KEY,

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    requested_by        INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    description         TEXT
                        NOT NULL,

    estimated_cost      NUMERIC(12,2),

    status              approval_status
                        DEFAULT 'pending',

    reviewed_by         INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    reviewed_at         TIMESTAMPTZ,

    rejection_reason    TEXT,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================

CREATE TABLE purchase_orders
(

    id                  SERIAL PRIMARY KEY,

    pr_id               INTEGER
                        REFERENCES purchase_requests(id)
                        ON DELETE SET NULL,

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    vendor_id           INTEGER
                        NOT NULL
                        REFERENCES vendors(id)
                        ON DELETE CASCADE,

    po_number           VARCHAR(50)
                        NOT NULL,

    description         TEXT,

    amount              NUMERIC(12,2)
                        NOT NULL,

    status              VARCHAR(30)
                        DEFAULT 'open'
                        CHECK
                        (
                            status IN
                            (
                                'open',
                                'partially_received',
                                'closed',
                                'cancelled'
                            )
                        ),

    created_by          INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    CONSTRAINT uq_po_number
    UNIQUE(po_number)

);

-- ============================================================
-- GOODS RECEIPT NOTE
-- ============================================================

CREATE TABLE grns
(

    id                  SERIAL PRIMARY KEY,

    po_id               INTEGER
                        NOT NULL
                        REFERENCES purchase_orders(id)
                        ON DELETE CASCADE,

    grn_number          VARCHAR(50)
                        NOT NULL,

    received_date       DATE
                        DEFAULT CURRENT_DATE,

    description         TEXT,

    received_by         INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    CONSTRAINT uq_grn
    UNIQUE(grn_number)

);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_material_company
ON materials(company_id);

CREATE INDEX idx_material_name
ON materials(name);

CREATE INDEX idx_material_receipt_project
ON material_receipts(project_id);

CREATE INDEX idx_material_receipt_material
ON material_receipts(material_id);

CREATE INDEX idx_material_issue_project
ON material_issues(project_id);

CREATE INDEX idx_material_issue_material
ON material_issues(material_id);

CREATE INDEX idx_vendor_company
ON vendors(company_id);

CREATE INDEX idx_vendor_name
ON vendors(name);

CREATE INDEX idx_pr_project
ON purchase_requests(project_id);

CREATE INDEX idx_pr_status
ON purchase_requests(status);

CREATE INDEX idx_po_project
ON purchase_orders(project_id);

CREATE INDEX idx_po_vendor
ON purchase_orders(vendor_id);

CREATE INDEX idx_grn_po
ON grns(po_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_material_updated
BEFORE UPDATE
ON materials
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vendor_updated
BEFORE UPDATE
ON vendors
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_po_updated
BEFORE UPDATE
ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- AUDIT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_material_audit
AFTER INSERT OR UPDATE OR DELETE
ON materials
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_vendor_audit
AFTER INSERT OR UPDATE OR DELETE
ON vendors
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_po_audit
AFTER INSERT OR UPDATE OR DELETE
ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();



-- ============================================================
-- EQUIPMENT
-- ============================================================

CREATE TABLE equipment
(

    id                  SERIAL PRIMARY KEY,

    company_id          INTEGER
                        NOT NULL
                        REFERENCES companies(id)
                        ON DELETE CASCADE,

    project_id          INTEGER
                        REFERENCES projects(id)
                        ON DELETE SET NULL,

    equipment_code      VARCHAR(30)
                        NOT NULL,

    name                VARCHAR(150)
                        NOT NULL,

    equipment_type      VARCHAR(100),

    manufacturer        VARCHAR(100),

    model_number        VARCHAR(100),

    serial_number       VARCHAR(100),

    registration_number VARCHAR(100),

    purchase_date       DATE,

    purchase_cost       NUMERIC(15,2),

    current_value       NUMERIC(15,2),

    status              VARCHAR(30)
                        DEFAULT 'active'
                        CHECK
                        (
                            status IN
                            (
                                'active',
                                'idle',
                                'maintenance',
                                'breakdown',
                                'retired'
                            )
                        ),

    remarks             TEXT,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    CONSTRAINT uq_equipment_code
    UNIQUE(company_id,equipment_code)

);

-- ============================================================
-- EQUIPMENT FUEL LOGS
-- ============================================================

CREATE TABLE equipment_fuel_logs
(

    id                  SERIAL PRIMARY KEY,

    equipment_id        INTEGER
                        NOT NULL
                        REFERENCES equipment(id)
                        ON DELETE CASCADE,

    fuel_date           DATE
                        NOT NULL
                        DEFAULT CURRENT_DATE,

    quantity            NUMERIC(10,2)
                        NOT NULL,

    rate_per_litre      NUMERIC(10,2),

    total_cost          NUMERIC(12,2),

    meter_reading       NUMERIC(12,2),

    notes               TEXT,

    logged_by           INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- MAINTENANCE LOG
-- ============================================================

CREATE TABLE equipment_maintenance
(

    id                  SERIAL PRIMARY KEY,

    equipment_id        INTEGER
                        NOT NULL
                        REFERENCES equipment(id)
                        ON DELETE CASCADE,

    maintenance_date    DATE
                        NOT NULL
                        DEFAULT CURRENT_DATE,

    description         TEXT
                        NOT NULL,

    cost                NUMERIC(12,2),

    vendor_name         VARCHAR(150),

    next_due_date       DATE,

    logged_by           INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- BREAKDOWN LOG
-- ============================================================

CREATE TABLE equipment_breakdowns
(

    id                  SERIAL PRIMARY KEY,

    equipment_id        INTEGER
                        NOT NULL
                        REFERENCES equipment(id)
                        ON DELETE CASCADE,

    breakdown_date      DATE
                        DEFAULT CURRENT_DATE,

    description         TEXT
                        NOT NULL,

    resolved            BOOLEAN
                        DEFAULT FALSE,

    resolved_date       DATE,

    resolution_notes    TEXT,

    reported_by         INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- ATTENDANCE SHEET UPLOADS
-- ============================================================

CREATE TABLE attendance_uploads
(

    id                  SERIAL PRIMARY KEY,

    site_id             INTEGER
                        NOT NULL
                        REFERENCES sites(id)
                        ON DELETE CASCADE,

    upload_date         DATE
                        DEFAULT CURRENT_DATE,

    file_path           VARCHAR(500)
                        NOT NULL,

    file_type           VARCHAR(20)
                        CHECK(file_type IN ('image','pdf')),

    notes               TEXT,

    uploaded_by         INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- DAILY PROGRESS REPORT
-- ============================================================

CREATE TABLE dpr_entries
(

    id                  SERIAL PRIMARY KEY,

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    report_date         DATE
                        DEFAULT CURRENT_DATE,

    weather             VARCHAR(50),

    manpower_count      INTEGER,

    work_summary        TEXT
                        NOT NULL,

    notes               TEXT,

    submitted_by        INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    UNIQUE(project_id,report_date)

);

-- ============================================================
-- DPR PHOTOS
-- ============================================================

CREATE TABLE dpr_photos
(

    id                  SERIAL PRIMARY KEY,

    dpr_id              INTEGER
                        NOT NULL
                        REFERENCES dpr_entries(id)
                        ON DELETE CASCADE,

    image_path          VARCHAR(500)
                        NOT NULL,

    caption             VARCHAR(255),

    uploaded_by         INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents
(

    id                  SERIAL PRIMARY KEY,

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    document_number     VARCHAR(50),

    title               VARCHAR(200)
                        NOT NULL,

    document_type       VARCHAR(30)
                        CHECK
                        (
                            document_type IN
                            (
                                'drawing',
                                'specification',
                                'contract',
                                'report',
                                'other'
                            )
                        ),

    category            VARCHAR(100),

    revision_no         INTEGER
                        DEFAULT 1,

    status              VARCHAR(30)
                        DEFAULT 'approved'
                        CHECK
                        (
                            status IN
                            (
                                'approved',
                                'under_review',
                                'superseded'
                            )
                        ),

    file_path           VARCHAR(500)
                        NOT NULL,

    uploaded_by         INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- DOCUMENT REVISIONS
-- ============================================================

CREATE TABLE document_revisions
(

    id                  SERIAL PRIMARY KEY,

    document_id         INTEGER
                        NOT NULL
                        REFERENCES documents(id)
                        ON DELETE CASCADE,

    revision_no         INTEGER
                        NOT NULL,

    file_path           VARCHAR(500)
                        NOT NULL,

    notes               TEXT,

    uploaded_by         INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- BOQ
-- ============================================================

CREATE TABLE boq_items
(

    id                  SERIAL PRIMARY KEY,

    project_id          INTEGER
                        NOT NULL
                        REFERENCES projects(id)
                        ON DELETE CASCADE,

    item_no             VARCHAR(20),

    description         TEXT
                        NOT NULL,

    unit                VARCHAR(30),

    quantity            NUMERIC(12,2)
                        DEFAULT 0,

    rate                NUMERIC(12,2)
                        DEFAULT 0,

    amount              NUMERIC(12,2)
                        GENERATED ALWAYS AS
                        (
                            quantity * rate
                        ) STORED,

    created_by          INTEGER
                        REFERENCES users(id)
                        ON DELETE SET NULL,

    created_at          TIMESTAMPTZ
                        DEFAULT NOW(),

    updated_at          TIMESTAMPTZ
                        DEFAULT NOW()

);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_equipment_company ON equipment(company_id);
CREATE INDEX idx_equipment_project ON equipment(project_id);
CREATE INDEX idx_equipment_status ON equipment(status);

CREATE INDEX idx_fuel_equipment ON equipment_fuel_logs(equipment_id);
CREATE INDEX idx_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX idx_breakdown_equipment ON equipment_breakdowns(equipment_id);

CREATE INDEX idx_attendance_upload_site
ON attendance_uploads(site_id);

CREATE INDEX idx_dpr_project
ON dpr_entries(project_id);

CREATE INDEX idx_documents_project
ON documents(project_id);

CREATE INDEX idx_document_revision
ON document_revisions(document_id);

CREATE INDEX idx_boq_project
ON boq_items(project_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_equipment_updated
BEFORE UPDATE ON equipment
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_document_updated
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_boq_updated
BEFORE UPDATE ON boq_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- AUDIT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_equipment_audit
AFTER INSERT OR UPDATE OR DELETE
ON equipment
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_documents_audit
AFTER INSERT OR UPDATE OR DELETE
ON documents
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_boq_audit
AFTER INSERT OR UPDATE OR DELETE
ON boq_items
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();


-- ============================================================
-- CURRENT MATERIAL STOCK
-- ============================================================

CREATE OR REPLACE VIEW vw_material_stock AS

SELECT

    m.id,
    m.company_id,
    m.material_code,
    m.name,
    m.unit,

    COALESCE
    (
        (
            SELECT SUM(quantity)
            FROM material_receipts r
            WHERE r.material_id = m.id
        ),
        0
    )
    -

    COALESCE
    (
        (
            SELECT SUM(quantity)
            FROM material_issues i
            WHERE i.material_id = m.id
        ),
        0
    )

    AS current_stock

FROM materials m;

-- ============================================================
-- PAYROLL SUMMARY
-- ============================================================

CREATE OR REPLACE VIEW vw_salary_summary AS

SELECT

    e.employee_code,

    e.full_name,

    s.pay_month,

    s.pay_year,

    s.total_amount,

    s.total_paid,

    s.status

FROM salary_payments s

JOIN employees e
ON e.id=s.employee_id;

-- ============================================================
-- PROJECT DASHBOARD
-- ============================================================

CREATE OR REPLACE VIEW vw_project_dashboard AS

SELECT

p.id,

p.project_code,

p.name,

p.status,

p.progress_percent,

COUNT(DISTINCT pe.employee_id) employees,

COUNT(DISTINCT ps.site_id) sites

FROM projects p

LEFT JOIN project_employees pe
ON pe.project_id=p.id

LEFT JOIN project_sites ps
ON ps.project_id=p.id

GROUP BY

p.id,
p.project_code,
p.name,
p.status,
p.progress_percent;

-- ============================================================
-- SEED DATA
-- ============================================================

---------------------------------------------------------------
-- COMPANY
---------------------------------------------------------------

INSERT INTO companies
(
name,
email,
phone
)

VALUES
(
'Demo Construction Pvt Ltd',
'admin@construction.local',
'9999999999'
);

---------------------------------------------------------------
-- SUPER ADMIN
---------------------------------------------------------------

INSERT INTO users
(
company_id,
login_id,
password_hash,
full_name,
role,
must_reset_password
)

VALUES
(
NULL,
'superadmin',

crypt
(
'admin123',
gen_salt('bf')
),

'Platform Administrator',

'super_admin',

FALSE
);

---------------------------------------------------------------
-- COMPANY HEAD
---------------------------------------------------------------

INSERT INTO users
(
company_id,
login_id,
password_hash,
full_name,
role,
must_reset_password
)

VALUES
(
1,

'companyhead',

crypt
(
'company123',
gen_salt('bf')
),

'Company Head',

'company_head',

FALSE
);

---------------------------------------------------------------
-- SUPERVISOR
---------------------------------------------------------------

INSERT INTO users
(
company_id,
login_id,
password_hash,
full_name,
role,
must_reset_password
)

VALUES
(
1,

'supervisor',

crypt
(
'supervisor123',
gen_salt('bf')
),

'Site Supervisor',

'supervisor',

FALSE
);

---------------------------------------------------------------
-- EMPLOYEES
---------------------------------------------------------------

INSERT INTO employees
(
company_id,
employee_code,
full_name,
phone,
trade_role,
monthly_salary
)

VALUES

(1,'EMP001','Rahul Sharma','9991111111','Mason',22000),

(1,'EMP002','Amit Kumar','9992222222','Electrician',25000),

(1,'EMP003','Rakesh Singh','9993333333','Helper',17000),

(1,'EMP004','Sohan Lal','9994444444','Welder',26000),

(1,'EMP005','Deepak Verma','9995555555','Plumber',23000);

---------------------------------------------------------------
-- PROJECT
---------------------------------------------------------------

INSERT INTO projects
(
company_id,
project_code,
name,
description,
client_name,
estimated_budget,
status
)

VALUES
(
1,

'PRJ001',

'Corporate Office Building',

'Construction of G+8 Commercial Building',

'ABC Developers',

150000000,

'ongoing'
);

---------------------------------------------------------------
-- SITE
---------------------------------------------------------------

INSERT INTO sites
(
company_id,
site_code,
name,
city,
state
)

VALUES
(
1,

'SITE001',

'Delhi Head Site',

'New Delhi',

'Delhi'
);

---------------------------------------------------------------
-- PROJECT SITE
---------------------------------------------------------------

INSERT INTO project_sites

VALUES
(
1,
1,
NOW()
);

---------------------------------------------------------------
-- SUPERVISOR ASSIGNMENT
---------------------------------------------------------------

INSERT INTO project_supervisors

VALUES
(
1,
3,
NOW()
);

---------------------------------------------------------------
-- EMPLOYEE ASSIGNMENTS
---------------------------------------------------------------

INSERT INTO project_employees
(
project_id,
employee_id
)

VALUES

(1,1),

(1,2),

(1,3),

(1,4),

(1,5);

---------------------------------------------------------------
-- MATERIALS
---------------------------------------------------------------

INSERT INTO materials
(
company_id,
material_code,
name,
category,
unit
)

VALUES

(1,'MAT001','Cement','Civil','Bag'),

(1,'MAT002','Sand','Civil','Ton'),

(1,'MAT003','Steel','Civil','Kg'),

(1,'MAT004','Bricks','Civil','Nos'),

(1,'MAT005','Aggregate','Civil','Ton');

---------------------------------------------------------------
-- VENDOR
---------------------------------------------------------------

INSERT INTO vendors
(
company_id,
vendor_code,
name,
contact_person,
phone
)

VALUES
(
1,

'VEND001',

'Sharma Building Suppliers',

'Raj Sharma',

'9876543210'
);

---------------------------------------------------------------
-- PURCHASE REQUEST
---------------------------------------------------------------

INSERT INTO purchase_requests
(
project_id,
requested_by,
description,
estimated_cost
)

VALUES
(
1,

3,

'Purchase Cement and Steel',

500000
);

---------------------------------------------------------------
-- PURCHASE ORDER
---------------------------------------------------------------

INSERT INTO purchase_orders
(
pr_id,
project_id,
vendor_id,
po_number,
description,
amount,
created_by
)

VALUES
(
1,

1,

1,

'PO-2026-001',

'Initial Material Purchase',

500000,

2
);

---------------------------------------------------------------
-- GOODS RECEIPT
---------------------------------------------------------------

INSERT INTO grns
(
po_id,
grn_number,
description,
received_by
)

VALUES
(
1,

'GRN-001',

'Initial Delivery',

3
);

---------------------------------------------------------------
-- SAMPLE RECEIPTS
---------------------------------------------------------------

INSERT INTO material_receipts
(
project_id,
material_id,
vendor_id,
quantity,
unit_price,
total_cost,
received_by
)

VALUES

(1,1,1,500,420,210000,3),

(1,2,1,60,1800,108000,3),

(1,3,1,2500,72,180000,3);

---------------------------------------------------------------
-- SAMPLE ATTENDANCE
---------------------------------------------------------------

INSERT INTO attendance
(
employee_id,
project_id,
attendance_date,
status,
marked_by
)

SELECT

id,

1,

CURRENT_DATE,

'present',

3

FROM employees;

---------------------------------------------------------------
-- SAMPLE DPR
---------------------------------------------------------------

INSERT INTO dpr_entries
(
project_id,
work_summary,
weather,
manpower_count,
submitted_by
)

VALUES
(
1,

'Foundation work completed successfully.',

'Sunny',

25,

3
);

---------------------------------------------------------------
-- SAMPLE BILL
---------------------------------------------------------------

INSERT INTO bills
(
company_id,
project_id,
bill_type,
description,
amount,
created_by
)

VALUES
(
1,

1,

'material',

'Initial Cement Purchase',

210000,

2
);

---------------------------------------------------------------
-- SAMPLE CONVERSATION
---------------------------------------------------------------

INSERT INTO conversations
(
type,
project_id,
created_by
)

VALUES
(
'group',

1,

3
);

---------------------------------------------------------------
-- PARTICIPANTS
---------------------------------------------------------------

INSERT INTO conversation_participants

VALUES

(1,2,NOW()),

(1,3,NOW());

---------------------------------------------------------------
-- FIRST MESSAGE
---------------------------------------------------------------

INSERT INTO messages
(
conversation_id,
sender_id,
message_text
)

VALUES
(
1,

3,

'Welcome to the project communication group.'
);

---------------------------------------------------------------
-- COMMIT
---------------------------------------------------------------

COMMIT;

-- ============================================================
-- END OF SCHEMA.SQL
-- ============================================================
