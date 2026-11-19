import { createClient } from '@/utils/supabase/server';
import type { PublicHomeStats } from '@/types/database';

/**
 * The home page counters (NAB-123), from public_home_stats(): aggregate counts only, callable by
 * visitors. Null when the call fails or throws (network, client creation), so the page hides the
 * section instead of showing made-up numbers or crashing.
 */
export async function getPublicHomeStats(): Promise<PublicHomeStats | null> {
  try {
    const { data, error } = await (await createClient()).rpc('public_home_stats');
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
