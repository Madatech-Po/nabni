import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('translates by error code', () => {
    expect(authErrorMessage({ code: 'user_already_exists', message: 'User already registered' }))
      .toBe('هذا البريد مسجّل بالفعل — سجّل الدخول بدلاً من ذلك');
    expect(authErrorMessage({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }))
      .toContain('انتظر قليلاً');
  });

  it('falls back to the English message when there is no code', () => {
    expect(authErrorMessage({ message: 'Password should be at least 6 characters.' }))
      .toBe('كلمة المرور ضعيفة — استخدم 6 أحرف على الأقل');
    expect(authErrorMessage({ message: 'Invalid login credentials' }))
      .toBe('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  });

  it('explains reusing the old password when resetting it', () => {
    expect(authErrorMessage({ code: 'same_password', message: 'x' })).toBe('كلمة المرور الجديدة يجب أن تختلف عن القديمة');
    expect(authErrorMessage({ message: 'New password should be different from the old password.' }))
      .toBe('كلمة المرور الجديدة يجب أن تختلف عن القديمة');
  });

  it('never shows raw English for an unknown error', () => {
    expect(authErrorMessage({ code: 'something_new', message: 'Something new went wrong' }))
      .toBe('حدث خطأ غير متوقع — حاول مرة أخرى');
  });
});
