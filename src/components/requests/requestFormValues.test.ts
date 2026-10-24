import { describe, expect, it } from 'vitest';
import { EMPTY_REQUEST_FORM, toFormValues, toRequestInput, validateRequestForm, type RequestFormValues } from './requestFormValues';

const valid: RequestFormValues = {
  ...EMPTY_REQUEST_FORM,
  serviceCategoryId: '4',
  teachingPlaceId: '1',
  governorateId: '2',
  studentAge: '5',
  description: 'نحتاج معلمة لتأسيس القراءة والكتابة باللغة العربية لطفل في الخامسة',
};

describe('validateRequestForm', () => {
  it('accepts a complete request without budget', () => {
    expect(validateRequestForm(valid)).toEqual({});
  });

  it('requires service, place, governorate, age and description', () => {
    expect(Object.keys(validateRequestForm(EMPTY_REQUEST_FORM)).sort()).toEqual(
      ['description', 'governorateId', 'serviceCategoryId', 'studentAge', 'teachingPlaceId'].sort()
    );
  });

  it.each(['1', '16', '4.5', 'abc', ' '])('rejects child age %j', (studentAge) => {
    expect(validateRequestForm({ ...valid, studentAge }).studentAge).toBeDefined();
  });

  it.each(['2', '15'])('accepts child age %s', (studentAge) => {
    expect(validateRequestForm({ ...valid, studentAge })).toEqual({});
  });

  it('counts the description without surrounding spaces', () => {
    const errors = validateRequestForm({ ...valid, description: `   ${'ا'.repeat(49)}   ` });
    expect(errors.description).toContain('49/50');
  });

  it('needs a positive budget and a pricing unit with it', () => {
    expect(validateRequestForm({ ...valid, budget: '0', pricingUnitId: '1' }).budget).toBeDefined();
    expect(validateRequestForm({ ...valid, budget: '150' }).pricingUnitId).toBeDefined();
    expect(validateRequestForm({ ...valid, budget: '150', pricingUnitId: '1' })).toEqual({});
  });
});

describe('toRequestInput / toFormValues', () => {
  it('converts the form to table values, trimming text and nulling empties', () => {
    expect(toRequestInput({ ...valid, area: '  ', description: `  ${valid.description}  ` })).toEqual({
      service_category_id: 4,
      education_level_id: null,
      teaching_place_id: 1,
      governorate_id: 2,
      area: null,
      student_age: 5,
      description: valid.description,
      preferred_educator_gender: null,
      budget: null,
      pricing_unit_id: null,
    });
  });

  it('drops a leftover pricing unit when there is no budget', () => {
    expect(toRequestInput({ ...valid, pricingUnitId: '3' }).pricing_unit_id).toBeNull();
  });

  it('round-trips through the edit form', () => {
    const input = toRequestInput({ ...valid, educationLevelId: '2', area: 'المعادي', preferredGender: 'female', budget: '150', pricingUnitId: '1' });
    expect(toRequestInput(toFormValues(input))).toEqual(input);
  });
});
