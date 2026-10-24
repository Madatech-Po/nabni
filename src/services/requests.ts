import { createClient } from '@/utils/supabase/server';
import type { EducatorGender, RequestStatus } from '@/types/database';

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
}

/** The signed-in parent's own requests, every status, newest first (RLS: owner rows only). */
export async function getMyRequests(parentId: string): Promise<MyRequestItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('requests')
    .select(
      `id, student_age, description, preferred_educator_gender, budget, area, created_at, updated_at, status,
       service_category:service_categories(name_ar),
       education_level:education_levels(name_ar),
       teaching_place:teaching_places(name_ar),
       governorate:governorates(name_ar),
       pricing_unit:pricing_units(name_ar)`
    )
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as MyRequestItem[];
}
