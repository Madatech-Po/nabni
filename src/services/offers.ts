import { createClient } from '@/utils/supabase/server';
import type { EducatorVerificationStatus } from '@/types/database';

export interface EducatorOfferingState {
  educatorId: string;
  verificationStatus: EducatorVerificationStatus | null;
  /** Mirrors my_offering_educator_id(): verified and active. */
  canOffer: boolean;
}

/** The signed-in educator's row and whether they may send offers; null without a profile yet. */
export async function getEducatorOfferingState(userId: string): Promise<EducatorOfferingState | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('educators')
    .select('id, verification_status, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    educatorId: data.id,
    verificationStatus: data.verification_status,
    canOffer: data.verification_status === 'verified' && data.is_active === true,
  };
}

/** Requests the educator already has a pending or accepted offer on. */
export async function getRequestIdsWithMyActiveOffer(educatorId: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('offers')
    .select('request_id')
    .eq('educator_id', educatorId)
    .in('status', ['pending', 'accepted']);

  if (error) throw error;
  return new Set((data || []).map((row) => row.request_id));
}
