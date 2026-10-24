import { createClient } from '@/utils/supabase/client';
import type { Tables } from '@/types/database';

export type Governorate = Pick<Tables<'governorates'>, 'id' | 'name_ar'>;
export type ServiceCategory = Pick<Tables<'service_categories'>, 'id' | 'name_ar' | 'slug'>;
export type EducationLevel = Pick<Tables<'education_levels'>, 'id' | 'name_ar' | 'min_age' | 'max_age'>;
export type TeachingPlace = Pick<Tables<'teaching_places'>, 'id' | 'name_ar'>;
export type PricingUnit = Pick<Tables<'pricing_units'>, 'id' | 'name_ar'>;

export async function getGovernorates(): Promise<Governorate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('governorates')
    .select('id, name_ar')
    .eq('is_active', true)
    .order('id');
  if (error) throw error;
  return data || [];
}

export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_categories')
    .select('id, name_ar, slug')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data || [];
}

export async function getEducationLevels(): Promise<EducationLevel[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('education_levels')
    .select('id, name_ar, min_age, max_age')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data || [];
}

export async function getTeachingPlaces(): Promise<TeachingPlace[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('teaching_places')
    .select('id, name_ar')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data || [];
}

export async function getPricingUnits(): Promise<PricingUnit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('pricing_units')
    .select('id, name_ar')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data || [];
}

/** Everything the request form needs, fetched in parallel. */
export async function getRequestFormLookups() {
  const [services, levels, places, governorates, pricingUnits] = await Promise.all([
    getServiceCategories(),
    getEducationLevels(),
    getTeachingPlaces(),
    getGovernorates(),
    getPricingUnits(),
  ]);
  return { services, levels, places, governorates, pricingUnits };
}
