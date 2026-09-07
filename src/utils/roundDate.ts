// Comprehensive Date & Time Engine for Fruit Drop Rounds
// Handles Firestore Timestamp, Epoch Milliseconds, ISO Dates, and Thai Display Formatting
import { Timestamp } from 'firebase/firestore';

export const THAI_DAYS = ['วันอาทิตย์ที่', 'วันจันทร์ที่', 'วันอังคารที่', 'วันพุธที่', 'วันพฤหัสบดีที่', 'วันศุกร์ที่', 'วันเสาร์ที่'];
export const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_MONTH_LOOKUP: Record<string, number> = {
  'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2, 'เมษายน': 3,
  'พฤษภาคม': 4, 'มิถุนายน': 5, 'กรกฎาคม': 6, 'สิงหาคม': 7,
  'กันยายน': 8, 'ตุลาคม': 9, 'พฤศจิกายน': 10, 'ธันวาคม': 11,
  'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3,
  'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7,
  'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11,
  'มค': 0, 'กพ': 1, 'มีค': 2, 'เมย': 3,
  'พค': 4, 'มิย': 5, 'กค': 6, 'สค': 7,
  'กย': 8, 'ตค': 9, 'พย': 10, 'ธค': 11,
};

/**
 * Parses any date representation (Firestore Timestamp, Date, epoch number, ISO string, or Thai string)
 * into a standard JavaScript Date object at 00:00:00 local time.
 */
export function toRoundDate(val: unknown): Date | null {
  if (!val) return null;

  // 1. Firestore Timestamp instance or object with toDate()
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => unknown }).toDate === 'function') {
    const d = (val as { toDate: () => Date }).toDate();
    if (d instanceof Date && !isNaN(d.getTime())) return d;
  }

  // 2. Serialized Firestore Timestamp object { seconds: number, nanoseconds: number }
  if (typeof val === 'object' && val !== null && 'seconds' in val && typeof (val as { seconds: unknown }).seconds === 'number') {
    const d = new Date((val as { seconds: number }).seconds * 1000);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Native JavaScript Date instance
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) return val;
    return null;
  }

  // 4. Epoch timestamp (numeric milliseconds or numeric string)
  if (typeof val === 'number' || (typeof val === 'string' && /^\d{10,13}$/.test(val.trim()))) {
    const num = Number(val);
    const ms = num < 1e11 ? num * 1000 : num;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }

  // 5. String format handling (ISO YYYY-MM-DD or Thai formatted text)
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // 5.1 ISO 8601 (YYYY-MM-DD or YYYY/MM/DD)
    const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10) - 1;
      const d = parseInt(isoMatch[3], 10);
      const gregorianYear = y > 2400 ? y - 543 : y;
      const parsed = new Date(gregorianYear, m, d, 0, 0, 0, 0);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // 5.2 Legacy Thai formatted date string (e.g. "วันอังคารที่ 8 กันยายน 2569", "8 ก.ย. 2569")
    let foundMonthIndex: number | null = null;
    for (const [mName, mIdx] of Object.entries(THAI_MONTH_LOOKUP)) {
      if (trimmed.includes(mName)) {
        foundMonthIndex = mIdx;
        break;
      }
    }

    const numbers = trimmed.match(/\d+/g);
    if (numbers && numbers.length > 0 && foundMonthIndex !== null) {
      const day = parseInt(numbers[0] || '1', 10);
      let year = new Date().getFullYear();
      if (numbers.length >= 2 && numbers[1]) {
        const rawYear = parseInt(numbers[1], 10);
        if (rawYear > 2400) {
          year = rawYear - 543;
        } else if (rawYear < 100) {
          year = (2500 + rawYear) - 543;
        } else {
          year = rawYear;
        }
      }
      const parsed = new Date(year, foundMonthIndex, day, 0, 0, 0, 0);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
}

/**
 * Formats any round date into a natural, beautiful Thai string.
 * @param val Date, Timestamp, epoch ms, ISO string, or existing string
 * @param format 'full' ("วันอังคารที่ 8 กันยายน 2569") or 'short' ("8 ก.ย. 2569")
 */
export function formatThaiPickupDate(val: unknown, format: 'full' | 'short' = 'full'): string {
  const d = toRoundDate(val);
  if (!d) {
    if (typeof val === 'string' && val.trim()) return val.trim();
    return 'ไม่ระบุวันที่';
  }

  const dayNum = d.getDate();
  const monthIdx = d.getMonth();
  const thaiYear = d.getFullYear() + 543;

  if (format === 'short') {
    const monthShort = THAI_MONTHS_SHORT[monthIdx] || '';
    return `${dayNum} ${monthShort} ${thaiYear}`;
  }

  const dayName = THAI_DAYS[d.getDay()] || '';
  const monthFull = THAI_MONTHS[monthIdx] || '';
  return `${dayName} ${dayNum} ${monthFull} ${thaiYear}`;
}

/**
 * Returns ISO Date String (YYYY-MM-DD) from any valid date representation.
 */
export function toIsoDateString(val: unknown): string {
  const d = toRoundDate(val);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculates the exact cutoff epoch timestamp (23:59:59.999 / 24:00:00 of the round date).
 * Once Date.now() exceeds this value, customer booking is strictly closed.
 */
export function getRoundCutoffTimestamp(round: { pickupDate?: unknown; pickupDateIso?: string | undefined } | null | undefined): number {
  if (!round) return 0;
  const d = toRoundDate(round.pickupDateIso || round.pickupDate);
  if (!d) return 0;

  // Set to 23:59:59.999 of that local day (24:00 น.)
  const cutoff = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return cutoff.getTime();
}

/**
 * Checks whether a given round has passed its 24:00 cutoff time.
 */
export function isRoundPastCutoff(round: { pickupDate?: unknown; pickupDateIso?: string | undefined } | null | undefined, now = Date.now()): boolean {
  if (!round) return false;
  const cutoff = getRoundCutoffTimestamp(round);
  if (!cutoff) return false;
  return now > cutoff;
}

/**
 * Creates a Firestore Timestamp representing midnight (00:00:00) of the round date.
 */
export function createRoundTimestamp(val: unknown): Timestamp {
  const d = toRoundDate(val) || new Date();
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  return Timestamp.fromDate(midnight);
}
