import { createClient } from '@/utils/supabase/server';
import type { Tables } from '@/types/database';

export type EducatorDirectoryItem = Tables<'educator_directory'> & {
  subjects: { id: number; name_ar: string }[];
};

export interface EducatorFilters {
  serviceCategoryId?: number;
  governorateId?: number;
}

export async function getEducators(filters: EducatorFilters = {}): Promise<EducatorDirectoryItem[]> {
  const supabase = createClient();

  let query = supabase
    .from('educator_directory')
    .select('*')
    .order('experience_years', { ascending: false, nullsFirst: false });

  if (filters.serviceCategoryId) {
    query = query.contains('subject_ids', [filters.serviceCategoryId]);
  }
  if (filters.governorateId) {
    // An educator matches if they live in the governorate or list it as a teaching location.
    query = query.or(
      `governorate_id.eq.${filters.governorateId},location_governorate_ids.cs.{${filters.governorateId}}`
    );
  }

  const [{ data: educators, error }, { data: categories, error: categoriesError }] = await Promise.all([
    query,
    supabase.from('service_categories').select('id, name_ar'),
  ]);
  if (error) throw error;
  if (categoriesError) throw categoriesError;

  const categoryById = new Map((categories || []).map((c) => [c.id, c]));

  return (educators || []).map((educator) => ({
    ...educator,
    subjects: educator.subject_ids
      .map((id) => categoryById.get(id))
      .filter((c): c is { id: number; name_ar: string } => Boolean(c)),
  }));
}
