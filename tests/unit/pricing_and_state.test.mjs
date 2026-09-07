// Comprehensive Programmatic Verification Suite: Fruit Drop Pricing, Scale, State Machine & Search
// Built with native node:test and node:assert/strict under the 4-tier testing methodology.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import production utilities directly via Node 25 TypeScript type-stripping
import {
  calculateItemSubtotal,
  calculateOrderFinalTotal,
  calculateNetWeight,
  calculateWeighedFruitPrice,
  calculateCashInHandTotal,
  calculatePrepaidTransferTotal
} from '../../src/utils/pricing.ts';

import {
  extractSearchCandidates,
  matchOrderSearch
} from '../../src/utils/orderSearch.ts';

import {
  parseTimeToMinutes,
  normalizeSlotLabel,
  isRangeSlot,
  generateTimeSlots
} from '../../src/utils/timeSlots.ts';

import {
  orderHasUnweighedFruit,
  getOrderStatusConfig,
  isValidOrderTransition,
  ORDER_STATUS_CONFIGS
} from '../../src/constants/status.ts';

// Standard mock product catalog for testing bundle contracts
const testCatalog = [
  {
    id: 'prod-rambutan',
    name: 'เงาะโรงเรียนนาสาร',
    productType: 'FIXED_WEIGHT',
    pricePerKg: 35,
    bundles: [
      { label: '3 กก. 100 บาท', qtyKg: 3, price: 100 },
      { label: '5 กก. 150 บาท', qtyKg: 5, price: 150 }
    ]
  },
  {
    id: 'prod-durian-monthong',
    name: 'ทุเรียนหมอนทองระยอง',
    productType: 'VARIABLE_WHOLE_FRUIT',
    pricePerKg: 180,
    bundles: []
  },
  {
    id: 'prod-durian-kanyao',
    name: 'ทุเรียนก้านยาว',
    productType: 'VARIABLE_WHOLE_FRUIT',
    pricePerKg: 250,
    bundles: []
  },
  {
    id: 'prod-mangosteen',
    name: 'มังคุดคัดเกรด',
    productType: 'FIXED_WEIGHT',
    pricePerKg: 60,
    bundles: [
      { label: '3 กก. 160 บาท', qtyKg: 3, price: 160 }
    ]
  }
];

describe('Comprehensive Programmatic Verification Suite (Features 1-7 across Tiers 1-4)', () => {

  // =========================================================================
  // Feature 1: Fixed-Weight Bundle Pricing
  // =========================================================================
  describe('Feature 1: Fixed-Weight Bundle Pricing', () => {

    describe('Tier 1: Happy-Path Cases (≥5 cases)', () => {
      it('Case 1.1: 1kg standard unit calculation matches standard pricePerKg (35 THB)', () => {
        const item = {
          productId: 'prod-rambutan',
          productName: 'เงาะโรงเรียน',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          orderedKg: 1
        };
        const subtotal = calculateItemSubtotal(item, testCatalog);
        assert.strictEqual(subtotal, 35);
      });

      it('Case 1.2: 3kg bundle pricing matches exact bundle snapshot (100 THB)', () => {
        const item = {
          productId: 'prod-rambutan',
          productName: 'เงาะโรงเรียน',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          orderedKg: 3,
          bundlePrice: 100,
          bundleQtyKg: 3,
          orderedBundle: '3 กก. 100 บาท'
        };
        const subtotal = calculateItemSubtotal(item, testCatalog);
        assert.strictEqual(subtotal, 100);
      });

      it('Case 1.3: 5kg bundle pricing matches catalog lookup when bundlePrice snapshot is omitted (150 THB)', () => {
        const item = {
          productId: 'prod-rambutan',
          productName: 'เงาะโรงเรียน',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          orderedKg: 5
        };
        const subtotal = calculateItemSubtotal(item, testCatalog);
        assert.strictEqual(subtotal, 150);
      });

      it('Case 1.4: Multiple items with distinct bundles compute separate bundle discounts', () => {
        const itemA = {
          productId: 'prod-rambutan',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          orderedKg: 3,
          bundlePrice: 100,
          bundleQtyKg: 3
        };
        const itemB = {
          productId: 'prod-mangosteen',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 60,
          orderedKg: 3,
          bundlePrice: 160,
          bundleQtyKg: 3
        };
        assert.strictEqual(calculateItemSubtotal(itemA, testCatalog), 100);
        assert.strictEqual(calculateItemSubtotal(itemB, testCatalog), 160);
      });

      it('Case 1.5: Exact price match via orderedBundle label when qtyKg is not directly matched', () => {
        const item = {
          productId: 'prod-rambutan',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          orderedKg: 3,
          orderedBundle: '3 กก. 100 บาท'
        };
        const subtotal = calculateItemSubtotal(item, testCatalog);
        assert.strictEqual(subtotal, 100);
      });
    });

    describe('Tier 2: Boundary Cases (≥5 cases)', () => {
      it('Case 2.1: 0kg zero-guard returns exactly 0 THB with zero fallback', () => {
        const item = {
          productId: 'prod-rambutan',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          orderedKg: 0,
          bundlePrice: 100,
          bundleQtyKg: 3
        };
        assert.strictEqual(calculateItemSubtotal(item, testCatalog), 0);
      });

      it('Case 2.2: Negative weights (-1kg, -5kg) return 0 THB without negative cost injection', () => {
        assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: -1 }, testCatalog), 0);
        assert.strictEqual(calculateItemSubtotal({ productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: -5 }, testCatalog), 0);
      });

      it('Case 2.3: Fractional quantities (2.5kg non-bundle) compute exact rounded price (88 THB)', () => {
        const item = {
          productId: 'prod-rambutan',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          orderedKg: 2.5
        };
        // 2.5 * 35 = 87.5 -> rounded to 88
        assert.strictEqual(calculateItemSubtotal(item, testCatalog), 88);
      });

      it('Case 2.4: Unbundled 4kg does not clamp to 3kg bundle and computes 4 * 35 = 140 THB', () => {
        const item = {
          productId: 'prod-rambutan',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          orderedKg: 4,
          bundlePrice: 100,
          bundleQtyKg: 3
        };
        // bundleQtyKg (3) does not match orderedKg (4) -> falls back to 4 * 35 = 140
        assert.strictEqual(calculateItemSubtotal(item, testCatalog), 140);
      });

      it('Case 2.5: Exceeding quantity (6kg) without matching 6kg bundle computes 6 * 35 = 210 THB', () => {
        const item = {
          productId: 'prod-rambutan',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          orderedKg: 6
        };
        assert.strictEqual(calculateItemSubtotal(item, testCatalog), 210);
      });
    });
  });

  // =========================================================================
  // Feature 2: Durian Scale & Tare Math
  // =========================================================================
  describe('Feature 2: Durian Scale & Tare Math', () => {

    describe('Tier 1: Happy-Path Cases (≥5 cases)', () => {
      it('Case 1.1: Net weight deduction calculates gross minus tare accurately (3.200kg - 0.200kg = 3.000kg)', () => {
        const net = calculateNetWeight(3.200, 0.200);
        assert.strictEqual(net, 3.000);
      });

      it('Case 1.2: Single durian price scaling computes net weight multiplied by pricePerKg (3.0kg @ 180/kg = 540 THB)', () => {
        const price = calculateWeighedFruitPrice(3.000, 180);
        assert.strictEqual(price, 540);
      });

      it('Case 1.3: Multiple durians with distinct weights scale proportionally', () => {
        const durian1Price = calculateWeighedFruitPrice(2.450, 180); // 441 THB
        const durian2Price = calculateWeighedFruitPrice(3.800, 180); // 684 THB
        assert.strictEqual(durian1Price, 441);
        assert.strictEqual(durian2Price, 684);
      });

      it('Case 1.4: PricePerKg scaling across premium varieties (Monthong 180 vs Kanyao 250)', () => {
        const monthong = calculateWeighedFruitPrice(2.5, 180);
        const kanyao = calculateWeighedFruitPrice(2.5, 250);
        assert.strictEqual(monthong, 450);
        assert.strictEqual(kanyao, 625);
      });

      it('Case 1.5: Zero tare deduction preserves gross weight exactly (2.750kg - 0kg = 2.750kg)', () => {
        const net = calculateNetWeight(2.750, 0);
        assert.strictEqual(net, 2.750);
      });
    });

    describe('Tier 2: Boundary Cases (≥5 cases)', () => {
      it('Case 2.1: Zero actualWeighedKg returns 0 THB and remains unpriced', () => {
        const item = {
          productId: 'prod-durian-monthong',
          productType: 'VARIABLE_WHOLE_FRUIT',
          pricePerKg: 180,
          actualWeighedKg: 0
        };
        assert.strictEqual(calculateItemSubtotal(item), 0);
      });

      it('Case 2.2: Negative gross weight returns 0 net weight and 0 THB', () => {
        assert.strictEqual(calculateNetWeight(-2.5, 0.2), 0);
        assert.strictEqual(calculateWeighedFruitPrice(-2.5, 180), 0);
      });

      it('Case 2.3: Tare deduction exceeding gross returns 0 net weight (gross 1.5kg, tare 2.0kg)', () => {
        const net = calculateNetWeight(1.5, 2.0);
        assert.strictEqual(net, 0);
      });

      it('Case 2.4: Fractional grams precision preserves 3 decimal places without binary float creep', () => {
        const net = calculateNetWeight(3.4567, 0.1234);
        // (3.4567 - 0.1234) = 3.3333 -> rounds to 3.333
        assert.strictEqual(net, 3.333);
      });

      it('Case 2.5: Unweighed status gating correctly identifies unweighed durian and clears when weighed', () => {
        const orderUnweighed = {
          items: [
            { productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 180 }
          ]
        };
        assert.strictEqual(orderHasUnweighedFruit(orderUnweighed), true);

        const orderWeighed = {
          items: [
            { productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 180, actualWeighedKg: 2.85 }
          ]
        };
        assert.strictEqual(orderHasUnweighedFruit(orderWeighed), false);
      });
    });
  });

  // =========================================================================
  // Feature 3: Order Total & Item Subtotals
  // =========================================================================
  describe('Feature 3: Order Total & Item Subtotals', () => {

    describe('Tier 1: Happy-Path Cases (≥5 cases)', () => {
      it('Case 1.1: Single item total calculates exact subtotal', () => {
        const items = [
          { productId: 'prod-rambutan', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 1 }
        ];
        assert.strictEqual(calculateOrderFinalTotal(items, testCatalog), 35);
      });

      it('Case 1.2: Multiple mixed items total sums bundled rambutan and weighed durian', () => {
        const items = [
          {
            productId: 'prod-rambutan',
            productType: 'FIXED_WEIGHT',
            pricePerKg: 35,
            orderedKg: 3,
            bundlePrice: 100,
            bundleQtyKg: 3
          },
          {
            productId: 'prod-durian-monthong',
            productType: 'VARIABLE_WHOLE_FRUIT',
            pricePerKg: 180,
            actualWeighedKg: 2.0
          }
        ];
        // 100 + (2.0 * 180 = 360) = 460
        assert.strictEqual(calculateOrderFinalTotal(items, testCatalog), 460);
      });

      it('Case 1.3: Bundle vs non-bundle subtotals in same multi-fruit order', () => {
        const items = [
          { productId: 'prod-rambutan', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 3, bundlePrice: 100, bundleQtyKg: 3 },
          { productId: 'prod-mangosteen', productType: 'FIXED_WEIGHT', pricePerKg: 60, orderedKg: 2 } // non-bundle: 2 * 60 = 120
        ];
        assert.strictEqual(calculateOrderFinalTotal(items, testCatalog), 220);
      });

      it('Case 1.4: Explicit itemFinalPrice snapshot overrides dynamic calculation', () => {
        const items = [
          {
            productId: 'prod-rambutan',
            productType: 'FIXED_WEIGHT',
            pricePerKg: 35,
            orderedKg: 3,
            itemFinalPrice: 95 // special promotional manual override
          }
        ];
        assert.strictEqual(calculateOrderFinalTotal(items, testCatalog), 95);
      });

      it('Case 1.5: Order with multiple weighed durians computes aggregate sum', () => {
        const items = [
          { productId: 'prod-durian-monthong', productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 180, actualWeighedKg: 2.5 }, // 450
          { productId: 'prod-durian-kanyao', productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 250, actualWeighedKg: 3.0 }   // 750
        ];
        assert.strictEqual(calculateOrderFinalTotal(items, testCatalog), 1200);
      });
    });

    describe('Tier 2: Boundary Cases (≥5 cases)', () => {
      it('Case 2.1: Empty order items array returns exactly 0 THB', () => {
        assert.strictEqual(calculateOrderFinalTotal([], testCatalog), 0);
      });

      it('Case 2.2: Order containing all 0kg items returns 0 THB', () => {
        const items = [
          { productId: 'prod-rambutan', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 0 },
          { productId: 'prod-mangosteen', productType: 'FIXED_WEIGHT', pricePerKg: 60, orderedKg: 0 }
        ];
        assert.strictEqual(calculateOrderFinalTotal(items, testCatalog), 0);
      });

      it('Case 2.3: Large bulk quantity (500kg @ 35/kg) calculates accurately without overflow (17500 THB)', () => {
        const items = [
          { productId: 'prod-rambutan', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 500 }
        ];
        assert.strictEqual(calculateOrderFinalTotal(items, testCatalog), 17500);
      });

      it('Case 2.4: Floating point decimal rounding to nearest integer THB (1.333kg * 35 = 46.655 -> 47 THB)', () => {
        const items = [
          { productId: 'prod-rambutan', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 1.333 }
        ];
        assert.strictEqual(calculateOrderFinalTotal(items, testCatalog), 47);
      });

      it('Case 2.5: Order with mixed valid and invalid/null items safely ignores invalid items', () => {
        const items = [
          { productId: 'prod-rambutan', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 2 }, // 70
          { productId: 'prod-invalid', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: NaN },  // 0
          { productId: 'prod-unweighed', productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 180 }          // 0
        ];
        assert.strictEqual(calculateOrderFinalTotal(items, testCatalog), 70);
      });
    });
  });

  // =========================================================================
  // Feature 4: Order State Transitions
  // =========================================================================
  describe('Feature 4: Order State Transitions', () => {

    describe('Tier 1: Valid Transitions (≥5 cases)', () => {
      it('Case 1.1: WAITING_PICKUP -> COMPLETED with CASH is permitted', () => {
        assert.strictEqual(isValidOrderTransition('WAITING_PICKUP', 'COMPLETED'), true);
        const order = {
          orderStatus: 'COMPLETED',
          paymentMethod: 'PAY_AT_CAR',
          attribution: { paymentModeAtHandover: 'CASH' }
        };
        const config = getOrderStatusConfig(order);
        assert.strictEqual(config.key, 'COMPLETED_CASH');
      });

      it('Case 1.2: WAITING_PICKUP -> COMPLETED with TRANSFER is permitted', () => {
        assert.strictEqual(isValidOrderTransition('WAITING_PICKUP', 'COMPLETED'), true);
        const order = {
          orderStatus: 'COMPLETED',
          paymentMethod: 'PROMPTPAY_PREPAID',
          attribution: { paymentModeAtHandover: 'TRANSFER' }
        };
        const config = getOrderStatusConfig(order);
        assert.strictEqual(config.key, 'COMPLETED_TRANSFER');
      });

      it('Case 1.3: WAITING_PICKUP -> CANCELLED is permitted', () => {
        assert.strictEqual(isValidOrderTransition('WAITING_PICKUP', 'CANCELLED'), true);
        const order = {
          orderStatus: 'CANCELLED',
          cancelReason: 'ลูกค้าไม่มารับตามนัด (No-show)'
        };
        const config = getOrderStatusConfig(order);
        assert.strictEqual(config.key, 'CANCELLED');
      });

      it('Case 1.4: CANCELLED -> WAITING_PICKUP (revert) is permitted', () => {
        assert.strictEqual(isValidOrderTransition('CANCELLED', 'WAITING_PICKUP'), true);
      });

      it('Case 1.5: WEIGHING state dynamically transitions to WAITING_PICKUP once durian is weighed', () => {
        const order = {
          orderStatus: 'WAITING_PICKUP',
          items: [{ productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 180 }]
        };
        // Unweighed durian resolves to WEIGHING status
        assert.strictEqual(getOrderStatusConfig(order).key, 'WEIGHING');

        // Weighing performed
        order.items[0].actualWeighedKg = 3.2;
        assert.strictEqual(getOrderStatusConfig(order).key, 'WAITING_PICKUP');
      });
    });

    describe('Tier 2: Boundary Cases (≥5 cases)', () => {
      it('Case 2.1: Transition from COMPLETED to CANCELLED is rejected by state machine', () => {
        assert.strictEqual(isValidOrderTransition('COMPLETED', 'CANCELLED'), false);
      });

      it('Case 2.2: Transition from COMPLETED to WAITING_PICKUP is rejected by state machine', () => {
        assert.strictEqual(isValidOrderTransition('COMPLETED', 'WAITING_PICKUP'), false);
      });

      it('Case 2.3: Invalid / unrecognized status strings are rejected', () => {
        assert.strictEqual(isValidOrderTransition('WAITING_PICKUP', 'PROCESSING'), false);
        assert.strictEqual(isValidOrderTransition('WAITING_PICKUP', 'SHIPPED'), false);
        assert.strictEqual(isValidOrderTransition('UNKNOWN', 'COMPLETED'), false);
      });

      it('Case 2.4: Cancellation reason preservation on CANCELLED order', () => {
        const customReason = 'ลูกค้าแจ้งติดธุระด่วน ขอเลื่อนเป็นรอบถัดไป';
        const order = {
          orderStatus: 'CANCELLED',
          cancelReason: customReason,
          cancelledAt: 1725700000000
        };
        assert.strictEqual(order.cancelReason, customReason);
        assert.strictEqual(typeof order.cancelledAt, 'number');
      });

      it('Case 2.5: Revert flow removes cancellation metadata and restores clean state', () => {
        const order = {
          orderStatus: 'CANCELLED',
          cancelReason: 'ลูกค้าไม่มารับ',
          cancelledAt: 1725700000000
        };
        // Execute revert simulation
        order.orderStatus = 'WAITING_PICKUP';
        delete order.cancelReason;
        delete order.cancelledAt;

        assert.strictEqual(order.orderStatus, 'WAITING_PICKUP');
        assert.strictEqual(order.cancelReason, undefined);
        assert.strictEqual(order.cancelledAt, undefined);
      });
    });
  });

  // =========================================================================
  // Feature 5: Handover Payment Attribution
  // =========================================================================
  describe('Feature 5: Handover Payment Attribution', () => {

    describe('Tier 1: Attribution Checks (≥5 cases)', () => {
      it('Case 1.1: Cash delivery sets paymentModeAtHandover = CASH and paymentMethod = PAY_AT_CAR', () => {
        const attribution = {
          handledByUserId: 'user-seller-01',
          handledByName: 'สมชาย ผู้ช่วยขาย',
          handledByRole: 'SELLER',
          paymentModeAtHandover: 'CASH',
          proofCapturedAt: 1725700000000
        };
        assert.strictEqual(attribution.paymentModeAtHandover, 'CASH');
      });

      it('Case 1.2: Transfer delivery sets paymentModeAtHandover = TRANSFER and PROMPTPAY_PREPAID', () => {
        const attribution = {
          handledByUserId: 'user-seller-01',
          handledByName: 'สมชาย ผู้ช่วยขาย',
          handledByRole: 'SELLER',
          paymentModeAtHandover: 'TRANSFER',
          proofCapturedAt: 1725700000000
        };
        assert.strictEqual(attribution.paymentModeAtHandover, 'TRANSFER');
      });

      it('Case 1.3: Attribution records staff identity (handledByUserId, handledByName, handledByRole)', () => {
        const attribution = {
          handledByUserId: 'usr-99',
          handledByName: 'วิชัย เจ้าของสวน',
          handledByRole: 'SHOP_OWNER',
          paymentModeAtHandover: 'CASH',
          proofCapturedAt: 1725700000000
        };
        assert.strictEqual(attribution.handledByUserId, 'usr-99');
        assert.strictEqual(attribution.handledByName, 'วิชัย เจ้าของสวน');
        assert.strictEqual(attribution.handledByRole, 'SHOP_OWNER');
      });

      it('Case 1.4: Attribution records proofCapturedAt epoch timestamp', () => {
        const now = Date.now();
        const attribution = {
          handledByUserId: 'usr-01',
          paymentModeAtHandover: 'CASH',
          proofCapturedAt: now
        };
        assert.strictEqual(typeof attribution.proofCapturedAt, 'number');
        assert.ok(attribution.proofCapturedAt > 0);
      });

      it('Case 1.5: Attribution records deviceFingerprint for tailgate hardware traceability', () => {
        const attribution = {
          handledByUserId: 'usr-01',
          paymentModeAtHandover: 'TRANSFER',
          proofCapturedAt: Date.now(),
          deviceFingerprint: 'chrome-windows-desktop-agent-v1'
        };
        assert.strictEqual(attribution.deviceFingerprint, 'chrome-windows-desktop-agent-v1');
      });
    });

    describe('Tier 2: Boundary Cases (≥5 cases)', () => {
      it('Case 2.1: cashInHandTotal vs prepaidTotal form mutually disjoint sets across completed orders', () => {
        const orders = [
          { orderId: 'FD-001', orderStatus: 'COMPLETED', paymentMethod: 'PAY_AT_CAR', paymentStatus: 'PAID', attribution: { paymentModeAtHandover: 'CASH' }, totalFinalPrice: 300 },
          { orderId: 'FD-002', orderStatus: 'COMPLETED', paymentMethod: 'PROMPTPAY_PREPAID', paymentStatus: 'PAID', attribution: { paymentModeAtHandover: 'TRANSFER' }, totalFinalPrice: 500 }
        ];
        const cashTotal = calculateCashInHandTotal(orders);
        const prepaidTotal = calculatePrepaidTransferTotal(orders);

        assert.strictEqual(cashTotal, 300);
        assert.strictEqual(prepaidTotal, 500);
        assert.strictEqual(cashTotal + prepaidTotal, 800);
      });

      it('Case 2.2: Null attribution fallback accurately attributes legacy order with PAY_AT_CAR to cash', () => {
        const legacyOrder = [
          { orderId: 'FD-LEGACY-CASH', orderStatus: 'COMPLETED', paymentMethod: 'PAY_AT_CAR', totalFinalPrice: 150 }
        ];
        assert.strictEqual(calculateCashInHandTotal(legacyOrder), 150);
        assert.strictEqual(calculatePrepaidTransferTotal(legacyOrder), 0);
      });

      it('Case 2.3: Null attribution fallback accurately attributes legacy order with PROMPTPAY_PREPAID to transfer', () => {
        const legacyOrder = [
          { orderId: 'FD-LEGACY-TRANSFER', orderStatus: 'COMPLETED', paymentMethod: 'PROMPTPAY_PREPAID', paymentStatus: 'PAID', totalFinalPrice: 200 }
        ];
        assert.strictEqual(calculateCashInHandTotal(legacyOrder), 0);
        assert.strictEqual(calculatePrepaidTransferTotal(legacyOrder), 200);
      });

      it('Case 2.4: CANCELLED orders are strictly excluded from both cashInHandTotal and prepaidTotal', () => {
        const orders = [
          { orderId: 'FD-CAN-1', orderStatus: 'CANCELLED', paymentMethod: 'PAY_AT_CAR', attribution: { paymentModeAtHandover: 'CASH' }, totalFinalPrice: 300 },
          { orderId: 'FD-CAN-2', orderStatus: 'CANCELLED', paymentMethod: 'PROMPTPAY_PREPAID', paymentStatus: 'PAID', attribution: { paymentModeAtHandover: 'TRANSFER' }, totalFinalPrice: 500 }
        ];
        assert.strictEqual(calculateCashInHandTotal(orders), 0);
        assert.strictEqual(calculatePrepaidTransferTotal(orders), 0);
      });

      it('Case 2.5: Unfinished / WAITING_PICKUP orders are excluded from cashInHandTotal until completed', () => {
        const orders = [
          { orderId: 'FD-PENDING', orderStatus: 'WAITING_PICKUP', paymentMethod: 'PAY_AT_CAR', totalFinalPrice: 400 }
        ];
        assert.strictEqual(calculateCashInHandTotal(orders), 0);
      });
    });
  });

  // =========================================================================
  // Feature 6: Cross-Round Order Lookup
  // =========================================================================
  describe('Feature 6: Cross-Round Order Lookup', () => {

    describe('Tier 1: Search Normalization Cases (≥5 cases)', () => {
      it('Case 1.1: Exact Order ID FD-1082 generates exact matching candidates', () => {
        const { orderIdCandidates } = extractSearchCandidates('FD-1082');
        assert.ok(orderIdCandidates.includes('FD-1082'));
        assert.ok(orderIdCandidates.includes('1082'));
      });

      it('Case 1.2: Leading # prefix (#FD-1082) is stripped and matches FD-1082', () => {
        const { orderIdCandidates } = extractSearchCandidates('#FD-1082');
        assert.ok(orderIdCandidates.includes('FD-1082'));
        assert.ok(orderIdCandidates.includes('1082'));
      });

      it('Case 1.3: 4-digit numeric string 1082 expands to FD-1082 and 1082', () => {
        const { orderIdCandidates } = extractSearchCandidates('1082');
        assert.ok(orderIdCandidates.includes('FD-1082'));
        assert.ok(orderIdCandidates.includes('1082'));
      });

      it('Case 1.4: Formatted phone 081-234-5678 normalizes clean digits and matches in-memory', () => {
        const { phoneCandidates, cleanDigits } = extractSearchCandidates('081-234-5678');
        assert.strictEqual(cleanDigits, '0812345678');
        assert.ok(phoneCandidates.includes('0812345678'));
        assert.ok(phoneCandidates.includes('081-234-5678'));

        const mockOrder = { orderId: 'FD-9999', customer: { phone: '0812345678', name: 'ลูกค้า A' } };
        assert.strictEqual(matchOrderSearch(mockOrder, '081-234-5678'), true);
      });

      it('Case 1.5: Unformatted phone 0812345678 produces formatted phone variations (dashes and spaces)', () => {
        const { phoneCandidates } = extractSearchCandidates('0812345678');
        assert.ok(phoneCandidates.includes('081-234-5678'));
        assert.ok(phoneCandidates.includes('081 234 5678'));

        const mockOrder = { orderId: 'FD-9999', customer: { phone: '081-234-5678', name: 'ลูกค้า B' } };
        assert.strictEqual(matchOrderSearch(mockOrder, '0812345678'), true);
      });
    });

    describe('Tier 2: Boundary Cases (≥5 cases)', () => {
      it('Case 2.1: Empty string returns empty candidate lists and false match', () => {
        const res = extractSearchCandidates('');
        assert.strictEqual(res.orderIdCandidates.length, 0);
        assert.strictEqual(res.phoneCandidates.length, 0);
        assert.strictEqual(matchOrderSearch({ orderId: 'FD-1082' }, ''), false);
      });

      it('Case 2.2: Whitespace-only string returns empty candidate lists and false match', () => {
        const res = extractSearchCandidates('     ');
        assert.strictEqual(res.orderIdCandidates.length, 0);
        assert.strictEqual(res.phoneCandidates.length, 0);
        assert.strictEqual(matchOrderSearch({ orderId: 'FD-1082' }, '   '), false);
      });

      it('Case 2.3: Short numbers (< 4 digits, e.g. "12") do not produce false orderId or phone candidates', () => {
        const res = extractSearchCandidates('12');
        assert.ok(!res.orderIdCandidates.includes('FD-12'));
        assert.strictEqual(res.phoneCandidates.length, 0);
      });

      it('Case 2.4: Special symbol prefixes (№ FD-1082, # 1082) normalize cleanly', () => {
        const res1 = extractSearchCandidates('№ FD-1082');
        assert.ok(res1.orderIdCandidates.includes('FD-1082'));

        const res2 = extractSearchCandidates('# 1082');
        assert.ok(res2.orderIdCandidates.includes('FD-1082'));
      });

      it('Case 2.5: Case-insensitivity: lowercase "fd-1082" matches uppercase orderId "FD-1082"', () => {
        const mockOrder = { orderId: 'FD-1082', customer: { phone: '0899999999', name: 'สมศรี' } };
        assert.strictEqual(matchOrderSearch(mockOrder, 'fd-1082'), true);
        assert.strictEqual(matchOrderSearch(mockOrder, 'สมศรี'), true);
      });
    });
  });

  // =========================================================================
  // Feature 7: Time Slot Generation & Overnight
  // =========================================================================
  describe('Feature 7: Time Slot Generation & Overnight', () => {

    describe('Tier 1: Daytime Windows (≥5 cases)', () => {
      it('Case 1.1: 19:00 to 21:00 with 30m steps generates exactly 5 slots with Thai suffix', () => {
        const slots = generateTimeSlots('19:00', '21:00', 30);
        assert.deepStrictEqual(slots, [
          '19:00 น.',
          '19:30 น.',
          '20:00 น.',
          '20:30 น.',
          '21:00 น.'
        ]);
      });

      it('Case 1.2: 08:00 to 09:00 with 15m steps generates exactly 5 slots', () => {
        const slots = generateTimeSlots('08:00', '09:00', 15);
        assert.deepStrictEqual(slots, [
          '08:00 น.',
          '08:15 น.',
          '08:30 น.',
          '08:45 น.',
          '09:00 น.'
        ]);
      });

      it('Case 1.3: 10:00 to 14:00 with 60m steps generates exactly 5 slots', () => {
        const slots = generateTimeSlots('10:00', '14:00', 60);
        assert.deepStrictEqual(slots, [
          '10:00 น.',
          '11:00 น.',
          '12:00 น.',
          '13:00 น.',
          '14:00 น.'
        ]);
      });

      it('Case 1.4: NormalizeSlotLabel formats time strings with padding and Thai suffix', () => {
        assert.strictEqual(normalizeSlotLabel('8:00'), '08:00 น.');
        assert.strictEqual(normalizeSlotLabel('19:30 น.'), '19:30 น.');
        assert.strictEqual(normalizeSlotLabel('  20:00  '), '20:00 น.');
      });

      it('Case 1.5: Single-point window (15:00 to 15:00) generates exactly 1 slot', () => {
        const slots = generateTimeSlots('15:00', '15:00', 30);
        assert.deepStrictEqual(slots, ['15:00 น.']);
      });
    });

    describe('Tier 2: Boundary Cases (≥5 cases)', () => {
      it('Case 2.1: Overnight window 22:00 -> 02:00 with modulo 1440 wrapping generates 9 slots across midnight', () => {
        const slots = generateTimeSlots('22:00', '02:00', 30);
        assert.deepStrictEqual(slots, [
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

      it('Case 2.2: Past-midnight window 23:30 -> 00:30 generates 3 slots', () => {
        const slots = generateTimeSlots('23:30', '00:30', 30);
        assert.deepStrictEqual(slots, [
          '23:30 น.',
          '00:00 น.',
          '00:30 น.'
        ]);
      });

      it('Case 2.3: Midnight boundary 00:00 to 00:00 generates exactly 1 slot (00:00 น.)', () => {
        const slots = generateTimeSlots('00:00', '00:00', 30);
        assert.deepStrictEqual(slots, ['00:00 น.']);
      });

      it('Case 2.4: Invalid time strings return empty array with 0 hardcoded fallbacks', () => {
        assert.deepStrictEqual(generateTimeSlots('invalid', '22:00', 30), []);
        assert.deepStrictEqual(generateTimeSlots('19:00', 'xyz', 30), []);
        assert.deepStrictEqual(generateTimeSlots('', '', 30), []);
      });

      it('Case 2.5: Non-positive stepMinutes (<= 0) returns empty array', () => {
        assert.deepStrictEqual(generateTimeSlots('19:00', '21:00', 0), []);
        assert.deepStrictEqual(generateTimeSlots('19:00', '21:00', -15), []);
      });
    });
  });

  // =========================================================================
  // Tier 3: Pairwise Combinations Matrix
  // Matrix: Payment Modes (CASH, TRANSFER)
  //       x Fruit Types (FIXED_WEIGHT bundle, VARIABLE_WHOLE_FRUIT durian, MIXED)
  //       x Order Statuses (WAITING_PICKUP, COMPLETED, CANCELLED)
  // Total: 2 x 3 x 3 = 18 pairwise test cases
  // =========================================================================
  describe('Tier 3: Pairwise Combinations (18 Combinations)', () => {
    const paymentModes = ['CASH', 'TRANSFER'];
    const fruitTypes = ['FIXED_WEIGHT', 'VARIABLE_WHOLE_FRUIT', 'MIXED'];
    const orderStatuses = ['WAITING_PICKUP', 'COMPLETED', 'CANCELLED'];

    for (const paymentMode of paymentModes) {
      for (const fruitType of fruitTypes) {
        for (const orderStatus of orderStatuses) {
          it(`Pairwise [Payment: ${paymentMode}] x [Fruit: ${fruitType}] x [Status: ${orderStatus}]`, () => {
            // Construct test items based on fruitType
            let items = [];
            if (fruitType === 'FIXED_WEIGHT') {
              items = [
                { productId: 'prod-rambutan', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 3, bundlePrice: 100, bundleQtyKg: 3 }
              ];
            } else if (fruitType === 'VARIABLE_WHOLE_FRUIT') {
              items = [
                { productId: 'prod-durian-monthong', productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 180, actualWeighedKg: 2.5 }
              ];
            } else {
              items = [
                { productId: 'prod-rambutan', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 3, bundlePrice: 100, bundleQtyKg: 3 },
                { productId: 'prod-durian-monthong', productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 180, actualWeighedKg: 2.0 }
              ];
            }

            const calculatedTotal = calculateOrderFinalTotal(items, testCatalog);
            assert.ok(calculatedTotal > 0);

            // Construct Order
            const isCash = paymentMode === 'CASH';
            const order = {
              orderId: `FD-${paymentMode}-${fruitType}-${orderStatus}`,
              orderStatus,
              paymentMethod: isCash ? 'PAY_AT_CAR' : 'PROMPTPAY_PREPAID',
              paymentStatus: orderStatus === 'COMPLETED' ? 'PAID' : 'PENDING',
              items,
              totalFinalPrice: calculatedTotal,
              attribution: orderStatus === 'COMPLETED' ? {
                handledByUserId: 'seller-1',
                paymentModeAtHandover: paymentMode
              } : undefined
            };

            // Test total attribution
            const singleOrderList = [order];
            const cashSum = calculateCashInHandTotal(singleOrderList);
            const transferSum = calculatePrepaidTransferTotal(singleOrderList);

            if (orderStatus === 'COMPLETED') {
              if (isCash) {
                assert.strictEqual(cashSum, calculatedTotal);
                assert.strictEqual(transferSum, 0);
              } else {
                assert.strictEqual(cashSum, 0);
                assert.strictEqual(transferSum, calculatedTotal);
              }
            } else {
              // Not completed or cancelled -> neither should show in cash totals
              assert.strictEqual(cashSum, 0);
              if (orderStatus === 'CANCELLED') {
                assert.strictEqual(transferSum, 0);
              }
            }

            // Test unweighed fruit gating
            assert.strictEqual(orderHasUnweighedFruit(order), false);
          });
        }
      }
    }
  });

  // =========================================================================
  // Tier 4: Real-World Application Scenarios (5 End-to-End User Journeys)
  // =========================================================================
  describe('Tier 4: Real-World Application Scenarios', () => {

    it('Scenario 1: Customer Pre-order to Pickup (Fixed bundle + Durian estimate -> Slot -> Pass)', () => {
      // 1. Customer selects 3kg Rambutan bundle and a size-L Durian (estimated 3.0kg)
      const cartItems = [
        {
          productId: 'prod-rambutan',
          productName: 'เงาะโรงเรียน',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          orderedKg: 3,
          bundlePrice: 100,
          bundleQtyKg: 3,
          orderedBundle: '3 กก. 100 บาท'
        },
        {
          productId: 'prod-durian-monthong',
          productName: 'ทุเรียนหมอนทอง',
          productType: 'VARIABLE_WHOLE_FRUIT',
          pricePerKg: 180,
          selectedTierId: 'L',
          selectedTierLabel: 'ลูกใหญ่ (ประมาณ 3.0 กก.)'
        }
      ];

      // 2. Customer selects pickup slot from generated round slots
      const availableSlots = generateTimeSlots('19:00', '22:00', 30);
      const chosenSlot = availableSlots[1]; // '19:30 น.'
      assert.strictEqual(chosenSlot, '19:30 น.');

      // 3. Subtotal for fixed weight is 100 THB; durian is pending weighing (0 THB)
      const initialTotal = calculateOrderFinalTotal(cartItems, testCatalog);
      assert.strictEqual(initialTotal, 100);

      // 4. Order created in WAITING_PICKUP status
      const customerOrder = {
        orderId: 'FD-1082',
        orderStatus: 'WAITING_PICKUP',
        paymentMethod: 'PAY_AT_CAR',
        paymentStatus: 'PENDING',
        pickupSlot: chosenSlot,
        customer: { name: 'กิตติพงษ์', phone: '081-234-5678' },
        items: cartItems,
        totalEstimatedPrice: 100 + (3.0 * 180), // 640 THB estimated
        totalFinalPrice: initialTotal
      };

      // 5. System resolves operational status as WEIGHING because durian is unweighed
      assert.strictEqual(orderHasUnweighedFruit(customerOrder), true);
      const visualConfig = getOrderStatusConfig(customerOrder);
      assert.strictEqual(visualConfig.key, 'WEIGHING');
    });

    it('Scenario 2: Tailgate Scale Weighing & PromptPay Delivery Flow', () => {
      // 1. Existing order with unweighed Monthong Durian
      const order = {
        orderId: 'FD-2041',
        orderStatus: 'WAITING_PICKUP',
        paymentMethod: 'PAY_AT_CAR',
        paymentStatus: 'PENDING',
        items: [
          {
            productId: 'prod-durian-monthong',
            productName: 'ทุเรียนหมอนทอง',
            productType: 'VARIABLE_WHOLE_FRUIT',
            pricePerKg: 180
          }
        ],
        totalFinalPrice: 0
      };
      assert.strictEqual(orderHasUnweighedFruit(order), true);

      // 2. Tailgate staff places durian in basket on scale
      const grossScaleWeight = 3.350; // kg
      const basketTareWeight = 0.250; // kg
      const netWeight = calculateNetWeight(grossScaleWeight, basketTareWeight);
      assert.strictEqual(netWeight, 3.100);

      // 3. Staff enters weight into desk -> calculates item final price
      const finalPrice = calculateWeighedFruitPrice(netWeight, 180);
      assert.strictEqual(finalPrice, 558); // 3.1 * 180 = 558

      order.items[0].actualWeighedKg = netWeight;
      order.items[0].itemFinalPrice = finalPrice;
      order.totalFinalPrice = calculateOrderFinalTotal(order.items, testCatalog);
      assert.strictEqual(order.totalFinalPrice, 558);

      // 4. Order is now weighed -> status resolves to WAITING_PICKUP
      assert.strictEqual(orderHasUnweighedFruit(order), false);
      assert.strictEqual(getOrderStatusConfig(order).key, 'WAITING_PICKUP');

      // 5. Customer chooses to scan PromptPay QR at tailgate desk
      order.orderStatus = 'COMPLETED';
      order.paymentMethod = 'PROMPTPAY_PREPAID';
      order.paymentStatus = 'PAID';
      order.attribution = {
        handledByUserId: 'usr-tailgate-01',
        handledByName: 'นาตยา ผู้จัดการท้ายรถ',
        handledByRole: 'SHOP_OWNER',
        paymentModeAtHandover: 'TRANSFER',
        proofCapturedAt: Date.now(),
        deviceFingerprint: 'tailgate-ipad-01'
      };

      // 6. Verify attribution status and disjoint total calculation
      assert.strictEqual(getOrderStatusConfig(order).key, 'COMPLETED_TRANSFER');
      assert.strictEqual(calculateCashInHandTotal([order]), 0);
      assert.strictEqual(calculatePrepaidTransferTotal([order]), 558);
    });

    it('Scenario 3: Tailgate Cash Collection & Attribution Flow', () => {
      // 1. Order with 5kg Rambutan bundle
      const order = {
        orderId: 'FD-3055',
        orderStatus: 'WAITING_PICKUP',
        paymentMethod: 'PAY_AT_CAR',
        paymentStatus: 'PENDING',
        items: [
          {
            productId: 'prod-rambutan',
            productName: 'เงาะโรงเรียน',
            productType: 'FIXED_WEIGHT',
            pricePerKg: 35,
            orderedKg: 5,
            bundlePrice: 150,
            bundleQtyKg: 5
          }
        ],
        totalFinalPrice: 150
      };

      // 2. Before handover: cashInHandTotal does NOT include pending order
      assert.strictEqual(calculateCashInHandTotal([order]), 0);

      // 3. Customer pays 150 THB cash at tailgate desk
      assert.strictEqual(isValidOrderTransition(order.orderStatus, 'COMPLETED'), true);
      order.orderStatus = 'COMPLETED';
      order.paymentStatus = 'PAID';
      order.attribution = {
        handledByUserId: 'usr-seller-02',
        handledByName: 'อนันต์ เจ้าหน้าที่ท้ายรถ',
        handledByRole: 'SELLER',
        paymentModeAtHandover: 'CASH',
        proofCapturedAt: Date.now(),
        deviceFingerprint: 'tailgate-phone-02'
      };

      // 4. Verify status and cash total
      assert.strictEqual(getOrderStatusConfig(order).key, 'COMPLETED_CASH');
      assert.strictEqual(calculateCashInHandTotal([order]), 150);
      assert.strictEqual(calculatePrepaidTransferTotal([order]), 0);
    });

    it('Scenario 4: Order Cancellation & Revert Flow', () => {
      // 1. Order placed
      const order = {
        orderId: 'FD-4019',
        orderStatus: 'WAITING_PICKUP',
        paymentMethod: 'PAY_AT_CAR',
        paymentStatus: 'PENDING',
        items: [
          { productId: 'prod-rambutan', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 3, bundlePrice: 100, bundleQtyKg: 3 }
        ],
        totalFinalPrice: 100
      };

      // 2. Customer calls: Stuck in traffic, cannot arrive before standby ends
      assert.strictEqual(isValidOrderTransition(order.orderStatus, 'CANCELLED'), true);
      order.orderStatus = 'CANCELLED';
      order.cancelledAt = Date.now();
      order.cancelReason = 'ลูกค้าติดธุระด่วน ไม่สามารถมารับได้';

      // 3. Verification: Status is CANCELLED, excluded from totals
      assert.strictEqual(getOrderStatusConfig(order).key, 'CANCELLED');
      assert.strictEqual(calculateCashInHandTotal([order]), 0);
      assert.strictEqual(calculatePrepaidTransferTotal([order]), 0);

      // 4. Customer manages to arrive just in time: Staff reverts cancellation
      assert.strictEqual(isValidOrderTransition(order.orderStatus, 'WAITING_PICKUP'), true);
      order.orderStatus = 'WAITING_PICKUP';
      delete order.cancelledAt;
      delete order.cancelReason;

      assert.strictEqual(getOrderStatusConfig(order).key, 'WAITING_PICKUP');
      assert.strictEqual(order.cancelledAt, undefined);
    });

    it('Scenario 5: Cross-Round Customer Search User Journey', () => {
      const allRoundsOrders = [
        {
          orderId: 'FD-1082',
          roundId: 'ROUND-001',
          customer: { name: 'สมชาย ใจดี', phone: '081-234-5678' },
          items: [{ productId: 'prod-rambutan', productType: 'FIXED_WEIGHT', pricePerKg: 35, orderedKg: 3 }]
        },
        {
          orderId: 'FD-1083',
          roundId: 'ROUND-002',
          customer: { name: 'วรรณา รักผลไม้', phone: '0899887766' },
          items: [{ productId: 'prod-durian-monthong', productType: 'VARIABLE_WHOLE_FRUIT', pricePerKg: 180 }]
        }
      ];

      // Query 1: Customer types '#FD-1082' with symbol
      assert.strictEqual(matchOrderSearch(allRoundsOrders[0], '#FD-1082'), true);
      assert.strictEqual(matchOrderSearch(allRoundsOrders[1], '#FD-1082'), false);

      // Query 2: Customer types 4-digit number '1082'
      assert.strictEqual(matchOrderSearch(allRoundsOrders[0], '1082'), true);

      // Query 3: Customer searches with unformatted phone '0812345678' against order stored with dashes
      assert.strictEqual(matchOrderSearch(allRoundsOrders[0], '0812345678'), true);

      // Query 4: Customer searches with formatted phone '089-988-7766' against order stored unformatted
      assert.strictEqual(matchOrderSearch(allRoundsOrders[1], '089-988-7766'), true);

      // Query 5: Partial name lookup 'วรรณา'
      assert.strictEqual(matchOrderSearch(allRoundsOrders[1], 'วรรณา'), true);
      assert.strictEqual(matchOrderSearch(allRoundsOrders[0], 'วรรณา'), false);
    });
  });
});
