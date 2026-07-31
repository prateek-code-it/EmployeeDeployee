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


