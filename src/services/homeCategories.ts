import { createClient } from '@/utils/supabase/server';
import type { ServiceCategory } from '@/services/lookups';

/**
 * The active service categories for the home page cards (NAB-129), read on the server so each
 * card can link to the directory filtered by the category's real id.
 */
export async function getHomeServiceCategories(): Promise<ServiceCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('service_categories')
    .select('id, name_ar, slug')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data || [];
}
