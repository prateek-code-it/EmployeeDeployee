-- Short codes for companies and posts, used to build structured employee codes
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_code VARCHAR(10);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_code VARCHAR(10);

-- Backfill existing companies/posts with a simple auto-generated code
UPDATE companies SET company_code = UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 3))
WHERE company_code IS NULL;

UPDATE posts SET post_code = UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 2))
WHERE post_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_code ON companies(company_code);

