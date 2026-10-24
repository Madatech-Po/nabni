import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import SuspendedNotice from '@/components/account/SuspendedNotice';

// Covers every /parent page: parents only, and a suspended parent sees a notice instead (NAB-56).
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirectTo=/parent');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  // Fail closed: without a readable parent profile nothing here is shown. Educators and
  // admins have their own dashboards; /dashboard sends each role home.
  if (error || !profile || profile.role !== 'parent') redirect('/dashboard');
  if (!profile.is_active) return <SuspendedNotice />;

  return children;
}
