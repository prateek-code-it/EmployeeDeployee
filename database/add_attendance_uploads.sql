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


