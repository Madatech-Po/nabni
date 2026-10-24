import { createClient } from '@/utils/supabase/server';
import type { EducatorGender, EducatorVerificationStatus, RequestStatus } from '@/types/database';

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

export const ADMIN_PAGE_SIZE = 20;

export interface Paged<T> {
  items: T[];
  total: number;
}

// Zero-based inclusive row range for a 1-based page number from the URL.
function pageRange(page: number | undefined): [number, number] {
  const current = Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1;
  const from = (current - 1) * ADMIN_PAGE_SIZE;
  return [from, from + ADMIN_PAGE_SIZE - 1];
}

export interface AdminParentItem {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  governorate: { name_ar: string } | null;
  requests: { count: number }[];
}

export interface AdminParentFilters {
  active?: boolean;
  q?: string;
  page?: number;
}

export async function getParentsForAdmin(filters: AdminParentFilters = {}): Promise<Paged<AdminParentItem>> {
  const supabase = createClient();

  // Every profile is readable by admins ("Admins can view all profiles", NAB-51).
  let query = supabase
    .from('profiles')
    .select('id, full_name, phone, is_active, created_at, governorate:governorates(name_ar), requests(count)', {
      count: 'exact',
    })
    .eq('role', 'parent')
    .order('created_at', { ascending: false });

  if (filters.active !== undefined) {
    query = query.eq('is_active', filters.active);
  }

  const q = filters.q ? sanitizeSearch(filters.q) : '';
  if (q) {
    query = query.or(`full_name.ilike.*${q}*,phone.ilike.*${q}*`);
  }

  const { data, error, count } = await query.range(...pageRange(filters.page));
  if (error) throw error;
  return { items: (data || []) as unknown as AdminParentItem[], total: count ?? 0 };
}

export const REQUEST_STATUSES: RequestStatus[] = ['open', 'closed', 'cancelled', 'removed'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AdminRequestItem {
  id: string;
  description: string;
  student_age: number;
  status: RequestStatus;
  budget: number | null;
  area: string | null;
  created_at: string;
  parent: { id: string; full_name: string; phone: string | null; is_active: boolean } | null;
  service_category: { name_ar: string } | null;
  governorate: { name_ar: string } | null;
  pricing_unit: { name_ar: string } | null;
}

export interface AdminRequestFilters {
  status?: RequestStatus;
  serviceCategoryId?: number;
  governorateId?: number;
  parentId?: string;
  q?: string;
  page?: number;
}

export async function getRequestsForAdmin(filters: AdminRequestFilters = {}): Promise<Paged<AdminRequestItem>> {
  const supabase = createClient();

  // Admins read every request, removed ones included ("Admins can view all requests", NAB-51).
  let query = supabase
    .from('requests')
    .select(
      `id, description, student_age, status, budget, area, created_at,
       parent:profiles(id, full_name, phone, is_active),
       service_category:service_categories(name_ar),
       governorate:governorates(name_ar),
       pricing_unit:pricing_units(name_ar)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.serviceCategoryId) query = query.eq('service_category_id', filters.serviceCategoryId);
  if (filters.governorateId) query = query.eq('governorate_id', filters.governorateId);
  // An invalid id would make Postgres reject the whole query; ignore it instead.
  if (filters.parentId && UUID_RE.test(filters.parentId)) query = query.eq('parent_id', filters.parentId);

  const q = filters.q ? sanitizeSearch(filters.q) : '';
  if (q) query = query.ilike('description', `%${q}%`);

  const { data, error, count } = await query.range(...pageRange(filters.page));
  if (error) throw error;
  return { items: (data || []) as unknown as AdminRequestItem[], total: count ?? 0 };
}
