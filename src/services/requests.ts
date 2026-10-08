import { createClient } from '@/utils/supabase/server';

export interface RequestFeedItem {
  id: string;
  student_age: number;
  description: string;
  preferred_teacher_gender: 'male' | 'female' | 'any';
  preferred_teaching_method: 'online' | 'offline' | 'both';
  budget: number | null;
  area: string;
  created_at: string;
  subject: { name: string; level: string } | null;
  governorate: { name: string } | null;
}

export interface RequestFilters {
  subjectId?: number;
  governorateId?: number;
}

export async function getOpenRequests(filters: RequestFilters = {}): Promise<RequestFeedItem[]> {
  const supabase = createClient();

  let query = supabase
    .from('requests')
    .select(
      'id, student_age, description, preferred_teacher_gender, preferred_teaching_method, budget, area, created_at, subject:subjects(name, level), governorate:governorates(name)'
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (filters.subjectId) {
    query = query.eq('subject_id', filters.subjectId);
  }
  if (filters.governorateId) {
    query = query.eq('governorate_id', filters.governorateId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as RequestFeedItem[];
}
