// Parses a URL search param as a positive integer ID; anything else means "no filter".
export function parsePositiveIntId(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}
