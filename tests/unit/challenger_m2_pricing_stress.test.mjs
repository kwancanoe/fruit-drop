import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Direct import of production pricing engine from src/utils/pricing.ts (Node 25 TS strip types)
import { calculateItemSubtotal, calculateOrderFinalTotal } from '../../src/utils/pricing.ts';

describe('Milenger 2 Challenger: Empirical Stress-Test on src/utils/pricing.ts', () => {

  describe('1. Zero-Kg Order Invariants (Proving 0 || 1 bug is 100% resolved)', () => {
    it('returns exactly 0 THB when orderedKg === 0 for FIXED_WEIGHT', () => {
      const item = {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: 0
      };
      assert.strictEqual(calculateItemSubtotal(item), 0);
    });

    it('returns exactly 0 THB when orderedKg is string "0"', () => {
      const item = {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: '0'
      };
      assert.strictEqual(calculateItemSubtotal(item), 0);
    });

    it('returns exactly 0 THB when orderedKg is -0', () => {
      const item = {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: -0
      };
      assert.strictEqual(calculateItemSubtotal(item), 0);
    });

    it('returns exactly 0 THB when orderedKg is NaN, null, or undefined', () => {
      assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: NaN }), 0);
      assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: null }), 0);
      assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: undefined }), 0);
      assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 'invalid' }), 0);
    });

    it('returns 0 THB when productType is omitted/undefined and orderedKg === 0', () => {
      // Adversarial test: item without explicit productType
      const item = {
        productId: 'PROD-CUSTOM',
        productName: 'ผลไม้ทั่วไป',
        pricePerKg: 50,
        orderedKg: 0
      };
      assert.strictEqual(calculateItemSubtotal(item), 0);
    });

    it('returns 0 THB when orderedKg === 0 even if bundlePrice is present on item', () => {
      // Adversarial test: bundlePrice defined but orderedKg === 0
      const item = {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: 0,
        bundlePrice: 100,
        bundleQtyKg: 3
      };
      // Must NOT return 100 THB! Check 1 catches orderedKg === 0 immediately
      assert.strictEqual(calculateItemSubtotal(item), 0);
    });
  });

  describe('2. Negative Weights Stress-Testing (-0.5kg, -10kg, etc.)', () => {
    it('returns exactly 0 THB for negative orderedKg with FIXED_WEIGHT (-0.5kg, -10kg)', () => {
      assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: -0.5 }), 0);
      assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: -10 }), 0);
      assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: -1000 }), 0);
    });

    it('returns exactly 0 THB for negative string inputs ("-0.5", "-10")', () => {
      assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: '-0.5' }), 0);
      assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: '-10' }), 0);
    });

    it('returns exactly 0 THB for negative weights when productType is omitted', () => {
      assert.strictEqual(calculateItemSubtotal({ pricePerKg: 35, orderedKg: -0.5 }), 0);
      assert.strictEqual(calculateItemSubtotal({ pricePerKg: 35, orderedKg: -10 }), 0);
    });
  });

  describe('3. Bundle Quantities: Exact Bundle vs Non-Bundle', () => {
    const mockCatalog = [
      {
        id: 'PROD-NGO',
        name: 'เงาะโรงเรียน',
        pricePerKg: 35,
        bundles: [
          { qtyKg: 3, price: 100, label: 'ชุด 3 กก. (100 บาท)' },
          { qtyKg: 6, price: 200, label: 'ชุด 6 กก. (200 บาท)' }
        ]
      },
      {
        id: 'PROD-MANGKUT',
        name: 'มังคุดคัดพิเศษ',
        pricePerKg: 40,
        bundles: [
          { qtyKg: 5, price: 180, label: 'ชุด 5 กก. (180 บาท)' }
        ]
      }
    ];

    it('evaluates exact 3kg bundle to 100 THB via OrderItem typed snapshot', () => {
      const item = {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: 3,
        bundlePrice: 100,
        bundleQtyKg: 3
      };
      assert.strictEqual(calculateItemSubtotal(item), 100);
    });

    it('evaluates exact 3kg bundle to 100 THB via catalog lookup', () => {
      const item = {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: 3
      };
      assert.strictEqual(calculateItemSubtotal(item, mockCatalog), 100);
    });

    it('evaluates 4kg non-bundle to exactly 140 THB (4 * 35)', () => {
      const item = {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: 4
      };
      assert.strictEqual(calculateItemSubtotal(item, mockCatalog), 140);
    });

    it('does NOT apply 3kg bundle price to 4kg even if bundlePrice: 100 is attached with bundleQtyKg: 3', () => {
      // Adversarial test: mismatched bundleQtyKg (3) vs orderedKg (4)
      const item = {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: 4,
        bundlePrice: 100,
        bundleQtyKg: 3
      };
      // Check 4 requires: (bundleQtyKg === undefined || bundleQtyKg === orderedKg)
      // Since 3 !== 4, Check 4 is skipped. Fallback to 4 * 35 = 140
      assert.strictEqual(calculateItemSubtotal(item, mockCatalog), 140);
    });

    it('evaluates 6kg bundle to 200 THB via catalog lookup', () => {
      const item = {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: 6
      };
      assert.strictEqual(calculateItemSubtotal(item, mockCatalog), 200);
    });

    it('matches bundle via orderedBundle label when qtyKg is not directly matched', () => {
      const item = {
        productId: 'PROD-NGO',
        productName: 'เงาะโรงเรียน',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 35,
        orderedKg: 3,
        orderedBundle: 'ชุด 3 กก. (100 บาท)'
      };
      assert.strictEqual(calculateItemSubtotal(item, mockCatalog), 100);
    });

    it('evaluates 1kg non-bundle to 35 THB and 5kg non-bundle to 175 THB', () => {
      assert.strictEqual(calculateItemSubtotal({ productId: 'PROD-NGO', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 1 }, mockCatalog), 35);
      assert.strictEqual(calculateItemSubtotal({ productId: 'PROD-NGO', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 5 }, mockCatalog), 175);
    });
  });

  describe('4. Weighed Durian Items (VARIABLE_WHOLE_FRUIT)', () => {
    it('calculates price as actualWeighedKg * pricePerKg', () => {
      const item = {
        productId: 'PROD-THURIAN',
        productName: 'ทุเรียนหมอนทอง',
        productType: 'VARIABLE_WHOLE_FRUIT',
        pricePerKg: 160,
        actualWeighedKg: 2.75
      };
      // 2.75 * 160 = 440
      assert.strictEqual(calculateItemSubtotal(item), 440);
    });

    it('handles decimal weight with rounding accurately', () => {
      const item = {
        productId: 'PROD-THURIAN',
        productName: 'ทุเรียนหมอนทอง',
        productType: 'VARIABLE_WHOLE_FRUIT',
        pricePerKg: 150,
        actualWeighedKg: 2.33
      };
      // 2.33 * 150 = 349.5 -> Math.round(349.5) = 350
      assert.strictEqual(calculateItemSubtotal(item), 350);
    });

    it('returns 0 THB for unweighed durian (actualWeighedKg undefined, 0, or negative)', () => {
      assert.strictEqual(calculateItemSubtotal({ productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 160 }), 0);
      assert.strictEqual(calculateItemSubtotal({ productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 160, actualWeighedKg: 0 }), 0);
      assert.strictEqual(calculateItemSubtotal({ productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 160, actualWeighedKg: -1.5 }), 0);
      assert.strictEqual(calculateItemSubtotal({ productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 160, actualWeighedKg: null }), 0);
    });

    it('honors explicit itemFinalPrice override when present', () => {
      const item = {
        productId: 'PROD-THURIAN',
        productName: 'ทุเรียนหมอนทอง',
        productType: 'VARIABLE_WHOLE_FRUIT',
        pricePerKg: 160,
        actualWeighedKg: 2.75,
        itemFinalPrice: 450 // Manual discount / round-off at tailgate desk
      };
      assert.strictEqual(calculateItemSubtotal(item), 450);
    });

    it('calculates grand total accurately across mixed cart', () => {
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
          productId: 'PROD-MANGKUT',
          productName: 'มังคุด',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 40,
          orderedKg: 4
        },
        {
          productId: 'PROD-THURIAN',
          productName: 'ทุเรียนหมอนทอง',
          productType: 'VARIABLE_WHOLE_FRUIT',
          pricePerKg: 160,
          actualWeighedKg: 2.75
        },
        {
          productId: 'PROD-ZERO',
          productName: 'ผลไม้ทดสอบ 0 กก.',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 50,
          orderedKg: 0
        },
        {
          productId: 'PROD-NEG',
          productName: 'ผลไม้ทดสอบติดลบ',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 50,
          orderedKg: -2
        }
      ];
      // 100 (3kg bundle) + 160 (4kg @ 40) + 440 (2.75kg @ 160) + 0 + 0 = 700 THB
      assert.strictEqual(calculateOrderFinalTotal(items), 700);
    });
  });

  describe('5. COGS Profit Calculations in AnalyticsPage Logic', () => {
    // Pure reproduction of AnalyticsPage.vue COGS helpers for empirical verification
    function getItemWeightKg(item) {
      if (item.productType === 'FIXED_WEIGHT') {
        return typeof item.orderedKg === 'number' ? Math.max(0, item.orderedKg) : (Number(item.orderedKg) || 0);
      }
      if (typeof item.actualWeighedKg === 'number' && item.actualWeighedKg > 0) {
        return item.actualWeighedKg;
      }
      if (item.selectedTierId?.includes('SMALL')) return 1.9;
      if (item.selectedTierId?.includes('MEDIUM')) return 2.5;
      if (item.selectedTierId?.includes('LARGE')) return 3.5;
      return 2.5;
    }

    function getItemCostPerKg(item, productCostMap) {
      if (typeof item.costPerKg === 'number' && !isNaN(item.costPerKg) && item.costPerKg >= 0) {
        return item.costPerKg;
      }
      const byId = productCostMap.get(item.productId);
      if (byId !== undefined) return byId;
      if (item.mascotKey) {
        const byMascot = productCostMap.get(item.mascotKey);
        if (byMascot !== undefined) return byMascot;
      }
      const byName = productCostMap.get(item.productName);
      if (byName !== undefined) return byName;
      return 0;
    }

    function computeAnalyticsMetrics(orders, products, productCostMap) {
      let totalRevenue = 0;
      let totalCost = 0;

      for (const o of orders) {
        if (o.orderStatus === 'CANCELLED') continue;

        const orderRevenue = (typeof o.totalFinalPrice === 'number' ? o.totalFinalPrice : o.totalEstimatedPrice) || 0;
        totalRevenue += orderRevenue;

        for (const item of o.items) {
          const kg = getItemWeightKg(item);
          const costPerKg = getItemCostPerKg(item, productCostMap);
          totalCost += kg * costPerKg;
        }
      }

      const grossProfit = totalRevenue - totalCost;
      const marginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
      const avgCostPercent = totalRevenue > 0 ? Math.round((totalCost / totalRevenue) * 100) : 0;

      return {
        filteredOrdersCount: orders.filter(o => o.orderStatus !== 'CANCELLED').length,
        totalRevenue,
        totalCost,
        grossProfit,
        marginPercent,
        avgCostPercent
      };
    }

    const mockCostMap = new Map([
      ['PROD-NGO', 20],
      ['PROD-MANGKUT', 25],
      ['PROD-THURIAN', 110]
    ]);

    it('isolates order COGS from subsequent catalog cost increases', () => {
      const order = {
        orderId: 'FD-1001',
        orderStatus: 'COMPLETED',
        totalFinalPrice: 100,
        items: [
          {
            productId: 'PROD-NGO',
            productName: 'เงาะโรงเรียน',
            productType: 'FIXED_WEIGHT',
            pricePerKg: 35,
            costPerKg: 20, // Snapshotted at checkout
            orderedKg: 3,
            bundlePrice: 100,
            bundleQtyKg: 3
          }
        ]
      };

      // Catalog cost later jumps from 20 to 30 THB/kg
      const changedCostMap = new Map([['PROD-NGO', 30]]);

      // Assert itemCostPerKg remains strictly 20 THB
      const effectiveCost = getItemCostPerKg(order.items[0], changedCostMap);
      assert.strictEqual(effectiveCost, 20);

      // Profit remains 100 - (3 * 20) = 40 THB, NOT 100 - (3 * 30) = 10 THB
      const metrics = computeAnalyticsMetrics([order], [], changedCostMap);
      assert.strictEqual(metrics.totalRevenue, 100);
      assert.strictEqual(metrics.totalCost, 60);
      assert.strictEqual(metrics.grossProfit, 40);
      assert.strictEqual(metrics.marginPercent, 40);
    });

    it('computes accurate profit for weighed durian order', () => {
      const order = {
        orderId: 'FD-1002',
        orderStatus: 'COMPLETED',
        totalFinalPrice: 440,
        items: [
          {
            productId: 'PROD-THURIAN',
            productName: 'ทุเรียนหมอนทอง',
            productType: 'VARIABLE_WHOLE_FRUIT',
            pricePerKg: 160,
            costPerKg: 110,
            actualWeighedKg: 2.75
          }
        ]
      };

      const metrics = computeAnalyticsMetrics([order], [], mockCostMap);
      // Revenue = 440
      // Cost = 2.75 * 110 = 302.5
      // Gross Profit = 440 - 302.5 = 137.5
      // Margin = Math.round((137.5 / 440) * 100) = 31%
      assert.strictEqual(metrics.totalRevenue, 440);
      assert.strictEqual(metrics.totalCost, 302.5);
      assert.strictEqual(metrics.grossProfit, 137.5);
      assert.strictEqual(metrics.marginPercent, 31);
    });

    it('estimates unweighed durian weight based on tier id', () => {
      const unweighedOrder = {
        orderId: 'FD-1003',
        orderStatus: 'WAITING_PICKUP',
        totalEstimatedPrice: 320,
        items: [
          {
            productId: 'PROD-THURIAN',
            productName: 'ทุเรียนหมอนทอง',
            productType: 'VARIABLE_WHOLE_FRUIT',
            pricePerKg: 160,
            costPerKg: 110,
            selectedTierId: 'TIER-MEDIUM'
          }
        ]
      };

      const weight = getItemWeightKg(unweighedOrder.items[0]);
      assert.strictEqual(weight, 2.5); // MEDIUM tier estimated at 2.5kg
      const metrics = computeAnalyticsMetrics([unweighedOrder], [], mockCostMap);
      assert.strictEqual(metrics.totalCost, 2.5 * 110); // 275 THB
    });

    it('evaluates 0kg and negative weight items to 0 cost and 0 revenue', () => {
      const zeroOrder = {
        orderId: 'FD-1004',
        orderStatus: 'COMPLETED',
        totalFinalPrice: 0,
        items: [
          {
            productId: 'PROD-NGO',
            productName: 'เงาะโรงเรียน',
            productType: 'FIXED_WEIGHT',
            pricePerKg: 35,
            costPerKg: 20,
            orderedKg: 0
          },
          {
            productId: 'PROD-NGO',
            productName: 'เงาะโรงเรียน',
            productType: 'FIXED_WEIGHT',
            pricePerKg: 35,
            costPerKg: 20,
            orderedKg: -5
          }
        ]
      };

      const metrics = computeAnalyticsMetrics([zeroOrder], [], mockCostMap);
      assert.strictEqual(metrics.totalRevenue, 0);
      assert.strictEqual(metrics.totalCost, 0);
      assert.strictEqual(metrics.grossProfit, 0);
      assert.strictEqual(metrics.marginPercent, 0);
    });

    it('excludes CANCELLED orders from revenue and cost metrics', () => {
      const orders = [
        {
          orderId: 'FD-ACTIVE',
          orderStatus: 'COMPLETED',
          totalFinalPrice: 100,
          items: [
            {
              productId: 'PROD-NGO',
              productName: 'เงาะโรงเรียน',
              productType: 'FIXED_WEIGHT',
              pricePerKg: 35,
              costPerKg: 20,
              orderedKg: 3
            }
          ]
        },
        {
          orderId: 'FD-CANCELLED',
          orderStatus: 'CANCELLED',
          totalFinalPrice: 100,
          items: [
            {
              productId: 'PROD-NGO',
              productName: 'เงาะโรงเรียน',
              productType: 'FIXED_WEIGHT',
              pricePerKg: 35,
              costPerKg: 20,
              orderedKg: 3
            }
          ]
        }
      ];

      const metrics = computeAnalyticsMetrics(orders, [], mockCostMap);
      assert.strictEqual(metrics.filteredOrdersCount, 1);
      assert.strictEqual(metrics.totalRevenue, 100);
      assert.strictEqual(metrics.totalCost, 60);
      assert.strictEqual(metrics.grossProfit, 40);
    });

    it('handles legacy orders lacking costPerKg via fallback map', () => {
      const legacyItem = {
        productId: 'PROD-MANGKUT',
        productName: 'มังคุดคัดพิเศษ',
        productType: 'FIXED_WEIGHT',
        pricePerKg: 40,
        // costPerKg is missing / undefined
        orderedKg: 2
      };

      const cost = getItemCostPerKg(legacyItem, mockCostMap);
      assert.strictEqual(cost, 25); // Found from mockCostMap
    });
  });
});
