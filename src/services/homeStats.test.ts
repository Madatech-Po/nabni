import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseMock } from '@/test/supabaseMock';

let mock = createSupabaseMock();
vi.mock('@/utils/supabase/server', () => ({ createClient: () => mock.client }));

import { getPublicHomeStats } from './homeStats';

const stats = { verified_active_educators: 4, open_requests: 2, governorates_covered: 3, accepted_offers_total: 1 };

beforeEach(() => {
  mock = createSupabaseMock();
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

  it('returns null when the call gives nothing back', async () => {
    expect(await getPublicHomeStats()).toBeNull();
  });
});
