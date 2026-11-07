import { createClient } from '@/utils/supabase/client';
import type { OfferInput } from '@/components/offers/offerFormValues';

// Writes an educator makes to their own offers, from the browser. RLS only lets verified,
// active educators write pending offers on open requests (NAB-80).

export async function createOffer(requestId: string, educatorId: string, input: OfferInput): Promise<string> {
  const { data, error } = await createClient()
    .from('offers')
    .insert({ ...input, request_id: requestId, educator_id: educatorId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateOffer(offerId: string, input: OfferInput): Promise<void> {
  const { data, error } = await createClient().from('offers').update(input).eq('id', offerId).select('id');
  if (error) throw error;
  // RLS hides offers that are no longer pending or whose request closed.
  if (!data?.length) throw new Error('لا يمكن تعديل هذا العرض الآن.');
}

export async function withdrawOffer(offerId: string): Promise<void> {
  const { error } = await createClient().rpc('withdraw_offer', { p_offer_id: offerId });
  if (error) throw error;
}

// Supabase errors are plain objects ({ code, message }), not Error instances.
export function offerErrorMessage(err: unknown): string {
  const { code, message } = (err ?? {}) as { code?: string; message?: string };
  if (code === '23505') return 'لديك عرض قائم على هذا الطلب بالفعل.';
  if (code === '42501') return 'لا يمكن إرسال العرض: يجب أن يكون حسابك موثقاً وأن يكون الطلب ما زال مفتوحاً.';
  if (code === '23514') return 'لم يعد هذا العرض قابلاً للتغيير.';
  return message || 'حدث خطأ، حاول مرة أخرى';
}
