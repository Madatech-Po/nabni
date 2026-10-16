import { createClient } from '@/utils/supabase/server';
import type { EducatorGender, EducatorVerificationStatus } from '@/types/database';

export const VERIFICATION_STATUSES: EducatorVerificationStatus[] = ['pending', 'verified', 'rejected', 'suspended'];

export interface AdminEducatorItem {
  id: string;
  full_name: string;
  phone: string;
  whatsapp_number: string | null;
  bio: string | null;
  profile_image: string | null;
  experience_years: number | null;
  gender: EducatorGender | null;
  verification_status: EducatorVerificationStatus | null;
  created_at: string | null;
  governorate: { name_ar: string } | null;
  subjects: { subject: { name_ar: string } | null }[];
  levels: { level: { name_ar: string } | null }[];
  locations: { governorate: { name_ar: string } | null }[];
}

export interface AdminEducatorFilters {
  status?: EducatorVerificationStatus;
  q?: string;
}

// Keep only Arabic/Latin letters, digits, spaces and '+', which are safe inside a PostgREST
// or() filter value (no commas, parentheses, dots or wildcards).
function sanitizeSearch(q: string): string {
  return q.replace(/[^\u0600-\u06FFa-zA-Z0-9\s+]/g, '').trim().slice(0, 50);
}

export async function getEducatorsForReview(filters: AdminEducatorFilters = {}): Promise<AdminEducatorItem[]> {
  const supabase = createClient();

  // Admin-only rows are enforced by RLS ("Admins can view all educators").
  let query = supabase
    .from('educators')
    .select(
      `id, full_name, phone, whatsapp_number, bio, profile_image, experience_years, gender,
       verification_status, created_at,
       governorate:governorates(name_ar),
       subjects:educator_subjects(subject:service_categories(name_ar)),
       levels:educator_levels(level:education_levels(name_ar)),
       locations:educator_locations(governorate:governorates(name_ar))`
    )
    .order('created_at', { ascending: true });

  if (filters.status) {
    query = query.eq('verification_status', filters.status);
  }

  const q = filters.q ? sanitizeSearch(filters.q) : '';
  if (q) {
    query = query.or(`full_name.ilike.*${q}*,phone.ilike.*${q}*`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as AdminEducatorItem[];
}
