-- AI Test Agent - Git Local + Smart Issue Tracking
-- Execute this SQL in your Supabase SQL Editor

-- Add local repo tracking to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS local_repo_path TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_pulled_at TIMESTAMP;

-- Add issue tracking fields
ALTER TABLE issues ADD COLUMN IF NOT EXISTS issue_key TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(50); -- 'ai', 'external', 'manual'
ALTER TABLE issues ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

-- Create unique index on issue_key per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_project_key ON issues(project_id, issue_key) 
WHERE status != 'resolved';

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_is_new ON issues(is_new) WHERE is_new = true;
