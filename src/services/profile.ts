import { createClient } from '@/utils/supabase/client';
import type { EducatorGender } from '@/types/database';

export interface ParentProfileData {
  phone: string;
  governorate_id: number;
  city: string;
}

export interface EducatorProfileData {
  full_name: string;
  phone: string;
  whatsapp_number: string | null;
  governorate_id: number;
  bio: string;
  experience_years: number;
  gender: EducatorGender | null;
  profile_image?: string;
}

export interface EducatorSelections {
  subjectIds: number[];
  levelIds: number[];
  locationGovernorateIds: number[];
}

export async function updateParentProfile(userId: string, data: ParentProfileData) {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ ...data, onboarding_completed: true })
    .eq('id', userId);

  if (error) throw error;
}

export async function updateEducatorProfile(
  userId: string,
  data: EducatorProfileData,
  selections: EducatorSelections
) {
  const supabase = createClient();

  // One educators row per user: update it if it exists, otherwise create it.
  const { data: existing, error: lookupError } = await supabase
    .from('educators')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  let educatorId = existing?.id;
  if (educatorId) {
    const { error } = await supabase.from('educators').update(data).eq('id', educatorId);
    if (error) throw error;
  } else {
    const { data: created, error } = await supabase
      .from('educators')
      .insert({ ...data, user_id: userId })
      .select('id')
      .single();
    if (error) throw error;
    educatorId = created.id;
  }

  await replaceRows('educator_subjects', educatorId, selections.subjectIds.map((subject_id) => ({ subject_id })));
  await replaceRows('educator_levels', educatorId, selections.levelIds.map((level_id) => ({ level_id })));
  await replaceRows(
    'educator_locations',
    educatorId,
    selections.locationGovernorateIds.map((governorate_id) => ({ governorate_id }))
  );

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      phone: data.phone,
      governorate_id: data.governorate_id,
      avatar_url: data.profile_image,
      onboarding_completed: true,
    })
    .eq('id', userId);
  if (profileError) throw profileError;
}

type EducatorChildTable = 'educator_subjects' | 'educator_levels' | 'educator_locations';

async function replaceRows(
  table: EducatorChildTable,
  educatorId: string,
  rows: Record<string, number>[]
) {
  const supabase = createClient();

  const { error: deleteError } = await supabase.from(table).delete().eq('educator_id', educatorId);
  if (deleteError) throw deleteError;

  if (rows.length === 0) return;

  const { error: insertError } = await supabase
    .from(table)
    // The row shape differs per table; each caller passes that table's id column.
    .insert(rows.map((row) => ({ ...row, educator_id: educatorId })) as never);
  if (insertError) throw insertError;
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
