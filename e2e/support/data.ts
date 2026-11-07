import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';
import { account, type Role } from './accounts';

// Everything a UI test creates starts with this marker, so it is easy to
// recognise on the live project and to clean up.
export const E2E_MARK = '[E2E]';

/** A unique, recognisable text for one test run; it ends with an alphanumeric token. */
export function e2eText(label: string): string {
  return `${E2E_MARK} ${label} ${runToken()}`;
}

function runToken(): string {
  return `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

/** The unique token at the end of an e2eText (searchable where punctuation is stripped). */
export function tokenOf(text: string): string {
  return text.split(' ').pop()!;
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

async function firstId(supabase: SupabaseClient<Database>, table: 'service_categories' | 'teaching_places' | 'governorates') {
  const { data, error } = await supabase.from(table).select('id').order('id').limit(1).single();
  if (error || !data) throw new Error(`no ${table}: ${error?.message}`);
  return data.id;
}

/** Posts an open `[E2E]` request as the e2e parent and returns its id. */
export async function createE2eRequest(description: string): Promise<string> {
  if (!description.startsWith(E2E_MARK)) throw new Error(`e2e requests must start with ${E2E_MARK}`);
  const { supabase, userId } = await clientAs('parent');
  const { data, error } = await supabase
    .from('requests')
    .insert({
      parent_id: userId,
      service_category_id: await firstId(supabase, 'service_categories'),
      teaching_place_id: await firstId(supabase, 'teaching_places'),
      governorate_id: await firstId(supabase, 'governorates'),
      student_age: 9,
      description,
    })
    .select('id')
    .single();
  await supabase.auth.signOut({ scope: 'local' });
  if (error || !data) throw new Error(`could not create e2e request: ${error?.message}`);
  return data.id;
}

/**
 * Deletes the e2e parent's own `[E2E]` requests whose description starts with
 * `prefix` (their offers go with them). RLS limits this to the e2e parent's
 * rows; real data is never touched. Specs run in parallel, so each test
 * cleans up only its own marker; pass `olderThanMinutes` to sweep leftovers
 * of interrupted runs without touching requests another test is using.
 * A request an admin test left hidden can't be deleted by its parent, so the
 * e2e admin un-hides those first.
 */
export async function deleteE2eRequests(
  { prefix = E2E_MARK, olderThanMinutes }: { prefix?: string; olderThanMinutes?: number } = {},
): Promise<void> {
  if (!prefix.startsWith(E2E_MARK)) throw new Error(`cleanup prefix must start with ${E2E_MARK}`);
  const { supabase, userId } = await clientAs('parent');
  const cutoff = olderThanMinutes ? new Date(Date.now() - olderThanMinutes * 60_000).toISOString() : null;

  const mine = () => {
    let query = supabase.from('requests').select('id, status').eq('parent_id', userId).like('description', `${prefix}%`);
    if (cutoff) query = query.lt('created_at', cutoff);
    return query;
  };

  const { data: rows, error: readError } = await mine();
  if (readError) throw new Error(`cleanup failed: ${readError.message}`);

  const hidden = (rows ?? []).filter((r) => r.status === 'removed');
  if (hidden.length && account('admin')) {
    const admin = await clientAs('admin');
    for (const { id } of hidden) {
      await admin.supabase.rpc('set_request_status', { p_request_id: id, p_status: 'closed', p_reason: 'e2e cleanup' });
    }
    await admin.supabase.auth.signOut({ scope: 'local' });
  }

  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length) {
    const { error } = await supabase.from('requests').delete().in('id', ids);
    if (error) throw new Error(`cleanup failed: ${error.message}`);
  }
  // 'local': the default (global) would also end the browser's saved session.
  await supabase.auth.signOut({ scope: 'local' });
}

/** Removes `[E2E]` requests left behind by runs that were interrupted. */
export const sweepStaleE2eRequests = () => deleteE2eRequests({ olderThanMinutes: 30 });
