-- AI Test Agent - Milestone 1 Database Schema
-- Execute this SQL in your Supabase SQL Editor

-- Users tabela (managed by NextAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  github_id VARCHAR(255) UNIQUE,
  github_username VARCHAR(255),
  github_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects tabela
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_repo_url TEXT NOT NULL,
  repo_name VARCHAR(255) NOT NULL,
  repo_owner VARCHAR(255) NOT NULL,
  branch VARCHAR(255) DEFAULT 'main',
  language VARCHAR(50),
  framework VARCHAR(50),
  health_score INTEGER DEFAULT 0,
  last_analyzed TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for projects table
CREATE POLICY "Users can read own projects" ON projects
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid()::text = user_id::text);
