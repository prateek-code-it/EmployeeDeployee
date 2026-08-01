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


