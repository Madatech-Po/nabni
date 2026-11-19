import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { safeNextPath } from '@/utils/safeRedirect';

const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (OTP_TYPES as string[]).includes(value);
}

// Landing page for every Supabase email link (sign-up confirmation, password recovery, ...).
// Supports the SSR pattern (?token_hash=…&type=…) and the PKCE redirect (?code=…).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'), type === 'recovery' ? '/reset-password' : '/dashboard');

  const supabase = createClient();
  let ok = false;

  if (tokenHash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const target = new URL(ok ? next : '/login', request.url);
  if (!ok) target.search = '?error=link';
  return NextResponse.redirect(target);
}
