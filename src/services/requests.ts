import { createClient } from '@/utils/supabase/server';
import type { RequestInput } from '@/components/requests/requestFormValues';
import type { EducatorGender, OfferStatus, RequestStatus } from '@/types/database';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RequestFeedItem {
  id: string;
  student_age: number;
  description: string;
  preferred_educator_gender: EducatorGender | null;
  budget: number | null;
  area: string | null;
  created_at: string;
  service_category: { name_ar: string } | null;
  education_level: { name_ar: string } | null;
  teaching_place: { name_ar: string } | null;
  governorate: { name_ar: string } | null;
  pricing_unit: { name_ar: string } | null;
}

export interface RequestFilters {
  serviceCategoryId?: number;
  governorateId?: number;
}

export async function getOpenRequests(filters: RequestFilters = {}): Promise<RequestFeedItem[]> {
  const supabase = createClient();

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
    .order('created_at', { ascending: false });

  if (filters.serviceCategoryId) {
    query = query.eq('service_category_id', filters.serviceCategoryId);
  }
  if (filters.governorateId) {
    query = query.eq('governorate_id', filters.governorateId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as RequestFeedItem[];
}

export interface MyRequestItem extends RequestFeedItem {
  status: RequestStatus;
  updated_at: string;
  offers: { status: OfferStatus }[];
}

/** The signed-in parent's own requests, every status, newest first (RLS: owner rows only). */
// offers(status): parents can read the offers on their own requests (NAB-80).
const MY_REQUEST_COLUMNS = `id, student_age, description, preferred_educator_gender, budget, area, created_at,
  updated_at, status,
  service_category:service_categories(name_ar),
  education_level:education_levels(name_ar),
  teaching_place:teaching_places(name_ar),
  governorate:governorates(name_ar),
  pricing_unit:pricing_units(name_ar),
  offers(status)`;

export async function getMyRequests(parentId: string): Promise<MyRequestItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('requests')
    .select(MY_REQUEST_COLUMNS)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as MyRequestItem[];
}

/** One of the parent's own requests, any status; null if it isn't theirs or the id is malformed. */
export async function getMyRequest(parentId: string, requestId: string): Promise<MyRequestItem | null> {
  if (!UUID_RE.test(requestId)) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('requests')
    .select(MY_REQUEST_COLUMNS)
    .eq('id', requestId)
    .eq('parent_id', parentId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as MyRequestItem) ?? null;
}


/**
 * One of the parent's own requests, as stored, for the edit form. Null when the id is
 * malformed, the request belongs to someone else, or an admin removed it.
 */
export async function getMyRequestForEdit(parentId: string, requestId: string): Promise<RequestInput | null> {
  if (!UUID_RE.test(requestId)) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('requests')
    .select(
      `service_category_id, education_level_id, teaching_place_id, governorate_id, area, student_age,
       description, preferred_educator_gender, budget, pricing_unit_id, status`
    )
    .eq('id', requestId)
    .eq('parent_id', parentId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status === 'removed') return null;
  const { status: _status, ...input } = data;
  return input as RequestInput;
}

/** One open request for the offer page; null if it isn't open (or the id is malformed). */
export async function getOpenRequest(requestId: string): Promise<RequestFeedItem | null> {
  if (!UUID_RE.test(requestId)) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('requests')
    .select(
      `id, student_age, description, preferred_educator_gender, budget, area, created_at,
       service_category:service_categories(name_ar),
       education_level:education_levels(name_ar),
       teaching_place:teaching_places(name_ar),
       governorate:governorates(name_ar),
       pricing_unit:pricing_units(name_ar)`
    )
    .eq('id', requestId)
    .eq('status', 'open')
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as RequestFeedItem) ?? null;
}
