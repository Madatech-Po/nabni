/** Longest search term passed to a database filter. */
export const MAX_SEARCH_LENGTH = 50;

/**
 * Keep only Arabic/Latin letters, digits, spaces and '+', which are safe inside a PostgREST
 * or() filter value (no commas, parentheses, dots or wildcards). Trimmed and capped.
 */
export function sanitizeSearch(q: string): string {
  return q.replace(/[^؀-ۿa-zA-Z0-9\s+]/g, '').trim().slice(0, MAX_SEARCH_LENGTH);
}
