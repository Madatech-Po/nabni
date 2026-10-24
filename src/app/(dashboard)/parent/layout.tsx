import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import SuspendedNotice from '@/components/account/SuspendedNotice';

// Covers every /parent page so a suspended parent can't reach any of them (NAB-56).
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirectTo=/parent');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single();

  if (profile && !profile.is_active) return <SuspendedNotice />;

  return children;
}
