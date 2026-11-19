// Supabase Auth returns English messages; show Arabic ones. Matches on the
// error code first (supabase-js v2), then on the message for older responses.
const BY_CODE: Record<string, string> = {
  user_already_exists: 'هذا البريد مسجّل بالفعل — سجّل الدخول بدلاً من ذلك',
  email_exists: 'هذا البريد مسجّل بالفعل — سجّل الدخول بدلاً من ذلك',
  weak_password: 'كلمة المرور ضعيفة — استخدم 6 أحرف على الأقل',
  email_address_invalid: 'البريد الإلكتروني غير صحيح',
  over_email_send_rate_limit: 'محاولات تسجيل كثيرة — انتظر قليلاً ثم حاول مرة أخرى',
  over_request_rate_limit: 'محاولات كثيرة — انتظر قليلاً ثم حاول مرة أخرى',
  signup_disabled: 'التسجيل متوقف حالياً',
  invalid_credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  email_not_confirmed: 'لم تفعّل حسابك بعد — افتح رسالة التأكيد التي أرسلناها إلى بريدك واضغط على الرابط',
  same_password: 'كلمة المرور الجديدة يجب أن تختلف عن القديمة',
};

export const NETWORK_ERROR = 'تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى';

const BY_MESSAGE: [RegExp, string][] = [
  [/already registered/i, BY_CODE.user_already_exists],
  [/password should be at least/i, BY_CODE.weak_password],
  [/rate limit/i, BY_CODE.over_request_rate_limit],
  [/invalid format|invalid email/i, BY_CODE.email_address_invalid],
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/different from the old password/i, BY_CODE.same_password],
  [/failed to fetch|fetch failed|networkerror|network request failed|load failed/i, NETWORK_ERROR],
];

type AuthErrorLike = { code?: string; message: string; name?: string };

export function authErrorMessage(error: AuthErrorLike): string {
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  // supabase-js wraps a failed request (offline, DNS, server down) in AuthRetryableFetchError.
  if (error.name === 'AuthRetryableFetchError') return NETWORK_ERROR;
  const match = BY_MESSAGE.find(([pattern]) => pattern.test(error.message));
  return match ? match[1] : 'حدث خطأ غير متوقع — حاول مرة أخرى';
}

// The account exists but its email link was never clicked: the login form offers to resend it.
export function isEmailNotConfirmed(error: AuthErrorLike): boolean {
  return error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message);
}
