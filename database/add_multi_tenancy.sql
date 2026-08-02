-- ============================================================
-- Multi-tenancy migration
-- ============================================================

-- 1. Companies table
CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Update the users role constraint: admin -> super_admin / company_head
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Migrate existing 'admin' accounts to 'super_admin' (platform-level)
UPDATE users SET role = 'super_admin' WHERE role = 'admin';

ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'company_head', 'supervisor', 'employee'));

-- 3. Add company_id to the core "master data" tables.
-- Nullable for now since existing rows have no company yet - we'll backfill next.
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_company ON sites(company_id);
CREATE INDEX IF NOT EXISTS idx_materials_company ON materials(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors(company_id);

-- 4. Create a default company and backfill all existing data into it,
-- so nothing breaks for what we've already built and tested.
INSERT INTO companies (name) VALUES ('Default Company (test data)');

UPDATE employees SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE projects SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE sites SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE materials SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE equipment SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE vendors SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;

-- The super_admin user stays with company_id = NULL (not tied to one company).
-- Any other existing users get backfilled into the default company as company_head.
UPDATE users SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL AND role != 'super_admin';
