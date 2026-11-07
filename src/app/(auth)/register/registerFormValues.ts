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

export function validateRegisterForm(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!values.firstName.trim()) errors.firstName = 'اكتب الاسم الأول';
  if (!values.lastName.trim()) errors.lastName = 'اكتب الاسم الأخير';

  const email = values.email.trim();
  if (!email) errors.email = 'اكتب البريد الإلكتروني';
  else if (ARABIC_LETTERS.test(email)) errors.email = `البريد الإلكتروني ${KEYBOARD_HINT}`;
  else if (!EMAIL_SHAPE.test(email)) errors.email = 'البريد الإلكتروني غير صحيح، مثال: name@example.com';

  if (!values.password) errors.password = 'اكتب كلمة المرور';
  else if (ARABIC_LETTERS.test(values.password)) errors.password = `كلمة المرور ${KEYBOARD_HINT}`;
  else if (values.password.length < MIN_PASSWORD) {
    errors.password = `كلمة المرور ${MIN_PASSWORD} أحرف على الأقل (${values.password.length}/${MIN_PASSWORD})`;
  }

  return errors;
}
