/**
 * Comprehensive Unit Test: Round Date Parsing, Thai Formatting, and 24:00 Automatic Cutoff
 * Tests polymorphic date handlers, ISO conversion, Thai formatting, and 24:00 end-of-day cutoff rules.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  toRoundDate,
  formatThaiPickupDate,
  toIsoDateString,
  getRoundCutoffTimestamp,
  isRoundPastCutoff,
  createRoundTimestamp
} from '../../src/utils/roundDate.ts';

describe('Round Date & Cutoff Engine Suite', () => {
  describe('Polymorphic Date Parsing (toRoundDate)', () => {
    it('parses ISO date strings (YYYY-MM-DD)', () => {
      const d = toRoundDate('2026-09-08');
      assert.ok(d);
      assert.strictEqual(d.getFullYear(), 2026);
      assert.strictEqual(d.getMonth(), 8); // September (0-indexed)
      assert.strictEqual(d.getDate(), 8);
      assert.strictEqual(toIsoDateString(d), '2026-09-08');
    });

    it('parses serialized Firestore Timestamp ({ seconds, nanoseconds })', () => {
      // 2026-09-08 00:00:00 GMT+7 is 1788800400 in seconds
      const targetDate = new Date(2026, 8, 8, 0, 0, 0);
      const seconds = Math.floor(targetDate.getTime() / 1000);
      const fakeTimestamp = { seconds, nanoseconds: 0 };
      const d = toRoundDate(fakeTimestamp);
      assert.ok(d);
      assert.strictEqual(d.getFullYear(), 2026);
      assert.strictEqual(d.getMonth(), 8);
      assert.strictEqual(d.getDate(), 8);
    });

    it('parses numeric epoch milliseconds', () => {
      const targetDate = new Date(2026, 8, 9, 0, 0, 0);
      const d = toRoundDate(targetDate.getTime());
      assert.ok(d);
      assert.strictEqual(toIsoDateString(d), '2026-09-09');
    });

    it('parses numeric epoch seconds (10-digit number)', () => {
      const targetDate = new Date(2026, 8, 9, 0, 0, 0);
      const d = toRoundDate(Math.floor(targetDate.getTime() / 1000));
      assert.ok(d);
      assert.strictEqual(toIsoDateString(d), '2026-09-09');
    });

    it('parses native Date objects directly', () => {
      const targetDate = new Date(2026, 8, 10, 0, 0, 0);
      const d = toRoundDate(targetDate);
      assert.ok(d);
      assert.strictEqual(toIsoDateString(d), '2026-09-10');
    });

    it('parses legacy Thai date text: "วันอังคารที่ 8 กันยายน 2569"', () => {
      const d = toRoundDate('วันอังคารที่ 8 กันยายน 2569');
      assert.ok(d);
      assert.strictEqual(d.getFullYear(), 2026);
      assert.strictEqual(d.getMonth(), 8);
      assert.strictEqual(d.getDate(), 8);
    });

    it('parses short Thai date text: "8 ก.ย. 2569"', () => {
      const d = toRoundDate('8 ก.ย. 2569');
      assert.ok(d);
      assert.strictEqual(d.getFullYear(), 2026);
      assert.strictEqual(d.getMonth(), 8);
      assert.strictEqual(d.getDate(), 8);
    });

    it('handles Buddhist era in ISO string (e.g. 2569-09-08 -> converts to 2026)', () => {
      const d = toRoundDate('2569-09-08');
      assert.ok(d);
      assert.strictEqual(d.getFullYear(), 2026);
      assert.strictEqual(d.getDate(), 8);
    });

    it('returns null safely for undefined, null, or empty string', () => {
      assert.strictEqual(toRoundDate(undefined), null);
      assert.strictEqual(toRoundDate(null), null);
      assert.strictEqual(toRoundDate(''), null);
      assert.strictEqual(toRoundDate('   '), null);
      assert.strictEqual(toRoundDate('garbage text without date'), null);
    });
  });

  describe('Thai Date Formatting (formatThaiPickupDate)', () => {
    it('formats full Thai date with day of week and Buddhist year', () => {
      const formatted = formatThaiPickupDate('2026-09-08', 'full');
      assert.strictEqual(formatted, 'วันอังคารที่ 8 กันยายน 2569');
    });

    it('formats short Thai date with abbreviated month and Buddhist year', () => {
      const formatted = formatThaiPickupDate('2026-09-08', 'short');
      assert.strictEqual(formatted, '8 ก.ย. 2569');
    });

    it('formats Wednesday 9 September 2026 correctly', () => {
      const full = formatThaiPickupDate('2026-09-09', 'full');
      assert.strictEqual(full, 'วันพุธที่ 9 กันยายน 2569');
      const short = formatThaiPickupDate('2026-09-09', 'short');
      assert.strictEqual(short, '9 ก.ย. 2569');
    });

    it('returns fallback string on unparseable string or fallback message on null', () => {
      assert.strictEqual(formatThaiPickupDate(null), 'ไม่ระบุวันที่');
      assert.strictEqual(formatThaiPickupDate('รอบพิเศษตลาดนัด'), 'รอบพิเศษตลาดนัด');
    });
  });

  describe('Cutoff Timestamp & 24:00 Logic (getRoundCutoffTimestamp & isRoundPastCutoff)', () => {
    it('computes exact 23:59:59.999 boundary of the local round day', () => {
      const round = {
        roundId: 'ROUND-001',
        pickupDate: '2026-09-08'
      };
      const cutoff = getRoundCutoffTimestamp(round);
      const cutoffDate = new Date(cutoff);
      assert.strictEqual(cutoffDate.getFullYear(), 2026);
      assert.strictEqual(cutoffDate.getMonth(), 8);
      assert.strictEqual(cutoffDate.getDate(), 8);
      assert.strictEqual(cutoffDate.getHours(), 23);
      assert.strictEqual(cutoffDate.getMinutes(), 59);
      assert.strictEqual(cutoffDate.getSeconds(), 59);
      assert.strictEqual(cutoffDate.getMilliseconds(), 999);
    });

    it('prioritizes pickupDateIso when available', () => {
      const round = {
        roundId: 'ROUND-TEST',
        pickupDate: 'วันอังคารที่ 8 กันยายน 2569',
        pickupDateIso: '2026-09-08'
      };
      const cutoff = getRoundCutoffTimestamp(round);
      assert.ok(cutoff > 0);
    });

    it('isRoundPastCutoff returns false before 23:59:59.999', () => {
      const round = { roundId: 'R1', pickupDate: '2026-09-08' };
      // 1 minute before midnight
      const now = new Date(2026, 8, 8, 23, 59, 0, 0).getTime();
      assert.strictEqual(isRoundPastCutoff(round, now), false);
    });

    it('isRoundPastCutoff returns false at exact 23:59:59.999 boundary', () => {
      const round = { roundId: 'R1', pickupDate: '2026-09-08' };
      const now = new Date(2026, 8, 8, 23, 59, 59, 999).getTime();
      assert.strictEqual(isRoundPastCutoff(round, now), false);
    });

    it('isRoundPastCutoff returns true at 00:00:00.000 of the following day', () => {
      const round = { roundId: 'R1', pickupDate: '2026-09-08' };
      const now = new Date(2026, 8, 9, 0, 0, 0, 0).getTime();
      assert.strictEqual(isRoundPastCutoff(round, now), true);
    });

    it('isRoundPastCutoff returns true well after cutoff (next morning 08:00)', () => {
      const round = { roundId: 'R1', pickupDate: '2026-09-08' };
      const now = new Date(2026, 8, 9, 8, 0, 0, 0).getTime();
      assert.strictEqual(isRoundPastCutoff(round, now), true);
    });

    it('safely handles missing or null round without crashing', () => {
      assert.strictEqual(isRoundPastCutoff(null), false);
      assert.strictEqual(isRoundPastCutoff(undefined), false);
      assert.strictEqual(isRoundPastCutoff({}), false);
    });
  });

  describe('Firestore Timestamp Creation (createRoundTimestamp)', () => {
    it('creates Timestamp at local midnight', () => {
      const ts = createRoundTimestamp('2026-09-08');
      assert.ok(ts);
      assert.strictEqual(typeof ts.seconds, 'number');
      const d = ts.toDate();
      assert.strictEqual(d.getHours(), 0);
      assert.strictEqual(d.getMinutes(), 0);
      assert.strictEqual(d.getSeconds(), 0);
      assert.strictEqual(d.getDate(), 8);
    });
  });
});
