import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
let clientFails = false;
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => {
    if (clientFails) throw new Error('no cookies');
    return mock.client;
  },
}));

import { getPublicHomeStats } from './homeStats';

const stats = { verified_active_educators: 4, open_requests: 2, governorates_covered: 3, accepted_offers_total: 1 };

beforeEach(() => {
  mock = createSupabaseMock();
  clientFails = false;
});

describe('getPublicHomeStats (NAB-123)', () => {
  it('reads the counters from public_home_stats()', async () => {
    mock.setRpcResult({ data: stats });

    expect(await getPublicHomeStats()).toEqual(stats);
    expect(mock.rpcCalls).toEqual([{ fn: 'public_home_stats', args: undefined }]);
  });

  it('returns null when the call fails, so nothing fake is shown', async () => {
    mock.setRpcResult({ error: { message: 'down' } });
    expect(await getPublicHomeStats()).toBeNull();
  });

  it('returns null when the request throws, so the home page still renders (NAB-140)', async () => {
    vi.spyOn(mock.client, 'rpc').mockRejectedValue(new TypeError('fetch failed'));
    expect(await getPublicHomeStats()).toBeNull();
  });

  it('returns null when the client cannot be created (NAB-140)', async () => {
    clientFails = true;
    expect(await getPublicHomeStats()).toBeNull();
  });

  it('returns null when the call gives nothing back', async () => {
    expect(await getPublicHomeStats()).toBeNull();
  });
});
