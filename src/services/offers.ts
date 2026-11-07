import { createClient } from '@/utils/supabase/server';
import type { EducatorVerificationStatus, OfferStatus, RequestStatus } from '@/types/database';
import type { RequestFeedItem } from './requests';

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

export interface OfferForParent {
  id: string;
  price: number;
  schedule: string;
  start_date: string | null;
  notes: string | null;
  status: OfferStatus;
  created_at: string;
  pricing_unit: { name_ar: string } | null;
  /** Public directory data; null if the educator is no longer listed (e.g. suspended). */
  educator: {
    id: string;
    full_name: string;
    profile_image: string | null;
    experience_years: number | null;
    gender: string | null;
    governorate_name_ar: string | null;
    bio: string | null;
  } | null;
}

/**
 * Offers on one of the parent's own requests, oldest first, with each educator's public
 * profile. Parents can't read the educators table (it holds phone numbers), so educator
 * details come from the public educator_directory view.
 */
export async function getOffersOnMyRequest(requestId: string): Promise<OfferForParent[]> {
  const supabase = createClient();
  const { data: offers, error } = await supabase
    .from('offers')
    .select('id, price, schedule, start_date, notes, status, created_at, educator_id, pricing_unit:pricing_units(name_ar)')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = (offers || []) as unknown as (Omit<OfferForParent, 'educator'> & { educator_id: string })[];
  const educatorIds = Array.from(new Set(rows.map((o) => o.educator_id)));
  if (educatorIds.length === 0) return [];

  const { data: educators, error: directoryError } = await supabase
    .from('educator_directory')
    .select('id, full_name, profile_image, experience_years, gender, governorate_name_ar, bio')
    .in('id', educatorIds);
  if (directoryError) throw directoryError;

  const byId = new Map((educators || []).map((e) => [e.id, e as OfferForParent['educator']]));
  return rows.map(({ educator_id, ...offer }) => ({ ...offer, educator: byId.get(educator_id) ?? null }));
}

export interface OfferContact {
  full_name: string;
  phone: string | null;
  whatsapp_number: string | null;
}

/**
 * The other side's contact for an accepted offer: the educator's for the parent, the parent's
 * for the educator. The database returns nothing for anyone else or any other status.
 */
export async function getOfferContact(offerId: string): Promise<OfferContact | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_offer_contact', { p_offer_id: offerId });
  if (error) throw error;
  return (data as OfferContact[] | null)?.[0] ?? null;
}

/**
 * Newest open requests in one of the educator's services and governorates (where they live
 * or teach). Empty when the educator hasn't picked services yet.
 */
export async function getMatchingOpenRequests(educatorId: string, limit = 3): Promise<RequestFeedItem[]> {
  const supabase = createClient();
  const [subjects, locations, home] = await Promise.all([
    supabase.from('educator_subjects').select('subject_id').eq('educator_id', educatorId),
    supabase.from('educator_locations').select('governorate_id').eq('educator_id', educatorId),
    supabase.from('educators').select('governorate_id').eq('id', educatorId).maybeSingle(),
  ]);
  for (const result of [subjects, locations, home]) if (result.error) throw result.error;

  const subjectIds = (subjects.data || []).map((s) => s.subject_id);
  const governorateIds = Array.from(
    new Set([...(locations.data || []).map((l) => l.governorate_id), home.data?.governorate_id].filter((id): id is number => id != null))
  );
  if (subjectIds.length === 0) return [];

  let query = supabase
    .from('requests')
    .select(
      `id, student_age, description, preferred_educator_gender, budget, area, created_at,
       service_category:service_categories(name_ar),
       education_level:education_levels(name_ar),
       teaching_place:teaching_places(name_ar),
       governorate:governorates(name_ar),
       pricing_unit:pricing_units(name_ar)`
    )
    .eq('status', 'open')
    .in('service_category_id', subjectIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (governorateIds.length > 0) query = query.in('governorate_id', governorateIds);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as RequestFeedItem[];
}
