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
  email_not_confirmed: 'أكّد بريدك الإلكتروني أولاً من الرسالة التي أرسلناها لك',
};

const BY_MESSAGE: [RegExp, string][] = [
  [/already registered/i, BY_CODE.user_already_exists],
  [/password should be at least/i, BY_CODE.weak_password],
  [/rate limit/i, BY_CODE.over_request_rate_limit],
  [/invalid format|invalid email/i, BY_CODE.email_address_invalid],
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
];

export function authErrorMessage(error: { code?: string; message: string }): string {
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  const match = BY_MESSAGE.find(([pattern]) => pattern.test(error.message));
  return match ? match[1] : 'حدث خطأ غير متوقع — حاول مرة أخرى';
}
