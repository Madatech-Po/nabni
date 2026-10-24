import type { EducatorGender } from '@/types/database';

// Form state keeps every field as a string (what the inputs give us); toRequestInput converts.
export interface RequestFormValues {
  serviceCategoryId: string;
  educationLevelId: string;
  teachingPlaceId: string;
  governorateId: string;
  area: string;
  studentAge: string;
  description: string;
  preferredGender: '' | EducatorGender;
  budget: string;
  pricingUnitId: string;
}

export const EMPTY_REQUEST_FORM: RequestFormValues = {
  serviceCategoryId: '',
  educationLevelId: '',
  teachingPlaceId: '',
  governorateId: '',
  area: '',
  studentAge: '',
  description: '',
  preferredGender: '',
  budget: '',
  pricingUnitId: '',
};

// Same limits as the requests table's CHECK constraints.
export const MIN_DESCRIPTION = 50;
export const MIN_AGE = 2;
export const MAX_AGE = 15;

export type RequestFormErrors = Partial<Record<keyof RequestFormValues, string>>;

export function validateRequestForm(values: RequestFormValues): RequestFormErrors {
  const errors: RequestFormErrors = {};

  if (!values.serviceCategoryId) errors.serviceCategoryId = 'اختر الخدمة';
  if (!values.teachingPlaceId) errors.teachingPlaceId = 'اختر مكان التدريس';
  if (!values.governorateId) errors.governorateId = 'اختر المحافظة';

  const age = Number(values.studentAge);
  if (!values.studentAge.trim() || !Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) {
    errors.studentAge = `عمر الطفل من ${MIN_AGE} إلى ${MAX_AGE} سنة`;
  }

  const description = values.description.trim();
  if (description.length < MIN_DESCRIPTION) {
    errors.description = `اكتب ${MIN_DESCRIPTION} حرفاً على الأقل (${description.length}/${MIN_DESCRIPTION})`;
  }

  if (values.budget.trim()) {
    const budget = Number(values.budget);
    if (!Number.isFinite(budget) || budget <= 0) errors.budget = 'الميزانية يجب أن تكون رقماً أكبر من صفر';
    else if (!values.pricingUnitId) errors.pricingUnitId = 'اختر وحدة السعر (حصة، شهر...)';
  }

  return errors;
}

export interface RequestInput {
  service_category_id: number;
  education_level_id: number | null;
  teaching_place_id: number;
  governorate_id: number;
  area: string | null;
  student_age: number;
  description: string;
  preferred_educator_gender: EducatorGender | null;
  budget: number | null;
  pricing_unit_id: number | null;
}

/** Call only after validateRequestForm returned no errors. */
export function toRequestInput(values: RequestFormValues): RequestInput {
  const hasBudget = values.budget.trim() !== '';
  return {
    service_category_id: Number(values.serviceCategoryId),
    education_level_id: values.educationLevelId ? Number(values.educationLevelId) : null,
    teaching_place_id: Number(values.teachingPlaceId),
    governorate_id: Number(values.governorateId),
    area: values.area.trim() || null,
    student_age: Number(values.studentAge),
    description: values.description.trim(),
    preferred_educator_gender: values.preferredGender || null,
    budget: hasBudget ? Number(values.budget) : null,
    pricing_unit_id: hasBudget ? Number(values.pricingUnitId) : null,
  };
}

/** The reverse, for prefilling the edit form. */
export function toFormValues(row: RequestInput): RequestFormValues {
  const str = (v: number | null) => (v === null ? '' : String(v));
  return {
    serviceCategoryId: String(row.service_category_id),
    educationLevelId: str(row.education_level_id),
    teachingPlaceId: String(row.teaching_place_id),
    governorateId: String(row.governorate_id),
    area: row.area ?? '',
    studentAge: String(row.student_age),
    description: row.description,
    preferredGender: row.preferred_educator_gender ?? '',
    budget: str(row.budget),
    pricingUnitId: str(row.pricing_unit_id),
  };
}
