import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimeToMinutes,
  normalizeSlotLabel,
  isRangeSlot,
  generateTimeSlots
} from '../../src/utils/timeSlots.ts';

describe('Empirical Challenger: Time Slots & Error Handling Suite', () => {

  describe('1. Mission Mandated Cases for generateTimeSlots', () => {
    it('Case 1.1: Standard daytime window (19:00 to 23:00, step 30m) produces exactly 9 slots', () => {
      const slots = generateTimeSlots('19:00', '23:00', 30);
      assert.equal(slots.length, 9, 'Should have exactly 9 slots');
      assert.deepEqual(slots, [
        '19:00 น.',
        '19:30 น.',
        '20:00 น.',
        '20:30 น.',
        '21:00 น.',
        '21:30 น.',
        '22:00 น.',
        '22:30 น.',
        '23:00 น.'
      ]);
    });

    it('Case 1.2: Overnight window (22:00 to 02:00, step 30m) produces exactly 9 slots across midnight', () => {
      const slots = generateTimeSlots('22:00', '02:00', 30);
      assert.equal(slots.length, 9, 'Should have exactly 9 slots');
      assert.deepEqual(slots, [
        '22:00 น.',
        '22:30 น.',
        '23:00 น.',
        '23:30 น.',
        '00:00 น.',
        '00:30 น.',
        '01:00 น.',
        '01:30 น.',
        '02:00 น.'
      ]);
    });

    it('Case 1.3: Past-midnight window (23:30 to 00:30, step 30m) produces exactly 3 slots', () => {
      const slots = generateTimeSlots('23:30', '00:30', 30);
      assert.equal(slots.length, 3, 'Should have exactly 3 slots');
      assert.deepEqual(slots, [
        '23:30 น.',
        '00:00 น.',
        '00:30 น.'
      ]);
    });

    it('Case 1.4: Single slot (20:00 to 20:00, step 30m) produces exactly 1 slot', () => {
      const slots = generateTimeSlots('20:00', '20:00', 30);
      assert.equal(slots.length, 1, 'Should have exactly 1 slot');
      assert.deepEqual(slots, ['20:00 น.']);
    });

    it('Case 1.5: Malformed / invalid inputs produce empty array (zero hardcoded 5-slot dummy fallback)', () => {
      // Empty strings
      assert.deepEqual(generateTimeSlots('', ''), [], 'empty start and end');
      assert.deepEqual(generateTimeSlots('', '20:00'), [], 'empty start');
      assert.deepEqual(generateTimeSlots('19:00', ''), [], 'empty end');

      // Non-parseable strings
      assert.deepEqual(generateTimeSlots('invalid', '20:00'), [], 'invalid start');
      assert.deepEqual(generateTimeSlots('19:00', 'garbage'), [], 'invalid end');
      assert.deepEqual(generateTimeSlots('abc', 'def'), [], 'both invalid');

      // Invalid steps
      assert.deepEqual(generateTimeSlots('19:00', '20:00', 0), [], 'zero step');
      assert.deepEqual(generateTimeSlots('19:00', '20:00', -15), [], 'negative step');
      assert.deepEqual(generateTimeSlots('19:00', '20:00', -1), [], 'negative step -1');

      // Verify zero presence of legacy 5-slot dummy fallback
      const dummySlots = ['19:00 น.', '19:30 น.', '20:00 น.', '20:30 น.', '21:00 น.'];
      assert.notDeepEqual(generateTimeSlots('', ''), dummySlots);
      assert.notDeepEqual(generateTimeSlots('invalid', 'invalid'), dummySlots);
    });
  });

  describe('2. Adversarial Edge Cases & Boundary Conditions', () => {
    it('handles single-digit hour strings with leading zero padding', () => {
      const slots = generateTimeSlots('9:00', '10:30', 30);
      assert.deepEqual(slots, [
        '09:00 น.',
        '09:30 น.',
        '10:00 น.',
        '10:30 น.'
      ]);
    });

    it('handles inputs already containing Thai suffix', () => {
      const slots = generateTimeSlots('22:00 น.', '01:00 น.', 60);
      assert.deepEqual(slots, [
        '22:00 น.',
        '23:00 น.',
        '00:00 น.',
        '01:00 น.'
      ]);
    });

    it('handles exact midnight transitions (00:00 to 00:00, 23:30 to 00:00)', () => {
      assert.deepEqual(generateTimeSlots('00:00', '00:00', 30), ['00:00 น.']);
      assert.deepEqual(generateTimeSlots('23:30', '00:00', 30), ['23:30 น.', '00:00 น.']);
      assert.deepEqual(generateTimeSlots('00:00', '01:00', 30), ['00:00 น.', '00:30 น.', '01:00 น.']);
    });

    it('handles custom step sizes (15m, 45m, 60m)', () => {
      // 15 min overnight
      const s15 = generateTimeSlots('23:45', '00:15', 15);
      assert.deepEqual(s15, ['23:45 น.', '00:00 น.', '00:15 น.']);

      // 45 min step
      const s45 = generateTimeSlots('23:00', '01:00', 45);
      assert.deepEqual(s45, ['23:00 น.', '23:45 น.', '00:30 น.']);

      // 60 min step
      const s60 = generateTimeSlots('22:00', '02:00', 60);
      assert.deepEqual(s60, ['22:00 น.', '23:00 น.', '00:00 น.', '01:00 น.', '02:00 น.']);
    });

    it('handles step larger than total window duration', () => {
      const slots = generateTimeSlots('19:00', '19:20', 30);
      assert.deepEqual(slots, ['19:00 น.']);
    });

    it('full 24-hour cycle boundary behavior', () => {
      // 00:00 to 23:30 gives 48 slots
      const allSlots = generateTimeSlots('00:00', '23:30', 30);
      assert.equal(allSlots.length, 48);
      assert.equal(allSlots[0], '00:00 น.');
      assert.equal(allSlots[47], '23:30 น.');
    });
  });

  describe('3. Helper Utilities: parseTimeToMinutes, normalizeSlotLabel, isRangeSlot', () => {
    it('parseTimeToMinutes parses standard, padded, suffix, and returns 9999 for invalid', () => {
      assert.equal(parseTimeToMinutes('00:00'), 0);
      assert.equal(parseTimeToMinutes('01:30'), 90);
      assert.equal(parseTimeToMinutes('19:00'), 1140);
      assert.equal(parseTimeToMinutes('19:00 น.'), 1140);
      assert.equal(parseTimeToMinutes('23:59'), 1439);
      assert.equal(parseTimeToMinutes(''), 9999);
      assert.equal(parseTimeToMinutes('not-a-time'), 9999);
    });

    it('normalizeSlotLabel cleans whitespace, adds suffix, or preserves unparseable', () => {
      assert.equal(normalizeSlotLabel('19:00'), '19:00 น.');
      assert.equal(normalizeSlotLabel('9:30'), '09:30 น.');
      assert.equal(normalizeSlotLabel(' 20:00 น. '), '20:00 น.');
      assert.equal(normalizeSlotLabel(''), '');
      assert.equal(normalizeSlotLabel('Special delivery'), 'Special delivery');
    });

    it('isRangeSlot identifies legacy range formats', () => {
      assert.equal(isRangeSlot('19:00 - 19:30'), true);
      assert.equal(isRangeSlot('19:00-19:30'), true);
      assert.equal(isRangeSlot('19:00 น.'), false);
      assert.equal(isRangeSlot(''), false);
    });
  });

  describe('4. Chronological Sorting Invariant for Overnight Dispatch Tabs', () => {
    it('sorts overnight slots starting at 22:00 in correct order (22:00 -> 02:00)', () => {
      const unsorted = [
        '01:30 น.',
        '23:00 น.',
        '00:30 น.',
        '22:00 น.',
        '02:00 น.',
        '22:30 น.',
        '00:00 น.',
        '01:00 น.',
        '23:30 น.'
      ];
      const startMin = parseTimeToMinutes('22:00'); // 1320
      const sorted = [...unsorted].sort((a, b) => {
        const ma = parseTimeToMinutes(a);
        const mb = parseTimeToMinutes(b);
        if (startMin >= 9999) return ma - mb;
        const diffA = (ma - startMin + 1440) % 1440;
        const diffB = (mb - startMin + 1440) % 1440;
        return diffA - diffB;
      });

      assert.deepEqual(sorted, [
        '22:00 น.',
        '22:30 น.',
        '23:00 น.',
        '23:30 น.',
        '00:00 น.',
        '00:30 น.',
        '01:00 น.',
        '01:30 น.',
        '02:00 น.'
      ]);
    });

    it('sorts daytime slots starting at 19:00 in correct order (19:00 -> 21:00)', () => {
      const unsorted = ['21:00 น.', '19:30 น.', '19:00 น.', '20:30 น.', '20:00 น.'];
      const startMin = parseTimeToMinutes('19:00');
      const sorted = [...unsorted].sort((a, b) => {
        const ma = parseTimeToMinutes(a);
        const mb = parseTimeToMinutes(b);
        if (startMin >= 9999) return ma - mb;
        const diffA = (ma - startMin + 1440) % 1440;
        const diffB = (mb - startMin + 1440) % 1440;
        return diffA - diffB;
      });

      assert.deepEqual(sorted, [
        '19:00 น.',
        '19:30 น.',
        '20:00 น.',
        '20:30 น.',
        '21:00 น.'
      ]);
    });
  });
});
