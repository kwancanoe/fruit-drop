// Utility: Search normalization, candidate generation and in-memory search for orders
import type { Order } from '@/types/fruit_app';

/**
 * Result of search candidate extraction.
 */
export interface SearchCandidateResult {
  orderIdCandidates: string[];
  phoneCandidates: string[];
  cleanDigits: string;
  rawText: string;
}

/**
 * Extracts order ID candidates and phone number candidates from a user search query.
 * Normalizes prefixes like '#', '№', handles phone dashes/spaces, and country code 66.
 */
export function extractSearchCandidates(searchQuery: string): SearchCandidateResult {
  const raw = searchQuery.trim();
  if (!raw) return { orderIdCandidates: [], phoneCandidates: [], cleanDigits: '', rawText: '' };

  const stripped = raw.replace(/^[#№]\s*/, '').trim();
  const cleanUpper = stripped.toUpperCase().replace(/\s+/g, '');
  const cleanDigits = raw.replace(/\D/g, '');

  const orderIdSet = new Set<string>();
  const phoneSet = new Set<string>();

  if (cleanUpper) orderIdSet.add(cleanUpper);

  const fdMatch = cleanUpper.match(/^FD[\s-_]?(\d{4})$/i);
  if (fdMatch && fdMatch[1]) {
    orderIdSet.add(`FD-${fdMatch[1]}`);
    orderIdSet.add(fdMatch[1]);
  } else if (/^\d{4}$/.test(stripped)) {
    orderIdSet.add(`FD-${stripped}`);
    orderIdSet.add(stripped);
  }

  let phoneDigits = cleanDigits;
  if (phoneDigits.startsWith('66') && phoneDigits.length >= 11) {
    phoneDigits = '0' + phoneDigits.slice(2);
  }

  if (phoneDigits.length >= 9 && phoneDigits.length <= 11) {
    phoneSet.add(phoneDigits);
    phoneSet.add(raw);
    if (phoneDigits.length === 10) {
      phoneSet.add(phoneDigits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'));
      phoneSet.add(phoneDigits.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'));
    } else if (phoneDigits.length === 9) {
      phoneSet.add(phoneDigits.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3'));
      phoneSet.add(phoneDigits.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3'));
    }
  }

  return {
    orderIdCandidates: Array.from(orderIdSet),
    phoneCandidates: Array.from(phoneSet),
    cleanDigits,
    rawText: raw
  };
}

/**
 * Matches an in-memory order object against a user search query.
 * Checks order ID candidates, phone candidates, and customer name.
 */
export function matchOrderSearch(order: Partial<Order>, searchQuery: string): boolean {
  const raw = searchQuery.trim();
  if (!raw) return false;
  const { orderIdCandidates, phoneCandidates, cleanDigits } = extractSearchCandidates(raw);

  const orderPhoneDigits = (order.customer?.phone || '').replace(/\D/g, '');
  const orderIdClean = (order.orderId || '').toUpperCase().trim();
  const matchId = orderIdCandidates.some(c => c.toUpperCase() === orderIdClean);
  const matchPhone = cleanDigits.length >= 4 && (
    orderPhoneDigits === cleanDigits ||
    (cleanDigits.length >= 9 && orderPhoneDigits.includes(cleanDigits)) ||
    phoneCandidates.some(p => (order.customer?.phone || '') === p)
  );
  const matchName = !!(order.customer?.name && order.customer.name.toLowerCase().includes(raw.toLowerCase()));
  return matchId || matchPhone || matchName;
}
