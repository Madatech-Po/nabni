import { createClient } from '@/utils/supabase/client';

export interface ProfileUpdateData {
  phone: string;
  governorate_id: number;
  area: string;
  is_profile_complete: boolean;
}

export interface TeacherDetailsUpdateData {
  bio: string;
  years_experience: number;
  teaching_methods: string[];
  subjects_taught: number[];
  areas_covered: string[];
}

export async function updateParentProfile(userId: string, data: ProfileUpdateData) {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId);
  
  if (error) throw error;
}

export async function updateTeacherProfile(userId: string, profileData: ProfileUpdateData, detailsData: TeacherDetailsUpdateData) {
  const supabase = createClient();
  
  // Update base profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId);
    
  if (profileError) throw profileError;

  // Upsert teacher details
  const { error: detailsError } = await supabase
    .from('teacher_details')
    .upsert({
      id: userId,
      ...detailsData
    });

  if (detailsError) throw detailsError;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

