-- AI Test Agent - Milestone 2 Database Schema
-- Execute this SQL in your Supabase SQL Editor (after M1 migration)

-- Issues/Bugs tabela
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  line_number INTEGER,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fixed', 'ignored')),
  auto_fix_available BOOLEAN DEFAULT false,
  test_code TEXT,
  fix_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  fixed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

-- Test Runs tabela
CREATE TABLE IF NOT EXISTS test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  total_tests INTEGER DEFAULT 0,
  passed INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  commit_sha VARCHAR(40),
  results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_runs_project_id ON test_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_created_at ON test_runs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for issues table
CREATE POLICY "Users can read issues from own projects" ON issues
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = issues.project_id 
      AND projects.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create issues in own projects" ON issues
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = issues.project_id 
      AND projects.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can update issues in own projects" ON issues
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = issues.project_id 
      AND projects.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete issues from own projects" ON issues
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = issues.project_id 
      AND projects.user_id::text = auth.uid()::text
    )
  );

-- RLS Policies for test_runs table
CREATE POLICY "Users can read test_runs from own projects" ON test_runs
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = test_runs.project_id 
      AND projects.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create test_runs in own projects" ON test_runs
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = test_runs.project_id 
      AND projects.user_id::text = auth.uid()::text
    )
  );
