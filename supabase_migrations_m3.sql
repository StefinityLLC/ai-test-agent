-- AI Test Agent - Milestone 3 Database Schema
-- Execute this SQL in your Supabase SQL Editor

-- Fix History tabela
CREATE TABLE IF NOT EXISTS fix_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  commit_sha VARCHAR(40),
  pr_url TEXT,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fix_history_issue_id ON fix_history(issue_id);

-- Enable Row Level Security (RLS)
ALTER TABLE fix_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fix_history table
-- Users can read fix history for issues in their projects
CREATE POLICY "Users can read own fix history" ON fix_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM issues i
      JOIN projects p ON p.id = i.project_id
      WHERE i.id = fix_history.issue_id
      AND p.user_id::text = auth.uid()::text
    )
  );
