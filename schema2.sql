-- ============================================================
-- Construction Company Management System
-- PostgreSQL 15+
-- Production Ready Schema
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
-- ENUM TYPES
-- ============================================================

CREATE TYPE role_type AS ENUM (
    'super_admin',
    'company_head',
    'supervisor',
    'employee'
);

CREATE TYPE project_status AS ENUM (
    'ongoing',
    'completed',
    'cancelled',
    'on_hold'
);

CREATE TYPE attendance_status AS ENUM (
    'present',
    'absent',
    'leave',
    'half_day'
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'partial',
    'paid'
);

CREATE TYPE bill_type AS ENUM (
    'material',
    'vendor',
    'salary',
    'misc'
);

CREATE TYPE approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

CREATE TYPE conversation_type AS ENUM (
    'group',
    'direct'
);

-- ============================================================
-- COMMON FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- AUDIT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER
AS $$
BEGIN

    IF TG_OP = 'DELETE' THEN

        INSERT INTO audit_log (
            table_name,
            record_id,
            action,
            details,
            created_at
        )
        VALUES (
            TG_TABLE_NAME,
            OLD.id,
            'delete',
            to_jsonb(OLD),
            NOW()
        );

        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN

        INSERT INTO audit_log (
            table_name,
            record_id,
            action,
            details,
            created_at
        )
        VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'update',
            jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW)
            ),
            NOW()
        );

        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN

        INSERT INTO audit_log (
            table_name,
            record_id,
            action,
            details,
            created_at
        )
        VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'insert',
            to_jsonb(NEW),
            NOW()
        );

        RETURN NEW;

    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMPANIES
-- ============================================================

CREATE TABLE companies (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    gst_number      VARCHAR(30),
    email           VARCHAR(150),
    phone           VARCHAR(30),
    address         TEXT,
    logo_path       VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_company_name
        UNIQUE (name)
);

-- ============================================================
-- EMPLOYEES
-- ============================================================

CREATE TABLE employees (
    id                  SERIAL PRIMARY KEY,

    company_id          INTEGER NOT NULL
                            REFERENCES companies(id)
                            ON DELETE CASCADE,

    employee_code       VARCHAR(30) NOT NULL,
    full_name           VARCHAR(150) NOT NULL,
    phone               VARCHAR(20),
    email               VARCHAR(150),
    aadhaar_number      VARCHAR(20),
    pan_number          VARCHAR(20),
    trade_role          VARCHAR(100),
    monthly_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
    joining_date        DATE,
    leaving_date        DATE,
    emergency_contact   VARCHAR(20),
    address             TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_employee_code
        UNIQUE (company_id, employee_code)
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id                      SERIAL PRIMARY KEY,

    company_id              INTEGER
                                REFERENCES companies(id)
                                ON DELETE CASCADE,

    employee_id             INTEGER
                                REFERENCES employees(id)
                                ON DELETE SET NULL,

    login_id                VARCHAR(60) NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    full_name               VARCHAR(150) NOT NULL,
    role                    role_type NOT NULL,
    must_reset_password     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login              TIMESTAMPTZ,
    failed_attempts         INTEGER DEFAULT 0,
    is_locked               BOOLEAN DEFAULT FALSE,
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_login
        UNIQUE (login_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_employee_company ON employees(company_id);
CREATE INDEX idx_employee_name ON employees(full_name);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_employee ON users(employee_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_company_updated
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_employee_updated
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_updated
BEFORE UPDATE ON users
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
        UNIQUE (company_id, project_code)

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
        UNIQUE (company_id, site_code)

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

    PRIMARY KEY (project_id, site_id)

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

    PRIMARY KEY (project_id, user_id)

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

    PRIMARY KEY (project_id, employee_id)

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
        UNIQUE(employee_id, pay_month, pay_year)

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
-- MATERIALS
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
        UNIQUE(company_id, material_code),

    CONSTRAINT uq_material_name
        UNIQUE(company_id, name)

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
        UNIQUE(company_id, vendor_code)

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

    CONSTRAINT uq_po_number
        UNIQUE(po_number)

);

-- ============================================================
-- GOODS RECEIPT NOTES (GRN)
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

