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

export const FALLBACK_PRICE = { year1: 199, renewal: 229 };

export function getPrice(tld: string): { year1: number; renewal: number } {
  return MY_PRICES[tld.toLowerCase()] ?? FALLBACK_PRICE;
}

export function formatPrice(sek: number): string {
  return sek.toLocaleString('sv-SE') + ' kr';
}
