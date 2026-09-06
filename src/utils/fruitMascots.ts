// Centralized fruit mascot character and avatar image resolver utility for Fruit Drop PWA

/**
 * Resolves the official Fruit Drop 2.5D clay mascot character image path based on fruit name or key.
 *
 * @param fruitNameOrKey - Fruit display name (e.g. 'เงาะโรงเรียน', 'ทุเรียนหมอนทอง', 'มังคุด') or key ('ngo', 'thurian')
 * @returns Absolute public URL path to the transparent 2.5D mascot image
 */
export function getFruitMascotUrl(fruitNameOrKey: string): string {
  const query = (fruitNameOrKey || '').trim().toLowerCase();

  if (query.includes('ทุเรียน') || query.includes('หมอนทอง') || query.includes('thurian')) {
    return '/mascots/mascot_thurian.png';
  }
  if (query.includes('มังคุด') || query.includes('mangkut')) {
    return '/mascots/mascot_mangkut.png';
  }
  if (query.includes('เงาะ') || query.includes('ngo')) {
    return '/mascots/mascot_ngo.png';
  }
  if (query.includes('ลองกอง') || query.includes('longkong')) {
    return '/mascots/mascot_longkong.png';
  }
  if (query.includes('ลางสาด') || query.includes('langsat')) {
    return '/mascots/mascot_langsat.png';
  }
  if (query.includes('ส้ม') || query.includes('som')) {
    return '/mascots/mascot_som.png';
  }
  if (query.includes('มะม่วง') || query.includes('mamuang')) {
    return '/mascots/mascot_mamuang.png';
  }

  // Fallback to official Fruit Drop dual mascot logo
  return '/mascots/logo_fruit_drop.png';
}
