import { createClient } from '@/utils/supabase/client';

export interface Governorate {
  id: number;
  name: string;
}

export interface Subject {
  id: number;
  name: string;
  level: string;
}

export async function getGovernorates(): Promise<Governorate[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('governorates').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getSubjects(): Promise<Subject[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('subjects').select('*').order('name');
  if (error) throw error;
  return data || [];
}
