import { describe, expect, it } from 'vitest';
import { NETWORK_ERROR, authErrorMessage, isAuthNetworkError, isEmailNotConfirmed, thrownAuthErrorMessage } from './authErrors';

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

  describe('login errors (NAB-126)', () => {
    it('explains wrong email or password', () => {
      expect(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' }))
        .toBe('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    });

    it('tells an unconfirmed user to open the confirmation email', () => {
      const text = 'لم تفعّل حسابك بعد — افتح رسالة التأكيد التي أرسلناها إلى بريدك واضغط على الرابط';
      expect(authErrorMessage({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toBe(text);
      expect(authErrorMessage({ message: 'Email not confirmed' })).toBe(text);
    });

    it('asks to wait after too many attempts', () => {
      expect(authErrorMessage({ code: 'over_request_rate_limit', message: 'Request rate limit reached' }))
        .toBe('محاولات كثيرة — انتظر قليلاً ثم حاول مرة أخرى');
      expect(authErrorMessage({ message: 'Request rate limit reached' })).toContain('انتظر قليلاً');
    });

    it('explains a network failure', () => {
      expect(authErrorMessage({ name: 'AuthRetryableFetchError', message: '{}' })).toBe(NETWORK_ERROR);
      expect(authErrorMessage({ message: 'Failed to fetch' })).toBe(NETWORK_ERROR);
      expect(authErrorMessage({ message: 'TypeError: fetch failed' })).toBe(NETWORK_ERROR);
    });
  });
});

describe('isEmailNotConfirmed', () => {
  it('spots the unconfirmed-email error by code or message', () => {
    expect(isEmailNotConfirmed({ code: 'email_not_confirmed', message: 'x' })).toBe(true);
    expect(isEmailNotConfirmed({ message: 'Email not confirmed' })).toBe(true);
    expect(isEmailNotConfirmed({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(false);
  });
});

describe('thrownAuthErrorMessage (NAB-136)', () => {
  it('shows the network message for a thrown fetch failure', () => {
    expect(thrownAuthErrorMessage(new TypeError('Failed to fetch'))).toBe(NETWORK_ERROR);
  });

  it('shows the network message for a throw that is not an error', () => {
    expect(thrownAuthErrorMessage('offline')).toBe(NETWORK_ERROR);
    expect(thrownAuthErrorMessage(undefined)).toBe(NETWORK_ERROR);
  });

  it('maps other thrown errors like returned ones', () => {
    expect(thrownAuthErrorMessage(new Error('Invalid login credentials'))).toBe('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  });
});

describe('isAuthNetworkError (NAB-140)', () => {
  it('is true when the request itself failed', () => {
    expect(isAuthNetworkError({ name: 'AuthRetryableFetchError', message: '{}' })).toBe(true);
    expect(isAuthNetworkError({ message: 'Failed to fetch' })).toBe(true);
    expect(isAuthNetworkError({ message: 'fetch failed' })).toBe(true);
  });

  it('is false for an answer about the account or the input', () => {
    expect(isAuthNetworkError({ code: 'user_not_found', message: 'User not found' })).toBe(false);
    expect(isAuthNetworkError({ code: 'over_email_send_rate_limit', message: 'rate limit' })).toBe(false);
    expect(isAuthNetworkError({ message: 'Invalid login credentials' })).toBe(false);
  });
});
