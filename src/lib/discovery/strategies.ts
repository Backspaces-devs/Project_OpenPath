import { type DiscoveryStrategy } from './types';

export interface StrategyDefinition {
  id: DiscoveryStrategy;
  label: string;
  description: string;
}

export const DISCOVERY_STRATEGIES: StrategyDefinition[] = [
  {
    id: 'vibe',
    label: 'Highest Vibe',
    description: 'Maintainer responsiveness, merge rates, and onboarding clarity',
  },
  {
    id: 'beginner',
    label: 'Beginner Friendly',
    description: 'Repositories with abundant fresh good-first-issues',
  },
  {
    id: 'active',
    label: 'Most Active',
    description: 'Recent commits, rapid push activity, and active development',
  },
  {
    id: 'rising',
    label: 'Rising Stars',
    description: 'High contributor growth rate relative to total stars',
  },
  {
    id: 'hidden_gems',
    label: 'Hidden Gems',
    description: 'High vibe score (>80) with under 5,000 stars',
  },
  {
    id: 'personalized',
    label: 'Personalized',
    description: 'Tailored to your language skills and interests',
  },
];

/**
 * Applies strategy-specific ordering and filters to a Supabase query builder
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyStrategy(query: any, strategy: DiscoveryStrategy): any {
  switch (strategy) {
    case 'vibe':
      return query
        .order('vibe_score', { ascending: false, nullsFirst: false })
        .order('stars', { ascending: false });

    case 'beginner':
      return query
        .gt('good_first_issue_count', 0)
        .order('good_first_issue_count', { ascending: false })
        .order('vibe_score', { ascending: false });

    case 'active':
      return query
        .order('commit_frequency_30d', { ascending: false, nullsFirst: false })
        .order('last_pushed_at', { ascending: false, nullsFirst: false });

    case 'rising':
      return query
        .lt('stars', 50000)
        .order('contributor_growth_30d', { ascending: false, nullsFirst: false })
        .order('vibe_score', { ascending: false });

    case 'hidden_gems':
      return query
        .gte('vibe_score', 80)
        .lt('stars', 5000)
        .order('vibe_score', { ascending: false })
        .order('stars', { ascending: false });

    case 'personalized':
    default:
      return query
        .order('vibe_score', { ascending: false, nullsFirst: false })
        .order('stars', { ascending: false });
  }
}
