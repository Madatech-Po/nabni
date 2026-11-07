import { describe, expect, it } from 'vitest';
import { validateRegisterForm, type RegisterFormValues } from './registerFormValues';

const valid: RegisterFormValues = {
  firstName: 'منى',
  lastName: 'أحمد',
  email: 'mona+e2e@example.com',
  password: 'secret1',
};

describe('validateRegisterForm', () => {
  it('accepts a complete form, including a + tag in the email', () => {
    expect(validateRegisterForm(valid)).toEqual({});
  });

  it('asks for every empty field', () => {
    expect(validateRegisterForm({ firstName: ' ', lastName: '', email: '', password: '' })).toEqual({
      firstName: 'اكتب الاسم الأول',
      lastName: 'اكتب الاسم الأخير',
      email: 'اكتب البريد الإلكتروني',
      password: 'اكتب كلمة المرور',
    });
  });

  it('points at the keyboard layout when the email is typed in Arabic', () => {
    const errors = validateRegisterForm({ ...valid, email: 'سشينشكينك' });

    expect(errors.email).toContain('حوّل لوحة المفاتيح إلى الإنجليزية');
  });

  it('rejects an email without @ or domain', () => {
    expect(validateRegisterForm({ ...valid, email: 'mona@example' }).email).toContain('غير صحيح');
    expect(validateRegisterForm({ ...valid, email: 'mona.example.com' }).email).toContain('غير صحيح');
  });

  it('needs at least 6 characters and no Arabic letters in the password', () => {
    expect(validateRegisterForm({ ...valid, password: '12345' }).password).toBe('كلمة المرور 6 أحرف على الأقل (5/6)');
    expect(validateRegisterForm({ ...valid, password: 'سشينشك' }).password).toContain('حوّل لوحة المفاتيح');
  });
});
