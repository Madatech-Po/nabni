import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allArgsOf, argsOf, createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/server', () => ({ createClient: () => mock.client }));

import { getEducatorOfferingState, getMyOffers, getMyPendingOffer, getRequestIdsWithMyActiveOffer } from './offers';
import { getOpenRequest } from './requests';

beforeEach(() => {
  mock = createSupabaseMock();
});

describe('getEducatorOfferingState', () => {
  it('allows offers only for a verified, active educator', async () => {
    mock = createSupabaseMock(() => ({ data: { id: 'e1', verification_status: 'verified', is_active: true } }));
    expect(await getEducatorOfferingState('u1')).toEqual({ educatorId: 'e1', verificationStatus: 'verified', canOffer: true });
    expect(argsOf(mock.on('educators')[0], 'eq')).toEqual(['user_id', 'u1']);
  });

  it.each([
    ['pending', true],
    ['suspended', true],
    ['verified', false],
  ])('refuses a %s educator (is_active=%s)', async (verification_status, is_active) => {
    mock = createSupabaseMock(() => ({ data: { id: 'e1', verification_status, is_active } }));
    expect((await getEducatorOfferingState('u1'))?.canOffer).toBe(false);
  });

  it('returns null before the educator profile exists', async () => {
    mock = createSupabaseMock(() => ({ data: null }));
    expect(await getEducatorOfferingState('u1')).toBeNull();
  });
});

describe('getRequestIdsWithMyActiveOffer', () => {
  it('collects requests with a pending or accepted offer', async () => {
    mock = createSupabaseMock(() => ({ data: [{ request_id: 'r1' }, { request_id: 'r2' }] }));

    expect(await getRequestIdsWithMyActiveOffer('e1')).toEqual(new Set(['r1', 'r2']));
    const [query] = mock.on('offers');
    expect(argsOf(query, 'eq')).toEqual(['educator_id', 'e1']);
    expect(argsOf(query, 'in')).toEqual(['status', ['pending', 'accepted']]);
  });
});

describe('getOpenRequest', () => {
  const id = '6c1d3b1e-0d43-4b0e-9a4f-1d2a3b4c5d6e';

  it('loads one open request by id', async () => {
    mock = createSupabaseMock(() => ({ data: { id } }));

    expect(await getOpenRequest(id)).toEqual({ id });
    expect(allArgsOf(mock.on('requests')[0], 'eq')).toEqual([['id', id], ['status', 'open']]);
  });

  it('returns null for a closed or malformed request', async () => {
    mock = createSupabaseMock(() => ({ data: null }));
    expect(await getOpenRequest(id)).toBeNull();
    expect(await getOpenRequest('nope')).toBeNull();
    expect(mock.queries).toHaveLength(1);
  });
});

describe('getMyOffers', () => {
  it("lists the educator's offers newest first with their request", async () => {
    mock = createSupabaseMock(() => ({ data: [{ id: 'o1' }] }));

    expect(await getMyOffers('e1')).toEqual([{ id: 'o1' }]);
    const [query] = mock.on('offers');
    expect(argsOf(query, 'eq')).toEqual(['educator_id', 'e1']);
    expect(argsOf(query, 'order')).toEqual(['created_at', { ascending: false }]);
    expect(String(argsOf(query, 'select')?.[0])).toContain('request:requests(');
  });
});

describe('getMyPendingOffer', () => {
  const id = '6c1d3b1e-0d43-4b0e-9a4f-1d2a3b4c5d6e';

  it("loads only the educator's own pending offer", async () => {
    mock = createSupabaseMock(() => ({ data: { id } }));

    expect(await getMyPendingOffer('e1', id)).toEqual({ id });
    expect(allArgsOf(mock.on('offers')[0], 'eq')).toEqual([['id', id], ['educator_id', 'e1'], ['status', 'pending']]);
  });

  it('returns null for a malformed id without querying', async () => {
    expect(await getMyPendingOffer('e1', 'x')).toBeNull();
    expect(mock.queries).toHaveLength(0);
  });
});
