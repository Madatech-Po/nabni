import { createClient } from '@/utils/supabase/server';
import type { EducatorGender } from '@/types/database';

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
