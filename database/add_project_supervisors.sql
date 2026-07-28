-- Links Supervisor users to the specific project(s) they manage.
-- Admin assigns supervisors to projects using this table.

CREATE TABLE IF NOT EXISTS project_supervisors (
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

