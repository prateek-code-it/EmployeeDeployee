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

