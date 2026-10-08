import { createClient } from '@/utils/supabase/server';

export interface TutorSubject {
  id: number;
  name: string;
  level: string;
}

export interface TutorDirectoryItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  governorate_name: string | null;
  area: string | null;
  bio: string | null;
  years_experience: number | null;
  teaching_methods: string[] | null;
  subjects: TutorSubject[];
}

export interface TutorFilters {
  subjectId?: number;
  governorateId?: number;
}

export async function getTutors(filters: TutorFilters = {}): Promise<TutorDirectoryItem[]> {
  const supabase = createClient();

  let educatorIdsForSubject: string[] | null = null;
  if (filters.subjectId) {
    const { data, error } = await supabase
      .from('educator_services')
      .select('educator_id')
      .eq('subject_id', filters.subjectId);
    if (error) throw error;
    educatorIdsForSubject = (data || []).map((row) => row.educator_id);
    if (educatorIdsForSubject.length === 0) return [];
  }

  let query = supabase.from('tutor_directory').select('*').order('years_experience', { ascending: false });

  if (filters.governorateId) {
    query = query.eq('governorate_id', filters.governorateId);
  }
  if (educatorIdsForSubject) {
    query = query.in('id', educatorIdsForSubject);
  }

  const { data: tutors, error: tutorsError } = await query;
  if (tutorsError) throw tutorsError;
  if (!tutors || tutors.length === 0) return [];

  const tutorIds = tutors.map((t) => t.id);
  const { data: services, error: servicesError } = await supabase
    .from('educator_services')
    .select('educator_id, subject:subjects(id, name, level)')
    .in('educator_id', tutorIds);
  if (servicesError) throw servicesError;

  const subjectsByEducator = new Map<string, TutorSubject[]>();
  for (const row of services || []) {
    const subject = row.subject as unknown as TutorSubject | null;
    if (!subject) continue;
    const list = subjectsByEducator.get(row.educator_id) || [];
    list.push(subject);
    subjectsByEducator.set(row.educator_id, list);
  }

  return tutors.map((t) => ({
    ...t,
    subjects: subjectsByEducator.get(t.id) || [],
  }));
}
