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
