// A minimal stand-in for the Supabase client used by unit tests. Every query records the
// table and chained calls, and resolves to whatever the test's `respond` returns for it.

export interface RecordedCall {
  method: string;
  args: unknown[];
}

export interface RecordedQuery {
  table: string;
  calls: RecordedCall[];
}

export interface MockResult {
  data?: unknown;
  error?: { code?: string; message: string } | null;
}

type Responder = (query: RecordedQuery) => MockResult | undefined;

const CHAIN_METHODS = [
  'select', 'insert', 'update', 'upsert', 'delete',
  'eq', 'neq', 'in', 'or', 'contains', 'ilike', 'order', 'limit', 'range',
  'single', 'maybeSingle',
] as const;

export function createSupabaseMock(respond: Responder = () => undefined) {
  const queries: RecordedQuery[] = [];
  const rpcCalls: { fn: string; args: unknown }[] = [];
  let rpcResult: MockResult = { data: null, error: null };

  function from(table: string) {
    const query: RecordedQuery = { table, calls: [] };
    queries.push(query);

    const builder: Record<string, unknown> = {};
    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        query.calls.push({ method, args });
        return builder;
      };
    }
    // Awaiting the builder runs the query.
    builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
      const result = respond(query) ?? {};
      return Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve, reject);
    };
    return builder;
  }

  const client = {
    from,
    rpc: (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(rpcResult);
    },
  };

  return {
    client,
    queries,
    rpcCalls,
    setRpcResult(result: MockResult) {
      rpcResult = { data: result.data ?? null, error: result.error ?? null };
    },
    /** Queries against one table, in call order. */
    on(table: string) {
      return queries.filter((q) => q.table === table);
    },
  };
}

/** Find the args of the first call to `method` in a recorded query. */
export function argsOf(query: RecordedQuery | undefined, method: string): unknown[] | undefined {
  return query?.calls.find((c) => c.method === method)?.args;
}

/** Every call to `method` in a recorded query. */
export function allArgsOf(query: RecordedQuery | undefined, method: string): unknown[][] {
  return query?.calls.filter((c) => c.method === method).map((c) => c.args) ?? [];
}

export function hasCall(query: RecordedQuery | undefined, method: string): boolean {
  return Boolean(query?.calls.some((c) => c.method === method));
}
