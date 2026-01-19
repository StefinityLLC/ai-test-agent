export interface User {
  id: string;
  email: string;
  github_id: string;
  github_username: string;
  github_token?: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  github_repo_url: string;
  repo_name: string;
  repo_owner: string;
  branch: string;
  language?: string;
  framework?: string;
  health_score?: number;
  last_analyzed?: string;
  created_at: string;
  local_repo_path?: string; // Git local optimization
  last_pulled_at?: string; // Git local optimization
}

export interface Issue {
  id: string;
  project_id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description?: string;
  file_path?: string;
  line_number?: number;
  status: 'open' | 'in_progress' | 'fixed' | 'ignored' | 'resolved';
  auto_fix_available: boolean;
  test_code?: string;
  fix_code?: string;
  created_at: string;
  fixed_at?: string;
  original_code?: string; // Cached for auto-fix
  issue_key?: string; // For smart tracking
  resolved_at?: string;
  resolved_by?: 'ai' | 'external' | 'manual';
  is_new?: boolean; // New issue since last analysis
}

export interface TestRun {
  id: string;
  project_id: string;
  total_tests: number;
  passed: number;
  failed: number;
  duration_ms: number;
  commit_sha?: string;
  results?: any;
  created_at: string;
}

export interface FixHistory {
  id: string;
  issue_id: string;
  commit_sha?: string;
  pr_url?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// MILESTONE 3.5: AI Code Review Types

export interface AIReviewSettings {
  id: string;
  project_id: string;
  enabled: boolean;
  confidence_threshold: number; // 0-100
  auto_merge_low: boolean;
  auto_merge_medium: boolean;
  auto_merge_high: boolean;
  auto_merge_critical: boolean;
  notify_on_merge: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIReviewResult {
  approved: boolean;
  confidence: number; // 0-100
  recommendation: 'MERGE' | 'REQUEST_CHANGES' | 'REJECT';
  issues: string[];
  summary: string;
  code_quality_score: number; // 0-100
  security_concerns: string[];
  performance_concerns: string[];
  best_practices_followed: boolean;
}

export interface PRReview {
  id: string;
  pr_number: number;
  pr_url: string;
  project_id: string;
  issue_id: string;
  review_result: AIReviewResult;
  action_taken: 'merged' | 'changes_requested' | 'rejected' | 'pending';
  merged_at?: string;
  created_at: string;
}
