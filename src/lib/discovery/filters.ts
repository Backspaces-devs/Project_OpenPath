import { createClient } from '@/lib/supabase/server';
import { applyStrategy } from './strategies';
import { type DiscoveryFilters, type PaginatedResult } from './types';
import { MOCK_REPOSITORIES, MOCK_ISSUES } from '@/lib/data/mock-data';
import { type Repository, type Issue } from '@/types';

/**
 * Applies search and facet filters to a Supabase query builder
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters(query: any, filters: DiscoveryFilters): any {
  let q = query;

  if (filters.language) {
    q = q.ilike('primary_language', filters.language);
  }

  if (filters.topic) {
    q = q.contains('topics', [filters.topic.toLowerCase()]);
  }

  if (filters.minStars !== undefined) {
    q = q.gte('stars', filters.minStars);
  }

  if (filters.maxStars !== undefined) {
    q = q.lte('stars', filters.maxStars);
  }

  if (filters.hasGoodFirstIssues) {
    q = q.gt('good_first_issue_count', 0);
  }

  if (filters.minVibeScore !== undefined) {
    q = q.gte('vibe_score', filters.minVibeScore);
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    q = q.or(`name.ilike.${term},full_name.ilike.${term},description.ilike.${term}`);
  }

  return q;
}

/**
 * Applies server-side pagination with range
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyPagination(query: any, page: number, pageSize: number): any {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return query.range(from, to);
}

/**
 * Filter and sort mock repositories in-memory
 */
function queryMockRepositories(filters: DiscoveryFilters): PaginatedResult<Repository> {
  let list = [...MOCK_REPOSITORIES];

  if (filters.language) {
    const lang = filters.language.toLowerCase();
    list = list.filter((r) => r.primary_language?.toLowerCase() === lang);
  }

  if (filters.topic) {
    const topic = filters.topic.toLowerCase();
    list = list.filter((r) => r.topics.some((t) => t.toLowerCase().includes(topic)));
  }

  if (filters.minStars !== undefined) {
    list = list.filter((r) => r.stars >= filters.minStars!);
  }

  if (filters.maxStars !== undefined) {
    list = list.filter((r) => r.stars <= filters.maxStars!);
  }

  if (filters.hasGoodFirstIssues) {
    list = list.filter((r) => r.good_first_issue_count > 0);
  }

  if (filters.minVibeScore !== undefined) {
    list = list.filter((r) => (r.vibe_score ?? 0) >= filters.minVibeScore!);
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim().toLowerCase();
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.full_name.toLowerCase().includes(term) ||
        (r.description && r.description.toLowerCase().includes(term)) ||
        r.topics.some((t) => t.toLowerCase().includes(term))
    );
  }

  // Strategy sorting
  switch (filters.strategy) {
    case 'beginner':
      list = list.filter((r) => r.good_first_issue_count > 0);
      list.sort((a, b) => (b.good_first_issue_count - a.good_first_issue_count) || ((b.vibe_score ?? 0) - (a.vibe_score ?? 0)));
      break;
    case 'active':
      list.sort((a, b) => ((b.commit_frequency_30d ?? 0) - (a.commit_frequency_30d ?? 0)));
      break;
    case 'rising':
      list = list.filter((r) => r.stars < 60000);
      list.sort((a, b) => ((b.contributor_growth_30d ?? 0) - (a.contributor_growth_30d ?? 0)));
      break;
    case 'hidden_gems':
      list = list.filter((r) => (r.vibe_score ?? 0) >= 85 && r.stars < 45000);
      list.sort((a, b) => ((b.vibe_score ?? 0) - (a.vibe_score ?? 0)));
      break;
    case 'personalized':
    case 'vibe':
    default:
      list.sort((a, b) => ((b.vibe_score ?? 0) - (a.vibe_score ?? 0)) || (b.stars - a.stars));
      break;
  }

  const total = list.length;
  const from = (filters.page - 1) * filters.pageSize;
  const paginated = list.slice(from, from + filters.pageSize);

  return {
    data: paginated,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

/**
 * High-level repository query runner using the Supabase server client,
 * falling back gracefully to curated seed dataset.
 */
export async function queryRepositories<T = unknown>(
  filters: DiscoveryFilters
): Promise<PaginatedResult<T>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return queryMockRepositories(filters) as unknown as PaginatedResult<T>;
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from('repositories')
      .select('*', { count: 'exact' });

    query = query.eq('is_archived', false).eq('is_fork', false);
    query = applyFilters(query, filters);
    query = applyStrategy(query, filters.strategy);
    query = applyPagination(query, filters.page, filters.pageSize);

    const { data, count, error } = await query;

    if (error || !data || data.length === 0) {
      return queryMockRepositories(filters) as unknown as PaginatedResult<T>;
    }

    const total = count ?? data.length;
    const totalPages = Math.ceil(total / filters.pageSize);

    return {
      data: data as T[],
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages,
    };
  } catch {
    return queryMockRepositories(filters) as unknown as PaginatedResult<T>;
  }
}

/**
 * Get repository by ID or full_name
 */
export async function getRepositoryById(idOrSlug: string | number): Promise<Repository | null> {
  const numericId = typeof idOrSlug === 'number' ? idOrSlug : parseInt(idOrSlug, 10);
  
  if (!isNaN(numericId)) {
    const found = MOCK_REPOSITORIES.find((r) => r.id === numericId);
    if (found) return found;
  }

  const slug = String(idOrSlug).toLowerCase();
  const foundBySlug = MOCK_REPOSITORIES.find(
    (r) => r.full_name.toLowerCase() === slug || r.name.toLowerCase() === slug
  );
  if (foundBySlug) return foundBySlug;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const supabase = await createClient();
    const query = isNaN(numericId)
      ? supabase.from('repositories').select('*').eq('full_name', slug).single()
      : supabase.from('repositories').select('*').eq('id', numericId).single();
    const { data } = await query;
    return (data as Repository) || null;
  } catch {
    return null;
  }
}

/**
 * Get issues for a repository
 */
export async function getIssuesForRepo(repoId: number): Promise<Issue[]> {
  const mockMatches = MOCK_ISSUES.filter((i) => i.repo_id === repoId);
  if (mockMatches.length > 0) return mockMatches;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return mockMatches;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('issues')
      .select('*')
      .eq('repo_id', repoId)
      .eq('state', 'open');
    return (data as Issue[]) || mockMatches;
  } catch {
    return mockMatches;
  }
}

/**
 * Get all open issues with optional filtering
 */
export async function getAllIssues(filters?: {
  language?: string;
  difficulty?: string;
  search?: string;
  goodFirstOnly?: boolean;
}): Promise<Issue[]> {
  let issues = [...MOCK_ISSUES];

  if (filters?.goodFirstOnly !== false) {
    issues = issues.filter((i) => i.is_good_first_issue);
  }

  if (filters?.language && filters.language !== 'all') {
    const lang = filters.language.toLowerCase();
    issues = issues.filter((i) => i.primary_language?.toLowerCase() === lang);
  }

  if (filters?.difficulty && filters.difficulty !== 'all') {
    issues = issues.filter((i) => i.difficulty_estimate?.toLowerCase() === filters.difficulty?.toLowerCase());
  }

  if (filters?.search && filters.search.trim().length > 0) {
    const term = filters.search.trim().toLowerCase();
    issues = issues.filter(
      (i) =>
        i.title.toLowerCase().includes(term) ||
        (i.repo_name && i.repo_name.toLowerCase().includes(term)) ||
        (i.body && i.body.toLowerCase().includes(term)) ||
        i.labels.some((l) => l.toLowerCase().includes(term))
    );
  }

  return issues;
}
