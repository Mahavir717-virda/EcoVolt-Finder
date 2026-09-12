/**
 * Connector Type Normalizer and Matcher
 * Maps diverse naming conventions (e.g. ccs, ccs2, type2, type2_ac) to canonical DB enum values.
 */

export function normalizeConnectorType(t?: string | null): string {
  if (!t) return '';
  const s = t.toLowerCase().replace(/[-_]/g, '');
  if (s === 'ccs' || s === 'ccs2') return 'ccs2';
  if (s === 'type2' || s === 'type2ac') return 'type2_ac';
  if (s === 'bharatdc' || s === 'bharatdc001') return 'bharat_dc_001';
  if (s === 'bharatac' || s === 'bharatac001') return 'bharat_ac_001';
  if (s === 'threepin' || s === '3pin') return 'three_pin';
  if (s === 'chademo') return 'chademo';
  return s;
}

export function isSameConnectorType(t1?: string | null, t2?: string | null): boolean {
  if (!t1 || !t2) return false;
  return normalizeConnectorType(t1) === normalizeConnectorType(t2);
}
