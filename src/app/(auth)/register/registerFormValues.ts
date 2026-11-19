export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// Supabase Auth's default minimum password length.
export const MIN_PASSWORD = 6;

// Arabic letters in an email or password almost always mean the keyboard
// layout was left on Arabic, so say that instead of "invalid".
const ARABIC_LETTERS = /[؀-ۿݐ-ݿ]/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const KEYBOARD_HINT = 'مكتوب بحروف عربية — حوّل لوحة المفاتيح إلى الإنجليزية';

export type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>;

/** Arabic message for a bad email, or undefined when it looks fine. */
export function emailError(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'اكتب البريد الإلكتروني';
  if (ARABIC_LETTERS.test(email)) return `البريد الإلكتروني ${KEYBOARD_HINT}`;
  if (!EMAIL_SHAPE.test(email)) return 'البريد الإلكتروني غير صحيح، مثال: name@example.com';
  return undefined;
}

/** Arabic message for a bad new password, or undefined when it is acceptable. */
export function passwordError(password: string): string | undefined {
  if (!password) return 'اكتب كلمة المرور';
  if (ARABIC_LETTERS.test(password)) return `كلمة المرور ${KEYBOARD_HINT}`;
  if (password.length < MIN_PASSWORD) {
    return `كلمة المرور ${MIN_PASSWORD} أحرف على الأقل (${password.length}/${MIN_PASSWORD})`;
  }
  return undefined;
}

export function validateRegisterForm(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!values.firstName.trim()) errors.firstName = 'اكتب الاسم الأول';
  if (!values.lastName.trim()) errors.lastName = 'اكتب الاسم الأخير';

  const email = emailError(values.email);
  if (email) errors.email = email;

  const password = passwordError(values.password);
  if (password) errors.password = password;

  return errors;
}
