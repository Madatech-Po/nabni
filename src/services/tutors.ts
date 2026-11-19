import { createClient } from '@/utils/supabase/server';
import type { Tables } from '@/types/database';
import { sanitizeSearch } from '@/utils/searchText';

export type EducatorDirectoryItem = Tables<'educator_directory'> & {
  subjects: { id: number; name_ar: string }[];
};

export interface EducatorFilters {
  serviceCategoryId?: number;
  governorateId?: number;
  /** Free text matched against name, bio, service and governorate names. */
  q?: string;
}

export async function getEducators(filters: EducatorFilters = {}): Promise<EducatorDirectoryItem[]> {
  const supabase = await createClient();

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

  const q = filters.q ? sanitizeSearch(filters.q) : '';
  if (q) {
    // Free-text search (NAB-130): the name or bio, or a service or governorate whose name matches.
    const [{ data: services, error: servicesError }, { data: governorates, error: governoratesError }] =
      await Promise.all([
        supabase.from('service_categories').select('id').ilike('name_ar', `%${q}%`),
        supabase.from('governorates').select('id').ilike('name_ar', `%${q}%`),
      ]);
    if (servicesError) throw servicesError;
    if (governoratesError) throw governoratesError;

    const conditions = [`full_name.ilike.*${q}*`, `bio.ilike.*${q}*`];
    for (const { id } of services || []) conditions.push(`subject_ids.cs.{${id}}`);
    for (const { id } of governorates || []) {
      conditions.push(`governorate_id.eq.${id}`, `location_governorate_ids.cs.{${id}}`);
    }
    query = query.or(conditions.join(','));
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
