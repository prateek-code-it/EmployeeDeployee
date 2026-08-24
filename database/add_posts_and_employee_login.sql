-- Posts: job title / position master list, managed by Admin per company
CREATE TABLE IF NOT EXISTS posts (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, name)
);

-- Employees: add email, post reference, and a unique employee code (used as login username)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emp_code VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_posts_company ON posts(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_post ON employees(post_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_emp_code ON employees(company_id, emp_code);
