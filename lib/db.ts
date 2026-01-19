import { createClient } from '@supabase/supabase-js';
import type { Project, Issue, TestRun, AIReviewSettings, PRReview, AIReviewResult } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function createProject(userId: string, repoData: {
  repoUrl: string;
  repoName: string;
  repoOwner: string;
  branch?: string;
  language?: string;
  framework?: string;
}) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      github_repo_url: repoData.repoUrl,
      repo_name: repoData.repoName,
      repo_owner: repoData.repoOwner,
      branch: repoData.branch || 'main',
      language: repoData.language,
      framework: repoData.framework,
    })
    .select()
    .single();
    
  if (error) throw error;
  return data as Project;
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data as Project[];
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
    
  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }
  return data as Project;
}

export async function updateProject(projectId: string, updates: Partial<Project>) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();
    
  if (error) throw error;
  return data as Project;
}

// MILESTONE 2: Issues Functions

export async function createIssue(issueData: {
  project_id: string;
  severity: Issue['severity'];
  title: string;
  description?: string;
  file_path?: string;
  line_number?: number;
  auto_fix_available?: boolean;
  original_code?: string; // Cache for auto-fix
  issue_key?: string; // For smart tracking
  is_new?: boolean; // New issue flag
}) {
  const { data, error } = await supabase
    .from('issues')
    .insert(issueData)
    .select()
    .single();
    
  if (error) throw error;
  return data as Issue;
}

export async function getProjectIssues(projectId: string): Promise<Issue[]> {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data as Issue[];
}

export async function updateIssue(issueId: string, updates: Partial<Issue>) {
  const { data, error } = await supabase
    .from('issues')
    .update(updates)
    .eq('id', issueId)
    .select()
    .single();
    
  if (error) throw error;
  return data as Issue;
}

// MILESTONE 2: Test Runs Functions

export async function createTestRun(testRunData: {
  project_id: string;
  total_tests: number;
  passed: number;
  failed: number;
  duration_ms?: number;
  commit_sha?: string;
  results?: any;
}) {
  const { data, error } = await supabase
    .from('test_runs')
    .insert(testRunData)
    .select()
    .single();
    
  if (error) throw error;
  return data as TestRun;
}

export async function getProjectTestRuns(projectId: string, limit: number = 10): Promise<TestRun[]> {
  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  return data as TestRun[];
}

// MILESTONE 3.5: AI Review Settings Functions

export async function getAIReviewSettings(projectId: string): Promise<AIReviewSettings | null> {
  const { data, error } = await supabase
    .from('ai_review_settings')
    .select('*')
    .eq('project_id', projectId)
    .single();
    
  if (error) {
    console.error('Error fetching AI review settings:', error);
    return null;
  }
  return data as AIReviewSettings;
}

export async function createAIReviewSettings(settings: Omit<AIReviewSettings, 'id' | 'created_at' | 'updated_at'>): Promise<AIReviewSettings> {
  const { data, error } = await supabase
    .from('ai_review_settings')
    .insert(settings)
    .select()
    .single();
    
  if (error) throw error;
  return data as AIReviewSettings;
}

export async function updateAIReviewSettings(projectId: string, updates: Partial<AIReviewSettings>): Promise<AIReviewSettings> {
  const { data, error } = await supabase
    .from('ai_review_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .select()
    .single();
    
  if (error) throw error;
  return data as AIReviewSettings;
}

export async function createPRReview(reviewData: {
  pr_number: number;
  pr_url: string;
  project_id: string;
  issue_id: string;
  review_result: AIReviewResult;
  action_taken: PRReview['action_taken'];
  merged_at?: string;
}): Promise<PRReview> {
  const { data, error } = await supabase
    .from('pr_reviews')
    .insert(reviewData)
    .select()
    .single();
    
  if (error) throw error;
  return data as PRReview;
}

export async function getPRReview(prNumber: number, projectId: string): Promise<PRReview | null> {
  const { data, error } = await supabase
    .from('pr_reviews')
    .select('*')
    .eq('pr_number', prNumber)
    .eq('project_id', projectId)
    .single();
    
  if (error) {
    console.error('Error fetching PR review:', error);
    return null;
  }
  return data as PRReview;
}

export async function getIssue(issueId: string): Promise<Issue | null> {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('id', issueId)
    .single();
    
  if (error) {
    console.error('Error fetching issue:', error);
    return null;
  }
  return data as Issue;
}
