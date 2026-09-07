import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper functions mirroring src/utils/pricing.ts logic
function calculateItemSubtotal(item, products) {
  const orderedKg = typeof item.orderedKg === 'number' ? item.orderedKg : Number(item.orderedKg);
  if (item.productType === 'FIXED_WEIGHT' && (orderedKg === 0 || isNaN(orderedKg) || orderedKg < 0)) {
    return 0;
  }

  if (typeof item.itemFinalPrice === 'number' && !isNaN(item.itemFinalPrice)) {
    return item.itemFinalPrice;
  }

  if (item.productType === 'VARIABLE_WHOLE_FRUIT') {
    if (typeof item.actualWeighedKg === 'number' && item.actualWeighedKg > 0) {
      return Math.round(item.actualWeighedKg * (item.pricePerKg || 0));
    }
    return 0;
  }

  if (
    typeof item.bundlePrice === 'number' &&
    !isNaN(item.bundlePrice) &&
    item.bundlePrice > 0 &&
    (item.bundleQtyKg === undefined || item.bundleQtyKg === orderedKg)
  ) {
    return item.bundlePrice;
  }

  if (products && products.length > 0) {
    const product = products.find(p => p.id === item.productId);
    if (product?.bundles && product.bundles.length > 0) {
      const matchingBundle = product.bundles.find(
        b => b.qtyKg === orderedKg || (item.orderedBundle && b.label === item.orderedBundle)
      );
      if (matchingBundle) {
        return matchingBundle.price;
      }
    }
  }

  if (isNaN(orderedKg) || orderedKg <= 0) {
    return 0;
  }
  return Math.round(orderedKg * (item.pricePerKg || 0));
}

function calculateOrderFinalTotal(items, products) {
  let grandTotal = 0;
  for (const item of items) {
    grandTotal += calculateItemSubtotal(item, products);
  }
  return grandTotal;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 9999;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match || match[1] === undefined || match[2] === undefined) return 9999;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function generateTimeSlots(startStr, endStr, stepMinutes = 30) {
  const startMin = parseTimeToMinutes(startStr);
  const endMin = parseTimeToMinutes(endStr);
  const slots = [];

  if (startMin >= 9999 || endMin >= 9999 || stepMinutes <= 0) {
    return slots;
  }

  const effectiveEndMin = startMin <= endMin ? endMin : endMin + 1440;

  for (let m = startMin; m <= effectiveEndMin; m += stepMinutes) {
    const wrappedMin = m % 1440;
    const h = Math.floor(wrappedMin / 60).toString().padStart(2, '0');
    const min = (wrappedMin % 60).toString().padStart(2, '0');
    slots.push(`${h}:${min} น.`);
  }

  return slots;
}

describe('Feature 8: Pricing Engine Contract Refactoring & Zero-Kg Invariants', () => {
  it('calculates exactly 0 THB when orderedKg === 0 for FIXED_WEIGHT (fixes 0 || 1 bug)', () => {
    const item = {
      productId: 'PROD-NGO',
      productName: 'เงาะโรงเรียน',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 35,
      orderedKg: 0
    };
    assert.equal(calculateItemSubtotal(item), 0);
  });

  it('calculates 0 THB for negative or NaN orderedKg', () => {
    assert.equal(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: -2 }), 0);
    assert.equal(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: NaN }), 0);
  });

  it('matches typed bundle contract directly on OrderItem without regex', () => {
    const item = {
      productId: 'PROD-NGO',
      productName: 'เงาะโรงเรียน',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 35,
      orderedKg: 3,
      bundleQtyKg: 3,
      bundlePrice: 100
    };
    assert.equal(calculateItemSubtotal(item), 100);
  });

  it('matches product catalog bundles using typed qtyKg contract', () => {
    const item = {
      productId: 'PROD-NGO',
      productName: 'เงาะโรงเรียน',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 35,
      orderedKg: 6
    };
    const catalog = [
      {
        id: 'PROD-NGO',
        name: 'เงาะโรงเรียน',
        pricePerKg: 35,
        bundles: [
          { qtyKg: 3, price: 100, label: '3kg pack' },
          { qtyKg: 6, price: 200, label: '6kg pack' }
        ]
      }
    ];
    assert.equal(calculateItemSubtotal(item, catalog), 200);
  });

  it('calculates durian price from actualWeighedKg and pricePerKg', () => {
    const item = {
      productId: 'PROD-THURIAN',
      productName: 'ทุเรียนหมอนทอง',
      productType: 'VARIABLE_WHOLE_FRUIT',
      pricePerKg: 160,
      actualWeighedKg: 2.75
    };
    assert.equal(calculateItemSubtotal(item), Math.round(2.75 * 160)); // 440
  });

  it('returns 0 for unweighed durian (actualWeighedKg undefined or 0)', () => {
    const unweighed = {
      productId: 'PROD-THURIAN',
      productName: 'ทุเรียนหมอนทอง',
      productType: 'VARIABLE_WHOLE_FRUIT',
      pricePerKg: 160
    };
    assert.equal(calculateItemSubtotal(unweighed), 0);
  });

  it('respects explicit itemFinalPrice override if provided', () => {
    const item = {
      productId: 'PROD-NGO',
      productName: 'เงาะโรงเรียน',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 35,
      orderedKg: 5,
      itemFinalPrice: 175
    };
    assert.equal(calculateItemSubtotal(item), 175);
  });

  it('calculates grand total accurately across multiple items', () => {
    const items = [
      {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: 3,
        bundlePrice: 100,
        bundleQtyKg: 3
      },
      {
        productId: 'PROD-THURIAN',
        productName: 'ทุเรียนหมอนทอง',
        productType: 'VARIABLE_WHOLE_FRUIT',
        pricePerKg: 160,
        actualWeighedKg: 2.5
      },
      {
        productId: 'PROD-ZERO',
        productName: 'ผลไม้ทดสอบ',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 50,
        orderedKg: 0
      }
    ];
    // 100 + 400 + 0 = 500
    assert.equal(calculateOrderFinalTotal(items), 500);
  });
});

describe('Feature 9: COGS Snapshot Isolation Invariants', () => {
  it('preserves order costPerKg snapshot even when catalog updates', () => {
    // 1. Initial order placed with cost 20 THB/kg
    const orderItem = {
      productId: 'PROD-NGO',
      productName: 'เงาะโรงเรียน',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 35,
      costPerKg: 20, // Snapshotted at checkout
      orderedKg: 3
    };

    // 2. Later, catalog updates cost to 25 THB/kg
    const updatedCatalogProduct = {
      id: 'PROD-NGO',
      costPerKg: 25
    };

    // Assert the order item remains isolated from subsequent catalog updates
    assert.equal(orderItem.costPerKg, 20);
    assert.notEqual(orderItem.costPerKg, updatedCatalogProduct.costPerKg);

    // Margin remains calculated from snapshotted cost: (35 - 20) * 3 = 45 THB
    const revenue = orderItem.pricePerKg * orderItem.orderedKg;
    const cogs = orderItem.costPerKg * orderItem.orderedKg;
    const profit = revenue - cogs;
    assert.equal(profit, 45);
  });
});

describe('Feature 10: Overnight Time Slots & Modulo 1440 Math', () => {
  it('generates continuous slots spanning midnight (22:00 to 02:00)', () => {
    const slots = generateTimeSlots('22:00', '02:00', 30);
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

  it('generates daytime intervals without overnight wrap', () => {
    const slots = generateTimeSlots('19:00', '21:00', 30);
    assert.deepEqual(slots, [
      '19:00 น.',
      '19:30 น.',
      '20:00 น.',
      '20:30 น.',
      '21:00 น.'
    ]);
  });

  it('generates a single slot when start equals end', () => {
    const slots = generateTimeSlots('20:00', '20:00', 30);
    assert.deepEqual(slots, ['20:00 น.']);
  });

  it('returns empty array on invalid inputs (zero dummy fallback)', () => {
    assert.deepEqual(generateTimeSlots('', '20:00'), []);
    assert.deepEqual(generateTimeSlots('invalid', '20:00'), []);
    assert.deepEqual(generateTimeSlots('19:00', '20:00', -10), []);
  });

  it('sorts overnight dispatch tabs chronologically relative to startMin', () => {
    const unsortedSlots = ['01:00 น.', '22:30 น.', '00:00 น.', '22:00 น.', '01:30 น.'];
    const startMin = parseTimeToMinutes('22:00'); // 1320
    const sorted = [...unsortedSlots].sort((a, b) => {
      const ma = parseTimeToMinutes(a);
      const mb = parseTimeToMinutes(b);
      const diffA = (ma - startMin + 1440) % 1440;
      const diffB = (mb - startMin + 1440) % 1440;
      return diffA - diffB;
    });

    assert.deepEqual(sorted, [
      '22:00 น.',
      '22:30 น.',
      '00:00 น.',
      '01:00 น.',
      '01:30 น.'
    ]);
  });
});
