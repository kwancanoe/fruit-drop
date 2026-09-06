// Utility functions for single-time pickup slots & chronological tab filters

/**
 * Convert a time string ("HH:mm", "HH:mm น.", or arbitrary string) into minutes from midnight.
 * Returns 9999 if invalid/unparseable for safe sorting.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 9999;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match || match[1] === undefined || match[2] === undefined) return 9999;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/**
 * Normalize time label to standard "HH:mm น." format
 */
export function normalizeSlotLabel(slotStr: string): string {
  if (!slotStr) return '';
  const trimmed = slotStr.trim();
  const match = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (!match || match[1] === undefined || match[2] === undefined) return trimmed;
  const h = match[1].padStart(2, '0');
  const m = match[2];
  return `${h}:${m} น.`;
}

/**
 * Check if slot is an old range format (e.g. "19:00 - 19:30")
 */
export function isRangeSlot(slotStr: string): boolean {
  if (!slotStr) return false;
  return slotStr.includes('-');
}

/**
 * Generate 30-min (or custom step) interval slots between start and end time.
 * Output format: ["19:00 น.", "19:30 น.", "20:00 น.", ...]
 */
export function generateTimeSlots(startStr: string, endStr: string, stepMinutes: number = 30): string[] {
  const startMin = parseTimeToMinutes(startStr);
  const endMin = parseTimeToMinutes(endStr);
  const slots: string[] = [];

  if (startMin <= endMin && startMin < 9999 && endMin < 9999) {
    for (let m = startMin; m <= endMin; m += stepMinutes) {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const min = (m % 60).toString().padStart(2, '0');
      slots.push(`${h}:${min} น.`);
    }
  }

  if (slots.length === 0) {
    return ['19:00 น.', '19:30 น.', '20:00 น.', '20:30 น.', '21:00 น.'];
  }

  return slots;
}
