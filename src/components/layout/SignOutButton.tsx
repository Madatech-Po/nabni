'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import { createClient } from '@/utils/supabase/client';

// Ends the session and goes back to the home page (NAB-93).
export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      const { error } = await createClient().auth.signOut({ scope: 'local' }); // this browser only
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch {
      setBusy(false); // still signed in: let them try again (NAB-94)
    }
  }

  return (
    <Button onClick={signOut} disabled={busy} variant="outlined" color="primary" sx={{ borderRadius: 6 }}>
      تسجيل الخروج
    </Button>
  );
}
