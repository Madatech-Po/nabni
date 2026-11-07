import { createClient } from '@/utils/supabase/server';
import type { EducatorVerificationStatus, OfferStatus, RequestStatus } from '@/types/database';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export interface MyOfferItem {
  id: string;
  price: number;
  schedule: string;
  start_date: string | null;
  notes: string | null;
  status: OfferStatus;
  created_at: string;
  pricing_unit_id: number;
  pricing_unit: { name_ar: string } | null;
  request: {
    id: string;
    description: string;
    student_age: number;
    status: RequestStatus;
    area: string | null;
    service_category: { name_ar: string } | null;
    governorate: { name_ar: string } | null;
  } | null;
}

const MY_OFFER_COLUMNS = `id, price, schedule, start_date, notes, status, created_at, pricing_unit_id,
  pricing_unit:pricing_units(name_ar),
  request:requests(id, description, student_age, status, area,
    service_category:service_categories(name_ar),
    governorate:governorates(name_ar))`;

/** The educator's offers, newest first, with the request each belongs to. */
export async function getMyOffers(educatorId: string): Promise<MyOfferItem[]> {
  const supabase = createClient();
  // Educators can read requests they offered on even after they close (NAB-80).
  const { data, error } = await supabase
    .from('offers')
    .select(MY_OFFER_COLUMNS)
    .eq('educator_id', educatorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as MyOfferItem[];
}

/** One of the educator's pending offers, for the edit form; null otherwise. */
export async function getMyPendingOffer(educatorId: string, offerId: string): Promise<MyOfferItem | null> {
  if (!UUID_RE.test(offerId)) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('offers')
    .select(MY_OFFER_COLUMNS)
    .eq('id', offerId)
    .eq('educator_id', educatorId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as MyOfferItem) ?? null;
}
