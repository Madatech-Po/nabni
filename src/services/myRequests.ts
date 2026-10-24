import { createClient } from '@/utils/supabase/client';
import type { RequestInput } from '@/components/requests/requestFormValues';
import type { RequestStatus } from '@/types/database';

// Writes a parent makes to their own requests, from the browser. RLS limits them to the
// owner's rows while the account is active and the request isn't removed (NAB-51), so an
// update that touches no row means "not allowed", not "nothing to do".
const NOT_ALLOWED = 'لا يمكن تعديل هذا الطلب.';

export async function createRequest(parentId: string, input: RequestInput): Promise<string> {
  const { data, error } = await createClient()
    .from('requests')
    .insert({ ...input, parent_id: parentId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateRequest(requestId: string, input: RequestInput): Promise<void> {
  const { data, error } = await createClient().from('requests').update(input).eq('id', requestId).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error(NOT_ALLOWED);
}

export async function setMyRequestStatus(
  requestId: string,
  status: Exclude<RequestStatus, 'removed'>
): Promise<void> {
  const { data, error } = await createClient().from('requests').update({ status }).eq('id', requestId).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error(NOT_ALLOWED);
}
