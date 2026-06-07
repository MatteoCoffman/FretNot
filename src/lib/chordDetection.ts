export const formatSlashLabel = (
  symbol: string,
  root: string | null,
  bassNote: string | null
): string => {
  if (!root || !bassNote || root === bassNote) return symbol;
  if (symbol.includes("/")) return symbol;
  return `${symbol}/${bassNote}`;
};
