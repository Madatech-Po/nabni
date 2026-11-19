import { createClient } from '@/utils/supabase/server';
import type { PublicHomeStats } from '@/types/database';

/**
 * The home page counters (NAB-123), from public_home_stats(): aggregate counts only, callable by
 * visitors. Null when the call fails, so the page hides the section instead of showing made-up
 * numbers.
 */
export async function getPublicHomeStats(): Promise<PublicHomeStats | null> {
  const { data, error } = await createClient().rpc('public_home_stats');
  if (error || !data) return null;
  return data;
}
