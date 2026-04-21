const isEnglishLetter = (char: string): boolean => {
  return /^[a-zA-Z]$/.test(char);
};

/**
 * Returns a single uppercase Latin initial for the account avatar when the first
 * character of `principal` is an English letter; otherwise returns an empty string.
 */
export const getPrincipalDisplayInitial = (principal: string): string => {
  const trimmed: string = principal.trim();
  if (trimmed.length === 0) {
    return "";
  }
  const first: string = trimmed[0] ?? "";
  if (!isEnglishLetter(first)) {
    return "";
  }
  return first.toUpperCase();
};
