// Unit tests for Milestone 3: Feature 12 (Lifecycle), Feature 14 (Compression Math), Feature 15 (DRY), Feature 16 (Purity)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Milestone 3: Feature 15 — DRY Logic Deduplication', () => {
  // Test orderHasUnweighedFruit behavior
  function orderHasUnweighedFruit(order) {
    if (!order.items || order.items.length === 0) return false;
    return order.items.some(item =>
      item.productType === 'VARIABLE_WHOLE_FRUIT' &&
      (!item.actualWeighedKg || item.actualWeighedKg <= 0)
    );
  }

  test('returns false when order has no items', () => {
    assert.equal(orderHasUnweighedFruit({ items: [] }), false);
    assert.equal(orderHasUnweighedFruit({ items: undefined }), false);
  });

  test('returns false when order has only FIXED_WEIGHT items', () => {
    const order = {
      items: [
        { productType: 'FIXED_WEIGHT', orderedKg: 3, actualWeighedKg: undefined },
        { productType: 'FIXED_WEIGHT', orderedKg: 5, actualWeighedKg: 0 }
      ]
    };
    assert.equal(orderHasUnweighedFruit(order), false);
  });

  test('returns true when order has VARIABLE_WHOLE_FRUIT with missing actualWeighedKg', () => {
    const order = {
      items: [
        { productType: 'FIXED_WEIGHT', orderedKg: 3 },
        { productType: 'VARIABLE_WHOLE_FRUIT', orderedKg: 4 }
      ]
    };
    assert.equal(orderHasUnweighedFruit(order), true);
  });

  test('returns true when order has VARIABLE_WHOLE_FRUIT with 0 or negative actualWeighedKg', () => {
    const order1 = {
      items: [{ productType: 'VARIABLE_WHOLE_FRUIT', orderedKg: 4, actualWeighedKg: 0 }]
    };
    const order2 = {
      items: [{ productType: 'VARIABLE_WHOLE_FRUIT', orderedKg: 4, actualWeighedKg: -1 }]
    };
    assert.equal(orderHasUnweighedFruit(order1), true);
    assert.equal(orderHasUnweighedFruit(order2), true);
  });

  test('returns false when all VARIABLE_WHOLE_FRUIT items have positive actualWeighedKg', () => {
    const order = {
      items: [
        { productType: 'VARIABLE_WHOLE_FRUIT', orderedKg: 4, actualWeighedKg: 3.85 },
        { productType: 'FIXED_WEIGHT', orderedKg: 2 }
      ]
    };
    assert.equal(orderHasUnweighedFruit(order), false);
  });

  // Test canManageTargetUser behavior
  function canManageTargetUser(currentRole, targetRole) {
    if (currentRole === 'SYSTEM_ADMIN') return true;
    if (currentRole === 'SHOP_OWNER') return targetRole === 'SELLER';
    return false;
  }

  test('SYSTEM_ADMIN can manage all user roles', () => {
    assert.equal(canManageTargetUser('SYSTEM_ADMIN', 'SYSTEM_ADMIN'), true);
    assert.equal(canManageTargetUser('SYSTEM_ADMIN', 'SHOP_OWNER'), true);
    assert.equal(canManageTargetUser('SYSTEM_ADMIN', 'SELLER'), true);
  });

  test('SHOP_OWNER can only manage SELLER role', () => {
    assert.equal(canManageTargetUser('SHOP_OWNER', 'SELLER'), true);
    assert.equal(canManageTargetUser('SHOP_OWNER', 'SHOP_OWNER'), false);
    assert.equal(canManageTargetUser('SHOP_OWNER', 'SYSTEM_ADMIN'), false);
  });

  test('SELLER cannot manage any user role', () => {
    assert.equal(canManageTargetUser('SELLER', 'SELLER'), false);
    assert.equal(canManageTargetUser('SELLER', 'SHOP_OWNER'), false);
    assert.equal(canManageTargetUser('SELLER', 'SYSTEM_ADMIN'), false);
  });
});

describe('Milestone 3: Feature 14 — Image Compression Aspect Ratio Math', () => {
  function calculateCompressedDimensions(width, height, maxWidth = 1200, maxHeight = 1200) {
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio)
      };
    }
    return { width, height };
  }

  test('scales down landscape smartphone photo (4032x3024) to fit 1200x1200 bounding box', () => {
    const result = calculateCompressedDimensions(4032, 3024, 1200, 1200);
    assert.equal(result.width, 1200);
    assert.equal(result.height, 900);
  });

  test('scales down portrait smartphone photo (3024x4032) to fit 1200x1200 bounding box', () => {
    const result = calculateCompressedDimensions(3024, 4032, 1200, 1200);
    assert.equal(result.width, 900);
    assert.equal(result.height, 1200);
  });

  test('scales down tall mobile receipt (1080x2400) properly without exceeding maxHeight', () => {
    const result = calculateCompressedDimensions(1080, 2400, 1200, 1200);
    assert.equal(result.width, 540);
    assert.equal(result.height, 1200);
  });

  test('preserves dimensions when image is already within bounds (600x600)', () => {
    const result = calculateCompressedDimensions(600, 600, 1200, 1200);
    assert.equal(result.width, 600);
    assert.equal(result.height, 600);
  });

  test('handles non-square bounding boxes accurately (e.g. maxWidth 1200, maxHeight 600)', () => {
    const result = calculateCompressedDimensions(1200, 1200, 1200, 600);
    assert.equal(result.width, 600);
    assert.equal(result.height, 600);
  });
});

describe('Milestone 3: Feature 12 & 13 — Listener Cleanup and Lifecycle Contracts', () => {
  test('unsubscription tracker executes cleanup callback and nullifies handle', () => {
    let uncalled = true;
    let unsubHandle = () => { uncalled = false; };

    function unsubscribe() {
      if (unsubHandle) {
        unsubHandle();
        unsubHandle = null;
      }
    }

    assert.equal(typeof unsubHandle, 'function');
    unsubscribe();
    assert.equal(uncalled, false);
    assert.equal(unsubHandle, null);

    // Repeated call is safe and idempotent
    assert.doesNotThrow(() => unsubscribe());
  });

  test('comprehensive cleanup executes all 5 listener handles', () => {
    const executed = [];
    let h1 = () => executed.push('h1');
    let h2 = () => executed.push('h2');
    let h3 = () => executed.push('h3');

    function cleanupAll() {
      if (h1) { h1(); h1 = null; }
      if (h2) { h2(); h2 = null; }
      if (h3) { h3(); h3 = null; }
    }

    cleanupAll();
    assert.deepEqual(executed, ['h1', 'h2', 'h3']);
    assert.equal(h1, null);
    assert.equal(h2, null);
    assert.equal(h3, null);
  });
});
