import { beforeEach, describe, expect, it, vi } from 'vitest';
import { argsOf, createSupabaseMock } from '@/test/supabaseMock';
import type { RequestInput } from '@/components/requests/requestFormValues';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/client', () => ({ createClient: () => mock.client }));

import { createRequest, setMyRequestStatus, updateRequest } from './myRequests';

const input: RequestInput = {
  service_category_id: 4,
  education_level_id: null,
  teaching_place_id: 1,
  governorate_id: 2,
  area: null,
  student_age: 5,
  description: 'x'.repeat(60),
  preferred_educator_gender: null,
  budget: null,
  pricing_unit_id: null,
};

beforeEach(() => {
  mock = createSupabaseMock(() => ({ data: { id: 'r1' } }));
});

describe('createRequest', () => {
  it('inserts the request as the given parent and returns its id', async () => {
    expect(await createRequest('p1', input)).toBe('r1');
    expect(argsOf(mock.on('requests')[0], 'insert')).toEqual([{ ...input, parent_id: 'p1' }]);
  });

  it('rethrows database errors', async () => {
    mock = createSupabaseMock(() => ({ error: { message: 'new row violates row-level security policy' } }));
    await expect(createRequest('p1', input)).rejects.toMatchObject({ message: expect.stringContaining('row-level') });
  });
});

describe('updateRequest / setMyRequestStatus', () => {
  it('updates one request by id', async () => {
    mock = createSupabaseMock(() => ({ data: [{ id: 'r1' }] }));

    await updateRequest('r1', input);
    await setMyRequestStatus('r1', 'closed');

    const [edit, status] = mock.on('requests');
    expect(argsOf(edit, 'update')).toEqual([input]);
    expect(argsOf(edit, 'eq')).toEqual(['id', 'r1']);
    expect(argsOf(status, 'update')).toEqual([{ status: 'closed' }]);
  });

  it('reports a blocked change instead of pretending it worked', async () => {
    // RLS hides removed requests and suspended owners' rows from UPDATE, so no row comes back.
    mock = createSupabaseMock(() => ({ data: [] }));

    await expect(updateRequest('r1', input)).rejects.toThrow('لا يمكن تعديل هذا الطلب.');
    await expect(setMyRequestStatus('r1', 'open')).rejects.toThrow('لا يمكن تعديل هذا الطلب.');
  });
});
