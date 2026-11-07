import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allArgsOf, argsOf, createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/server', () => ({ createClient: () => mock.client }));

import {
  getEducatorOfferingState, getMatchingOpenRequests, getMyOffers, getMyPendingOffer, getOfferContact, getOffersOnMyRequest,
  getRequestIdsWithMyActiveOffer,
} from './offers';
import { getMyRequest, getOpenRequest } from './requests';

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

describe('getOffersOnMyRequest', () => {
  it('joins each offer with the educator public profile from the directory', async () => {
    mock = createSupabaseMock((q) =>
      q.table === 'offers'
        ? { data: [{ id: 'o1', educator_id: 'e1', status: 'pending' }, { id: 'o2', educator_id: 'e2', status: 'pending' }] }
        : { data: [{ id: 'e1', full_name: 'منى' }] }
    );

    expect(await getOffersOnMyRequest('r1')).toEqual([
      { id: 'o1', status: 'pending', educator: { id: 'e1', full_name: 'منى' } },
      { id: 'o2', status: 'pending', educator: null },
    ]);
    expect(argsOf(mock.on('offers')[0], 'eq')).toEqual(['request_id', 'r1']);
    const [directory] = mock.on('educator_directory');
    expect(argsOf(directory, 'in')).toEqual(['id', ['e1', 'e2']]);
    expect(String(argsOf(directory, 'select')?.[0])).not.toMatch(/phone|whatsapp/);
  });

  it('skips the directory lookup when there are no offers', async () => {
    mock = createSupabaseMock(() => ({ data: [] }));

    expect(await getOffersOnMyRequest('r1')).toEqual([]);
    expect(mock.on('educator_directory')).toHaveLength(0);
  });
});

describe('getMyRequest', () => {
  const id = '6c1d3b1e-0d43-4b0e-9a4f-1d2a3b4c5d6e';

  it("loads one of the parent's own requests with its offer statuses", async () => {
    mock = createSupabaseMock(() => ({ data: { id } }));

    expect(await getMyRequest('p1', id)).toEqual({ id });
    const [query] = mock.on('requests');
    expect(allArgsOf(query, 'eq')).toEqual([['id', id], ['parent_id', 'p1']]);
    expect(String(argsOf(query, 'select')?.[0])).toContain('offers(status)');
  });

  it('returns null for a malformed id', async () => {
    expect(await getMyRequest('p1', 'x')).toBeNull();
    expect(mock.queries).toHaveLength(0);
  });
});

describe('getOfferContact', () => {
  it('asks the database for the contact of an accepted offer', async () => {
    mock.setRpcResult({ data: [{ full_name: 'منى', phone: '01012345678', whatsapp_number: null }] });

    expect(await getOfferContact('o1')).toEqual({ full_name: 'منى', phone: '01012345678', whatsapp_number: null });
    expect(mock.rpcCalls).toEqual([{ fn: 'get_offer_contact', args: { p_offer_id: 'o1' } }]);
  });

  it('returns null when the database hands out nothing', async () => {
    mock.setRpcResult({ data: [] });
    expect(await getOfferContact('o1')).toBeNull();
  });
});

describe('getMatchingOpenRequests', () => {
  function respondWith(subjects: object[], locations: object[], home: object | null) {
    return createSupabaseMock((q) => {
      if (q.table === 'educator_subjects') return { data: subjects };
      if (q.table === 'educator_locations') return { data: locations };
      if (q.table === 'educators') return { data: home };
      return { data: [{ id: 'r1' }] };
    });
  }

  it("filters open requests by the educator's services and governorates, newest first", async () => {
    mock = respondWith([{ subject_id: 4 }, { subject_id: 5 }], [{ governorate_id: 2 }], { governorate_id: 1 });

    expect(await getMatchingOpenRequests('e1', 3)).toEqual([{ id: 'r1' }]);
    const [query] = mock.on('requests');
    expect(argsOf(query, 'eq')).toEqual(['status', 'open']);
    expect(allArgsOf(query, 'in')).toEqual([['service_category_id', [4, 5]], ['governorate_id', [2, 1]]]);
    expect(argsOf(query, 'limit')).toEqual([3]);
  });

  it('skips the governorate filter when none is known', async () => {
    mock = respondWith([{ subject_id: 4 }], [], { governorate_id: null });

    await getMatchingOpenRequests('e1');
    expect(allArgsOf(mock.on('requests')[0], 'in')).toEqual([['service_category_id', [4]]]);
  });

  it('returns nothing before the educator picks services', async () => {
    mock = respondWith([], [{ governorate_id: 2 }], null);

    expect(await getMatchingOpenRequests('e1')).toEqual([]);
    expect(mock.on('requests')).toHaveLength(0);
  });
});
