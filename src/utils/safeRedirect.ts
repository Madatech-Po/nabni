// Only follow redirect targets that stay on this site: a path starting with a single "/".
// "//evil.com" and "/\evil.com" are protocol-relative to browsers, so they are refused too.
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  // Control characters (tabs, newlines) are stripped by browsers and can turn "/\t/evil.com" into "//evil.com".
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
