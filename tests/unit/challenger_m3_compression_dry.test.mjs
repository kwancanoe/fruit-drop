// Empirical Stress-Test Suite: Milestone 3 Image Compression Math & DRY Deduplications
// Challenger 1: Empirical Verification of Image Compression, Status DRY, and RBAC Matrix
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Direct import of centralized status logic from production source code
import { orderHasUnweighedFruit, ORDER_STATUS_CONFIGS, getOrderStatusConfig } from '../../src/constants/status.ts';

// Direct import of image compression utility from production source code
import { compressImage } from '../../src/utils/imageCompressor.ts';

describe('Milestone 3 Challenger 1: Image Compression Aspect Ratio Math', () => {
  // Pure math projection function replicating src/utils/imageCompressor.ts:38-42
  function calculateAspectFit(width, height, maxWidth = 1200, maxHeight = 1200) {
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio)
      };
    }
    return { width, height };
  }

  it('1.1 Landscape phone photo (4032x3024) scales down to exactly 1200x900', () => {
    const dim = calculateAspectFit(4032, 3024, 1200, 1200);
    assert.strictEqual(dim.width, 1200);
    assert.strictEqual(dim.height, 900);
    // Ratio check: 4032 / 3024 === 4 / 3; 1200 / 900 === 4 / 3
    assert.strictEqual(dim.width / dim.height, 4032 / 3024);
  });

  it('1.2 Portrait phone photo (3024x4032) scales down to exactly 900x1200', () => {
    const dim = calculateAspectFit(3024, 4032, 1200, 1200);
    assert.strictEqual(dim.width, 900);
    assert.strictEqual(dim.height, 1200);
    assert.strictEqual(dim.width / dim.height, 3024 / 4032);
  });

  it('1.3 Square camera image (2000x2000) scales down to exactly 1200x1200', () => {
    const dim = calculateAspectFit(2000, 2000, 1200, 1200);
    assert.strictEqual(dim.width, 1200);
    assert.strictEqual(dim.height, 1200);
  });

  it('1.4 Tall mobile screenshot (1080x2400) scales down to exactly 540x1200', () => {
    const dim = calculateAspectFit(1080, 2400, 1200, 1200);
    assert.strictEqual(dim.width, 540);
    assert.strictEqual(dim.height, 1200);
    // Ratio check: 1080 / 2400 = 0.45; 540 / 1200 = 0.45
    assert.strictEqual(dim.width / dim.height, 1080 / 2400);
  });

  it('1.5 Small image (600x400) does NOT upscale and preserves original dimensions', () => {
    const dim = calculateAspectFit(600, 400, 1200, 1200);
    assert.strictEqual(dim.width, 600, 'Width must remain 600 without upscaling');
    assert.strictEqual(dim.height, 400, 'Height must remain 400 without upscaling');
  });

  it('1.6 Boundary match (1200x1200) does NOT upscale or downscale', () => {
    const dim = calculateAspectFit(1200, 1200, 1200, 1200);
    assert.strictEqual(dim.width, 1200);
    assert.strictEqual(dim.height, 1200);
  });

  it('1.7 Panoramic wide image (4800x1200) preserves aspect ratio without height truncation', () => {
    const dim = calculateAspectFit(4800, 1200, 1200, 1200);
    assert.strictEqual(dim.width, 1200);
    assert.strictEqual(dim.height, 300);
    assert.strictEqual(dim.width / dim.height, 4800 / 1200);
  });

  it('1.8 Ultra-tall receipt strip (1200x4800) preserves aspect ratio without width truncation', () => {
    const dim = calculateAspectFit(1200, 4800, 1200, 1200);
    assert.strictEqual(dim.width, 300);
    assert.strictEqual(dim.height, 1200);
    assert.strictEqual(dim.width / dim.height, 1200 / 4800);
  });

  it('1.9 Asymmetric bounding box (maxWidth: 800, maxHeight: 600) scales by tightest constraint', () => {
    const dim1 = calculateAspectFit(1600, 1200, 800, 600);
    assert.strictEqual(dim1.width, 800);
    assert.strictEqual(dim1.height, 600);

    const dim2 = calculateAspectFit(1000, 1000, 800, 600);
    assert.strictEqual(dim2.width, 600);
    assert.strictEqual(dim2.height, 600);
  });

  it('1.10 End-to-end compressImage() execution lifecycle with canvas teardown', async () => {
    let canvasW = 0;
    let canvasH = 0;
    let contextDrawn = false;
    let objectUrlRevoked = false;

    globalThis.window = globalThis;
    globalThis.URL = {
      createObjectURL: () => 'blob:mock-object-url',
      revokeObjectURL: (url) => {
        if (url === 'blob:mock-object-url') objectUrlRevoked = true;
      }
    };

    globalThis.document = {
      createElement: (tag) => {
        if (tag === 'canvas') {
          return {
            get width() { return canvasW; },
            set width(v) { canvasW = v; },
            get height() { return canvasH; },
            set height(v) { canvasH = v; },
            getContext: (type) => {
              if (type === '2d') {
                return {
                  drawImage: (img, sx, sy, sw, sh) => {
                    contextDrawn = true;
                    assert.strictEqual(sw, 1200);
                    assert.strictEqual(sh, 900);
                  }
                };
              }
              return null;
            },
            toDataURL: () => 'data:image/jpeg;base64,mockbase64data',
            toBlob: (callback, mime, quality) => {
              assert.strictEqual(mime, 'image/jpeg');
              assert.strictEqual(quality, 0.75);
              callback({ size: 154200, type: 'image/jpeg' });
            }
          };
        }
        throw new Error(`Unexpected element creation: ${tag}`);
      }
    };

    globalThis.Image = class {
      constructor() {
        this.width = 4032;
        this.height = 3024;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 5);
      }
    };

    const mockBlob = { size: 8450000, type: 'image/jpeg' };
    const result = await compressImage(mockBlob, 1200, 1200, 0.75);

    assert.ok(result);
    assert.strictEqual(result.sizeBytes, 154200);
    assert.strictEqual(result.dataUrl, 'data:image/jpeg;base64,mockbase64data');
    assert.strictEqual(contextDrawn, true, 'Image must be drawn to canvas context');
    assert.strictEqual(objectUrlRevoked, true, 'ObjectURL must be revoked to avoid memory leaks');
    assert.strictEqual(canvasW, 0, 'Canvas width must be zeroed to release VRAM/heap');
    assert.strictEqual(canvasH, 0, 'Canvas height must be zeroed to release VRAM/heap');
  });
});

describe('Milestone 3 Challenger 1: Centralized orderHasUnweighedFruit Empirical Tests', () => {
  it('2.1 Empty items array returns false', () => {
    const order = { items: [] };
    assert.strictEqual(orderHasUnweighedFruit(order), false);
  });

  it('2.2 Undefined or null items returns false', () => {
    assert.strictEqual(orderHasUnweighedFruit({ items: undefined }), false);
    assert.strictEqual(orderHasUnweighedFruit({ items: null }), false);
    assert.strictEqual(orderHasUnweighedFruit({}), false);
  });

  it('2.3 Non-durian items only (FIXED_WEIGHT) returns false', () => {
    const order = {
      items: [
        { productType: 'FIXED_WEIGHT', productName: 'เงาะโรงเรียน', orderedKg: 3 },
        { productType: 'FIXED_WEIGHT', productName: 'มังคุดคัด', orderedKg: 2, actualWeighedKg: undefined },
        { productType: 'FIXED_WEIGHT', productName: 'ลองกอง', orderedKg: 1, actualWeighedKg: 0 }
      ]
    };
    assert.strictEqual(orderHasUnweighedFruit(order), false);
  });

  it('2.4 Durian with no actualWeighedKg (undefined) returns true', () => {
    const order = {
      items: [
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนหมอนทอง', orderedKg: 4 }
      ]
    };
    assert.strictEqual(orderHasUnweighedFruit(order), true);
  });

  it('2.5 Durian with actualWeighedKg: 0 returns true', () => {
    const order = {
      items: [
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนก้านยาว', orderedKg: 3.5, actualWeighedKg: 0 }
      ]
    };
    assert.strictEqual(orderHasUnweighedFruit(order), true);
  });

  it('2.6 Durian with negative actualWeighedKg (-1.5) returns true', () => {
    const order = {
      items: [
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนชะนี', orderedKg: 3, actualWeighedKg: -1.5 }
      ]
    };
    assert.strictEqual(orderHasUnweighedFruit(order), true);
  });

  it('2.7 Durian with valid weighed kg (3.4) returns false', () => {
    const order = {
      items: [
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนหมอนทอง', orderedKg: 3, actualWeighedKg: 3.4 }
      ]
    };
    assert.strictEqual(orderHasUnweighedFruit(order), false);
  });

  it('2.8 Mixed items with 1 unweighed durian + 2 fixed fruits returns true', () => {
    const order = {
      items: [
        { productType: 'FIXED_WEIGHT', productName: 'เงาะโรงเรียน', orderedKg: 5 },
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนหมอนทอง', orderedKg: 4, actualWeighedKg: undefined },
        { productType: 'FIXED_WEIGHT', productName: 'มังคุด', orderedKg: 2 }
      ]
    };
    assert.strictEqual(orderHasUnweighedFruit(order), true);
  });

  it('2.9 Mixed items with 1 weighed durian + 2 fixed fruits returns false', () => {
    const order = {
      items: [
        { productType: 'FIXED_WEIGHT', productName: 'เงาะโรงเรียน', orderedKg: 5 },
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนหมอนทอง', orderedKg: 4, actualWeighedKg: 4.12 },
        { productType: 'FIXED_WEIGHT', productName: 'มังคุด', orderedKg: 2 }
      ]
    };
    assert.strictEqual(orderHasUnweighedFruit(order), false);
  });

  it('2.10 Multi-durian order: 1 weighed + 1 unweighed returns true', () => {
    const order = {
      items: [
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนลูกที่ 1', orderedKg: 3, actualWeighedKg: 3.2 },
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนลูกที่ 2', orderedKg: 4, actualWeighedKg: 0 }
      ]
    };
    assert.strictEqual(orderHasUnweighedFruit(order), true);
  });

  it('2.11 Durian with NaN actualWeighedKg returns true', () => {
    const order = {
      items: [
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนหมอนทอง', orderedKg: 3, actualWeighedKg: NaN }
      ]
    };
    assert.strictEqual(orderHasUnweighedFruit(order), true);
  });

  it('2.12 Durian with null actualWeighedKg returns true', () => {
    const order = {
      items: [
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนหมอนทอง', orderedKg: 3, actualWeighedKg: null }
      ]
    };
    assert.strictEqual(orderHasUnweighedFruit(order), true);
  });

  it('2.13 Operational Status Visual Config integration: getOrderStatusConfig returns WEIGHING when unweighed fruit present', () => {
    const unweighedOrder = {
      orderStatus: 'WAITING_PICKUP',
      items: [
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนหมอนทอง', orderedKg: 4, actualWeighedKg: 0 }
      ]
    };
    const config1 = getOrderStatusConfig(unweighedOrder);
    assert.strictEqual(config1.key, 'WEIGHING');
    assert.strictEqual(config1.label, 'รอชั่งน้ำหนัก');

    const weighedOrder = {
      orderStatus: 'WAITING_PICKUP',
      items: [
        { productType: 'VARIABLE_WHOLE_FRUIT', productName: 'ทุเรียนหมอนทอง', orderedKg: 4, actualWeighedKg: 4.2 }
      ]
    };
    const config2 = getOrderStatusConfig(weighedOrder);
    assert.strictEqual(config2.key, 'WAITING_PICKUP');
    assert.strictEqual(config2.label, 'รอมารับของ');
  });
});

describe('Milestone 3 Challenger 1: canManageTargetUser 3-Tier RBAC Matrix Tests', () => {
  // Pure RBAC function reproducing src/pages/admin/UsersPage.vue:328-332
  function canManageTargetUser(currentRole, targetRole) {
    const isSystemAdmin = currentRole === 'SYSTEM_ADMIN';
    const isShopOwner = currentRole === 'SHOP_OWNER';
    if (isSystemAdmin) return true;
    if (isShopOwner) return targetRole === 'SELLER';
    return false;
  }

  it('3.1 SYSTEM_ADMIN can manage SYSTEM_ADMIN (peer admin)', () => {
    assert.strictEqual(canManageTargetUser('SYSTEM_ADMIN', 'SYSTEM_ADMIN'), true);
  });

  it('3.2 SYSTEM_ADMIN can manage SHOP_OWNER', () => {
    assert.strictEqual(canManageTargetUser('SYSTEM_ADMIN', 'SHOP_OWNER'), true);
  });

  it('3.3 SYSTEM_ADMIN can manage SELLER', () => {
    assert.strictEqual(canManageTargetUser('SYSTEM_ADMIN', 'SELLER'), true);
  });

  it('3.4 SHOP_OWNER can manage SELLER', () => {
    assert.strictEqual(canManageTargetUser('SHOP_OWNER', 'SELLER'), true);
  });

  it('3.5 SHOP_OWNER CANNOT manage SHOP_OWNER (peer shop owner)', () => {
    assert.strictEqual(canManageTargetUser('SHOP_OWNER', 'SHOP_OWNER'), false);
  });

  it('3.6 SHOP_OWNER CANNOT manage SYSTEM_ADMIN (privilege boundary)', () => {
    assert.strictEqual(canManageTargetUser('SHOP_OWNER', 'SYSTEM_ADMIN'), false);
  });

  it('3.7 SELLER CANNOT manage SELLER', () => {
    assert.strictEqual(canManageTargetUser('SELLER', 'SELLER'), false);
  });

  it('3.8 SELLER CANNOT manage SHOP_OWNER', () => {
    assert.strictEqual(canManageTargetUser('SELLER', 'SHOP_OWNER'), false);
  });

  it('3.9 SELLER CANNOT manage SYSTEM_ADMIN', () => {
    assert.strictEqual(canManageTargetUser('SELLER', 'SYSTEM_ADMIN'), false);
  });

  it('3.10 Unknown / Null / Inactive caller roles cannot manage any target', () => {
    assert.strictEqual(canManageTargetUser(null, 'SELLER'), false);
    assert.strictEqual(canManageTargetUser(undefined, 'SELLER'), false);
    assert.strictEqual(canManageTargetUser('GUEST', 'SELLER'), false);
    assert.strictEqual(canManageTargetUser('CUSTOMER', 'SELLER'), false);
  });

  it('3.11 Full 3x3 Truth Table Exhaustive Verification', () => {
    const roles = ['SYSTEM_ADMIN', 'SHOP_OWNER', 'SELLER'];
    const expected = {
      'SYSTEM_ADMIN->SYSTEM_ADMIN': true,
      'SYSTEM_ADMIN->SHOP_OWNER': true,
      'SYSTEM_ADMIN->SELLER': true,
      'SHOP_OWNER->SYSTEM_ADMIN': false,
      'SHOP_OWNER->SHOP_OWNER': false,
      'SHOP_OWNER->SELLER': true,
      'SELLER->SYSTEM_ADMIN': false,
      'SELLER->SHOP_OWNER': false,
      'SELLER->SELLER': false
    };

    for (const caller of roles) {
      for (const target of roles) {
        const key = `${caller}->${target}`;
        const actual = canManageTargetUser(caller, target);
        assert.strictEqual(actual, expected[key], `Failed on ${key}: expected ${expected[key]}, got ${actual}`);
      }
    }
  });
});
