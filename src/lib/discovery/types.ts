import { z } from 'zod';

export const DiscoveryStrategySchema = z.enum([
  'vibe',
  'beginner',
  'active',
  'rising',
  'hidden_gems',
  'personalized',
]);
export type DiscoveryStrategy = z.infer<typeof DiscoveryStrategySchema>;

export const DiscoveryFiltersSchema = z.object({
  strategy: DiscoveryStrategySchema.default('vibe'),
  language: z.string().optional(),
  topic: z.string().optional(),
  minStars: z.coerce.number().int().min(0).optional(),
  maxStars: z.coerce.number().int().min(0).optional(),
  hasGoodFirstIssues: z.coerce.boolean().optional(),
  minVibeScore: z.coerce.number().min(0).max(100).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type DiscoveryFilters = z.infer<typeof DiscoveryFiltersSchema>;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
