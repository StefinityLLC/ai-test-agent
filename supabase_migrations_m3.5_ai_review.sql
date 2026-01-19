-- AI Test Agent - Milestone 3.5: AI Code Review & Auto-Merge
-- Execute this SQL in your Supabase SQL Editor

-- AI Review Settings tabela
CREATE TABLE IF NOT EXISTS ai_review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  confidence_threshold INTEGER DEFAULT 80, -- Minimum confidence (0-100) for auto-merge
  auto_merge_low BOOLEAN DEFAULT TRUE,
  auto_merge_medium BOOLEAN DEFAULT TRUE,
  auto_merge_high BOOLEAN DEFAULT TRUE,
  auto_merge_critical BOOLEAN DEFAULT FALSE, -- CRITICAL requires manual review by default
  notify_on_merge BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id) -- One setting per project
);

-- PR Reviews tabela (tracking AI reviews)
CREATE TABLE IF NOT EXISTS pr_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number INTEGER NOT NULL,
  pr_url TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  review_result JSONB NOT NULL, -- Store AIReviewResult as JSON
  action_taken VARCHAR(50) DEFAULT 'pending', -- 'merged', 'changes_requested', 'rejected', 'pending'
  merged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_reviews_project_id ON pr_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_issue_id ON pr_reviews(issue_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_pr_number ON pr_reviews(pr_number);

-- Enable Row Level Security
ALTER TABLE ai_review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_review_settings
CREATE POLICY "Users can read own AI review settings" ON ai_review_settings
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
  );

CREATE POLICY "Users can create own AI review settings" ON ai_review_settings
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
  );

CREATE POLICY "Users can update own AI review settings" ON ai_review_settings
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
  );

-- RLS Policies for pr_reviews
CREATE POLICY "Users can read own PR reviews" ON pr_reviews
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
  );

CREATE POLICY "Users can create PR reviews" ON pr_reviews
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id::text = auth.uid()::text)
  );

-- Insert default AI review settings for existing projects
INSERT INTO ai_review_settings (project_id, enabled, confidence_threshold, auto_merge_low, auto_merge_medium, auto_merge_high, auto_merge_critical)
SELECT id, TRUE, 80, TRUE, TRUE, TRUE, FALSE
FROM projects
ON CONFLICT (project_id) DO NOTHING;
