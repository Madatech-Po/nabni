import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allArgsOf, argsOf, createSupabaseMock, hasCall, type MockResult, type RecordedQuery } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));

import { updateEducatorProfile, updateParentProfile, type EducatorProfileData } from './profile';

const USER_ID = 'user-1';

const educatorData: EducatorProfileData = {
  full_name: 'منى علي',
  phone: '01012345678',
  whatsapp_number: null,
  governorate_id: 1,
  bio: 'bio',
  experience_years: 3,
  gender: 'female',
};

const selections = { subjectIds: [6, 7], levelIds: [2], locationGovernorateIds: [1, 2] };

function respondWith(overrides: Partial<Record<string, (q: RecordedQuery) => MockResult | undefined>> = {}) {
  return (q: RecordedQuery): MockResult | undefined => {
    const override = overrides[q.table]?.(q);
    if (override) return override;
    if (q.table === 'educators' && hasCall(q, 'maybeSingle')) return { data: null };
    if (q.table === 'educators' && hasCall(q, 'insert')) return { data: { id: 'edu-1' } };
    return { data: null };
  };
}

describe('updateParentProfile', () => {
  beforeEach(() => {
    mock = createSupabaseMock();
  });

  it('saves the parent fields and marks onboarding complete', async () => {
    await updateParentProfile(USER_ID, { phone: '01012345678', governorate_id: 3, city: 'المعادي' });

    const [query] = mock.on('profiles');
    expect(argsOf(query, 'update')).toEqual([
      { phone: '01012345678', governorate_id: 3, city: 'المعادي', onboarding_completed: true },
    ]);
    expect(argsOf(query, 'eq')).toEqual(['id', USER_ID]);
  });

  it('throws when the update fails', async () => {
    mock = createSupabaseMock(() => ({ error: { message: 'nope' } }));

    await expect(
      updateParentProfile(USER_ID, { phone: '01012345678', governorate_id: 3, city: '' })
    ).rejects.toMatchObject({ message: 'nope' });
  });
});

describe('updateEducatorProfile', () => {
  beforeEach(() => {
    mock = createSupabaseMock(respondWith());
  });

  it('creates the educator row for a first-time save', async () => {
    await updateEducatorProfile(USER_ID, educatorData, selections);

    const insert = mock.on('educators').find((q) => hasCall(q, 'insert'));
    expect(argsOf(insert, 'insert')).toEqual([{ ...educatorData, user_id: USER_ID }]);
    expect(mock.on('educators').some((q) => hasCall(q, 'update'))).toBe(false);
  });

  it('updates the existing educator row instead of inserting a second one', async () => {
    mock = createSupabaseMock(
      respondWith({ educators: (q) => (hasCall(q, 'maybeSingle') ? { data: { id: 'edu-9' } } : undefined) })
    );

    await updateEducatorProfile(USER_ID, educatorData, selections);

    const update = mock.on('educators').find((q) => hasCall(q, 'update'));
    expect(argsOf(update, 'update')).toEqual([educatorData]);
    expect(argsOf(update, 'eq')).toEqual(['id', 'edu-9']);
    expect(mock.on('educators').some((q) => hasCall(q, 'insert'))).toBe(false);
  });

  it('replaces services, levels and governorates for the educator', async () => {
    await updateEducatorProfile(USER_ID, educatorData, selections);

    const expectReplaced = (table: string, rows: Record<string, unknown>[]) => {
      const [del, ins] = mock.on(table);
      expect(hasCall(del, 'delete')).toBe(true);
      expect(argsOf(del, 'eq')).toEqual(['educator_id', 'edu-1']);
      expect(argsOf(ins, 'insert')).toEqual([rows]);
    };
    expectReplaced('educator_subjects', [
      { subject_id: 6, educator_id: 'edu-1' },
      { subject_id: 7, educator_id: 'edu-1' },
    ]);
    expectReplaced('educator_levels', [{ level_id: 2, educator_id: 'edu-1' }]);
    expectReplaced('educator_locations', [
      { governorate_id: 1, educator_id: 'edu-1' },
      { governorate_id: 2, educator_id: 'edu-1' },
    ]);
  });

  it('clears a selection without inserting when it is empty', async () => {
    await updateEducatorProfile(USER_ID, educatorData, { ...selections, levelIds: [] });

    const levels = mock.on('educator_levels');
    expect(levels).toHaveLength(1);
    expect(hasCall(levels[0], 'delete')).toBe(true);
  });

  it('mirrors name, phone, governorate and photo onto the profile and completes onboarding', async () => {
    await updateEducatorProfile(USER_ID, { ...educatorData, profile_image: 'https://img/x.png' }, selections);

    const [profile] = mock.on('profiles');
    expect(argsOf(profile, 'update')).toEqual([
      {
        full_name: educatorData.full_name,
        phone: educatorData.phone,
        governorate_id: educatorData.governorate_id,
        avatar_url: 'https://img/x.png',
        onboarding_completed: true,
      },
    ]);
    expect(argsOf(profile, 'eq')).toEqual(['id', USER_ID]);
  });

  it('explains a duplicate phone number in Arabic', async () => {
    mock = createSupabaseMock(
      respondWith({
        educators: (q) =>
          hasCall(q, 'insert')
            ? { error: { code: '23505', message: 'duplicate key value violates unique constraint "educators_phone_key"' } }
            : undefined,
      })
    );

    await expect(updateEducatorProfile(USER_ID, educatorData, selections)).rejects.toThrow(
      'رقم الهاتف مسجّل بالفعل لحساب معلم آخر.'
    );
    expect(mock.on('educator_subjects')).toHaveLength(0);
  });

  it('passes other database errors through unchanged', async () => {
    mock = createSupabaseMock(
      respondWith({
        educators: (q) => (hasCall(q, 'insert') ? { error: { code: '42501', message: 'permission denied' } } : undefined),
      })
    );

    await expect(updateEducatorProfile(USER_ID, educatorData, selections)).rejects.toThrow('permission denied');
  });

  it('stops before touching the profile when a selection fails to save', async () => {
    mock = createSupabaseMock(
      respondWith({ educator_levels: (q) => (hasCall(q, 'insert') ? { error: { message: 'bad level' } } : undefined) })
    );

    await expect(updateEducatorProfile(USER_ID, educatorData, selections)).rejects.toMatchObject({ message: 'bad level' });
    expect(mock.on('profiles')).toHaveLength(0);
    expect(allArgsOf(mock.on('educator_locations')[0], 'delete')).toHaveLength(0);
  });
});
