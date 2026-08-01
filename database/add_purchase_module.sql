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

