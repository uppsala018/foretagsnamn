// MY_PRICES — white-label retail prices for domain.mad.onl
// These override wholesale prices shown to the end customer
// year1 = first year registration price (SEK)
// renewal = annual renewal price after first year (SEK)

export const MY_PRICES: Record<string, { year1: number; renewal: number }> = {
  se:    { year1: 169, renewal: 199 },
  nu:    { year1: 169, renewal: 199 },
  com:   { year1: 149, renewal: 169 },
  xyz:   { year1: 69,  renewal: 89  },
  eu:    { year1: 79,  renewal: 99  },
  io:    { year1: 509, renewal: 549 },
  net:   { year1: 149, renewal: 169 },
  org:   { year1: 119, renewal: 139 },
  app:   { year1: 249, renewal: 279 },
  ai:    { year1: 699, renewal: 749 },
  co:    { year1: 189, renewal: 219 },
  dev:   { year1: 179, renewal: 199 },
  me:    { year1: 159, renewal: 179 },
  store: { year1: 199, renewal: 229 },
};

// Fallback for TLDs not in MY_PRICES
export const FALLBACK_PRICE = { year1: 199, renewal: 229 };

// Get price for a TLD — always returns something
export function getPrice(tld: string): { year1: number; renewal: number } {
  return MY_PRICES[tld.toLowerCase()] ?? FALLBACK_PRICE;
}

// Calculate 10-year bundle price (year1 + 9 renewal years)
export function getTenYearPrice(tld: string): number {
  const p = getPrice(tld);
  return p.year1 + p.renewal * 9;
}

// Format as Swedish price string
export function formatPrice(sek: number): string {
  return sek.toLocaleString('sv-SE') + ' kr';
}
