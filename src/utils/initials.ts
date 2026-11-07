// Built with RegExp: the tsconfig target is too old for a /…/u literal.
const LETTER = new RegExp('\\p{L}', 'u');

/**
 * The first letter of a name, for avatars. Skips symbols, digits and spaces, so "[E2E] متخصص"
 * gives "E" rather than "[" (NAB-98). Undefined when there is no letter: MUI's Avatar then
 * shows its person icon.
 */
export function getInitial(name: string | null | undefined): string | undefined {
  return name?.match(LETTER)?.[0]?.toLocaleUpperCase('ar');
}
