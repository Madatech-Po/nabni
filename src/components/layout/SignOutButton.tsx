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
    await createClient().auth.signOut({ scope: 'local' }); // this browser only
    router.push('/');
    router.refresh();
  }

  return (
    <Button onClick={signOut} disabled={busy} variant="outlined" color="primary" sx={{ borderRadius: 6 }}>
      تسجيل الخروج
    </Button>
  );
}
