// Re-export shared retail prices — single source of truth in lib/pricing.ts
export { MY_PRICES, FALLBACK_PRICE, getPrice, formatPrice } from '../../lib/pricing';

import { getPrice } from '../../lib/pricing';

// Domain-shop specific: 10-year bundle calculation
export function getTenYearPrice(tld: string): number {
  const p = getPrice(tld);
  return p.year1 + p.renewal * 9;
}
