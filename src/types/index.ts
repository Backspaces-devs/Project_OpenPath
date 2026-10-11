import { type VibeBreakdown, type VibeResult } from '@/lib/scoring/types';

export interface Repository {
  id: number;
  github_id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  primary_language: string | null;
  languages: Record<string, number> | null;
  topics: string[];
  stars: number;
  forks: number;
  watchers: number;
  open_issues_count: number;
  license: string | null;
  size_kb: number;
  is_archived: boolean;
  is_fork: boolean;
  has_contributing: boolean;
  has_code_of_conduct: boolean;
  has_issue_template: boolean;
  readme_excerpt: string | null;
  last_pushed_at: string | null;
  created_at_github: string | null;
  good_first_issue_count: number;
  help_wanted_count: number;
  stale_gfi_count: number;
  avg_first_response_hours: number | null;
  newcontributor_pr_merge_rate: number | null;
  newcontributor_pr_sample_size: number | null;
  commit_frequency_30d: number | null;
  contributor_growth_30d: number | null;
  onboarding_clarity_score: number | null;
  vibe_score: number | null;
  vibe_breakdown: VibeBreakdown | null;
  ai_summary: string | null;
  ai_guide?: string | null;
}

export interface Issue {
  id: number;
  github_id: number;
  repo_id: number;
  repo_name?: string;
  repo_owner?: string;
  repo_vibe_score?: number;
  primary_language?: string;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: 'open' | 'closed';
  labels: string[];
  is_good_first_issue: boolean;
  is_help_wanted: boolean;
  comments_count: number;
  created_at_github: string;
  updated_at_github: string;
  closed_at_github?: string | null;
  first_response_hours: number | null;
  assignee_login: string | null;
  difficulty_estimate: 'Beginner' | 'Intermediate' | 'Advanced';
  ai_guide: string | null;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  category: 'discovery' | 'contribution' | 'skill' | 'community';
  required_count: number;
  current_count: number;
  xp: number;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface Contribution {
  id: string;
  title: string;
  repo_full_name: string;
  pr_number: number;
  github_url: string;
  state: 'open' | 'merged' | 'closed';
  created_at: string;
  merged_at?: string | null;
  xp_awarded: number;
  response_time_hours?: number;
}

export interface Question {
  id: string;
  repo_id: number;
  author_name: string;
  author_avatar?: string;
  title: string;
  content: string;
  created_at: string;
  answers: Answer[];
}

export interface Answer {
  id: string;
  question_id: string;
  author_name: string;
  author_avatar?: string;
  author_is_mentor?: boolean;
  content: string;
  is_accepted: boolean;
  created_at: string;
}

export interface UserProfile {
  username: string;
  full_name: string;
  avatar_url: string;
  github_username: string;
  college: string;
  graduation_year: number;
  bio: string;
  skills: string[];
  experience_level: 'Beginner' | 'Intermediate' | 'Advanced';
  xp: number;
  level: number;
  is_mentor: boolean;
}
