import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';
import { account, type Role } from './accounts';

// Everything a UI test creates starts with this marker, so it is easy to
// recognise on the live project and to clean up.
export const E2E_MARK = '[E2E]';

/** A unique, recognisable text for one test run. */
export function e2eText(label: string): string {
  return `${E2E_MARK} ${label} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** A Supabase client signed in as an e2e account, for setup and cleanup only. */
export async function clientAs(role: Role): Promise<{ supabase: SupabaseClient<Database>; userId: string }> {
  const credentials = account(role);
  if (!credentials) throw new Error(`E2E_${role.toUpperCase()} account not configured`);
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error || !data.user) throw new Error(`could not sign in as e2e ${role}: ${error?.message}`);
  return { supabase, userId: data.user.id };
}

/**
 * Deletes the e2e parent's own `[E2E]` requests (their offers go with them).
 * RLS limits this to the e2e parent's rows; real data is never touched.
 */
export async function deleteE2eRequests(): Promise<void> {
  const { supabase, userId } = await clientAs('parent');
  const { error } = await supabase
    .from('requests')
    .delete()
    .eq('parent_id', userId)
    .like('description', `${E2E_MARK}%`);
  if (error) throw new Error(`cleanup failed: ${error.message}`);
  // 'local': the default (global) would also end the browser's saved session.
  await supabase.auth.signOut({ scope: 'local' });
}
