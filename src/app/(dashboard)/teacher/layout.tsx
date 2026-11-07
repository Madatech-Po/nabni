import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

// Covers every /teacher page: educators only, failing closed like the parent area (NAB-66).
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirectTo=/teacher');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Parents and admins have their own dashboards; /dashboard sends each role home.
  if (error || !profile || profile.role !== 'educator') redirect('/dashboard');

  return children;
}
