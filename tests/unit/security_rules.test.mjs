// tests/unit/security_rules.test.mjs
// Empirical test harness for Firestore Security Rules (Feature 3)
import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// --- Simulation Engine for Firestore Security Rules ---

/**
 * Simulates Firestore Rules MapDiff: request.resource.data.diff(resource.data)
 */
class MapDiff {
  constructor(before, after) {
    this.before = before || {};
    this.after = after || {};
  }

  /**
   * affectedKeys(): returns a Set of keys that are added, removed, or changed.
   */
  affectedKeys() {
    const keys = new Set();
    const allKeys = new Set([...Object.keys(this.before), ...Object.keys(this.after)]);

    for (const key of allKeys) {
      const inBefore = key in this.before;
      const inAfter = key in this.after;

      if (!inBefore && inAfter) {
        // Added key
        keys.add(key);
      } else if (inBefore && !inAfter) {
        // Deleted key
        keys.add(key);
      } else if (inBefore && inAfter) {
        // Check if value changed
        const valBefore = this.before[key];
        const valAfter = this.after[key];
        if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
          keys.add(key);
        }
      }
    }

    return new SetWrapper(keys);
  }
}

class SetWrapper {
  constructor(set) {
    this.set = set;
  }

  hasOnly(allowedList) {
    const allowedSet = new Set(allowedList);
    for (const item of this.set) {
      if (!allowedSet.has(item)) {
        return false;
      }
    }
    return true;
  }

  hasAny(list) {
    for (const item of list) {
      if (this.set.has(item)) return true;
    }
    return false;
  }

  hasAll(list) {
    for (const item of list) {
      if (!this.set.has(item)) return false;
    }
    return true;
  }

  size() {
    return this.set.size;
  }

  toArray() {
    return Array.from(this.set);
  }
}

/**
 * Simulates Firestore Document Wrapper
 */
class FirestoreDoc {
  constructor(data) {
    this.data = data ? JSON.parse(JSON.stringify(data)) : {};
  }

  diff(otherDocData) {
    return new MapDiff(otherDocData, this.data);
  }
}

/**
 * Simulates firestore.rules logic for match /users/{userEmail}
 */
class FirestoreRulesSimulator {
  constructor({ auth, database = {} }) {
    this.auth = auth || null; // request.auth
    this.database = database; // simulated Firestore documents
  }

  isAuthenticated() {
    return this.auth !== null;
  }

  authEmail() {
    return this.auth && this.auth.token?.email ? this.auth.token.email.toLowerCase() : '';
  }

  isWhitelisted() {
    return [
      'wittinunt.k@gmail.com',
      'natyabuyna089@gmail.com',
      'kwancanoe@gmail.com'
    ].includes(this.authEmail());
  }

  isStaff() {
    if (this.isWhitelisted()) return true;
    if (!this.isAuthenticated()) return false;
    const userDoc = this.database[`users/${this.authEmail()}`];
    return userDoc?.isActive === true;
  }

  isSystemAdmin() {
    if (['wittinunt.k@gmail.com', 'kwancanoe@gmail.com'].includes(this.authEmail())) {
      return true;
    }
    if (!this.isAuthenticated()) return false;
    const userDoc = this.database[`users/${this.authEmail()}`];
    return userDoc?.role === 'SYSTEM_ADMIN' && userDoc?.isActive === true;
  }

  isShopOwner() {
    if (this.authEmail() === 'natyabuyna089@gmail.com') {
      return true;
    }
    if (!this.isAuthenticated()) return false;
    const userDoc = this.database[`users/${this.authEmail()}`];
    return userDoc?.role === 'SHOP_OWNER' && userDoc?.isActive === true;
  }

  /**
   * Evaluate update rule on match /users/{userEmail}
   */
  canUpdateUser({ targetEmail, currentDoc, incomingDoc }) {
    const resource = { data: currentDoc };
    const request = {
      auth: this.auth,
      resource: new FirestoreDoc(incomingDoc)
    };

    // Rule expression from firestore.rules:67-77:
    // allow update: if isSystemAdmin() || (
    //   isShopOwner() && 
    //   resource.data.role == 'SELLER' && 
    //   request.resource.data.role == 'SELLER'
    // ) || (
    //   isAuthenticated() && 
    //   authEmail() == userEmail.lower() &&
    //   request.resource.data.diff(resource.data).affectedKeys().hasOnly([
    //     'lastLoginAt', 'lastLoginDevice', 'uid', 'updatedAt'
    //   ])
    // );

    const conditionSystemAdmin = this.isSystemAdmin();

    const conditionShopOwner =
      this.isShopOwner() &&
      resource.data.role === 'SELLER' &&
      request.resource.data.role === 'SELLER';

    const diff = request.resource.diff(resource.data);
    const affected = diff.affectedKeys();
    const hasOnlyAllowedTelemetry = affected.hasOnly([
      'lastLoginAt', 'lastLoginDevice', 'uid', 'updatedAt'
    ]);

    const conditionSelfTelemetry =
      this.isAuthenticated() &&
      this.authEmail() === targetEmail.toLowerCase() &&
      hasOnlyAllowedTelemetry;

    return {
      allowed: conditionSystemAdmin || conditionShopOwner || conditionSelfTelemetry,
      reasons: {
        conditionSystemAdmin,
        conditionShopOwner,
        conditionSelfTelemetry,
        affectedKeys: affected.toArray()
      }
    };
  }

  canWriteRound() {
    return this.isSystemAdmin() || this.isShopOwner();
  }

  canWriteProduct() {
    return this.isSystemAdmin() || this.isShopOwner();
  }

  canWriteMasterFruit() {
    return this.isSystemAdmin() || this.isShopOwner();
  }

  canUpdateOrder() {
    return this.isStaff();
  }

  canDeleteOrder() {
    return this.isSystemAdmin() || this.isShopOwner();
  }
}

describe('Feature 3: Firestore Security Rules & affectedKeys() Empirical Test Suite', () => {
  // Fixture: Standard existing SELLER document
  const BASE_SELLER_DOC = {
    email: 'seller_somchai@fruitdrop.local',
    displayName: 'Somchai Jaidee',
    phone: '0812345678',
    role: 'SELLER',
    isActive: true,
    uid: 'uid_somchai_123',
    createdAt: 1725700000000,
    lastLoginAt: 1725700000000,
    lastLoginDevice: {
      deviceId: 'DEV-001',
      deviceModel: 'Pixel 8',
      platform: 'Android'
    }
  };

  const SELLER_AUTH = {
    uid: 'uid_somchai_123',
    token: { email: 'seller_somchai@fruitdrop.local' }
  };

  const ATTACKER_AUTH = {
    uid: 'uid_evil_666',
    token: { email: 'attacker@evil.local' }
  };

  const SHOP_OWNER_AUTH = {
    uid: 'uid_owner_001',
    token: { email: 'natyabuyna089@gmail.com' }
  };

  const SYSTEM_ADMIN_AUTH = {
    uid: 'uid_admin_001',
    token: { email: 'wittinunt.k@gmail.com' }
  };

  describe('1. Mission Critical Verification: affectedKeys for Self-Update', () => {
    it('ALLOWS updating lastLoginAt alone', () => {
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const incoming = {
        ...BASE_SELLER_DOC,
        lastLoginAt: Date.now()
      };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, true);
      assert.deepEqual(result.reasons.affectedKeys, ['lastLoginAt']);
    });

    it('DENIES privilege escalation attempt { role: "SYSTEM_ADMIN" }', () => {
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const incoming = {
        ...BASE_SELLER_DOC,
        role: 'SYSTEM_ADMIN'
      };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
      assert.deepEqual(result.reasons.affectedKeys, ['role']);
    });

    it('DENIES blended attack { lastLoginAt: Date.now(), role: "SYSTEM_ADMIN" }', () => {
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const incoming = {
        ...BASE_SELLER_DOC,
        lastLoginAt: Date.now(),
        role: 'SYSTEM_ADMIN'
      };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
      assert.ok(result.reasons.affectedKeys.includes('role'));
      assert.ok(result.reasons.affectedKeys.includes('lastLoginAt'));
    });
  });

  describe('2. Comprehensive Telemetry Permitted Fields', () => {
    it('ALLOWS updating all 4 telemetry fields simultaneously (lastLoginAt, lastLoginDevice, uid, updatedAt)', () => {
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const now = Date.now();
      const incoming = {
        ...BASE_SELLER_DOC,
        uid: 'uid_somchai_new',
        lastLoginAt: now,
        lastLoginDevice: {
          deviceId: 'DEV-002',
          deviceModel: 'Galaxy S24',
          platform: 'Android'
        },
        updatedAt: now
      };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, true);
      assert.equal(result.reasons.conditionSelfTelemetry, true);
    });

    it('ALLOWS no-op update where no keys are modified', () => {
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const incoming = { ...BASE_SELLER_DOC };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, true);
      assert.equal(result.reasons.affectedKeys.length, 0);
    });
  });

  describe('3. Adversarial Exploits Blocked by affectedKeys', () => {
    it('DENIES self-promotion to SHOP_OWNER', () => {
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const incoming = { ...BASE_SELLER_DOC, role: 'SHOP_OWNER' };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
    });

    it('DENIES self-reactivation if account was deactivated (isActive: true)', () => {
      const inactiveSellerDoc = { ...BASE_SELLER_DOC, isActive: false };
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const incoming = { ...inactiveSellerDoc, isActive: true };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: inactiveSellerDoc,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
      assert.deepEqual(result.reasons.affectedKeys, ['isActive']);
    });

    it('DENIES changing email field', () => {
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const incoming = { ...BASE_SELLER_DOC, email: 'admin@fruitdrop.local' };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
      assert.deepEqual(result.reasons.affectedKeys, ['email']);
    });

    it('DENIES changing displayName without admin privileges', () => {
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const incoming = { ...BASE_SELLER_DOC, displayName: 'Master Hacker' };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
      assert.deepEqual(result.reasons.affectedKeys, ['displayName']);
    });

    it('DENIES injecting arbitrary extra fields (e.g. isAdmin: true)', () => {
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const incoming = { ...BASE_SELLER_DOC, isAdmin: true };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
      assert.deepEqual(result.reasons.affectedKeys, ['isAdmin']);
    });

    it('DENIES deleting role field', () => {
      const sim = new FirestoreRulesSimulator({ auth: SELLER_AUTH });
      const incoming = { ...BASE_SELLER_DOC };
      delete incoming.role;

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
      assert.deepEqual(result.reasons.affectedKeys, ['role']);
    });
  });

  describe('4. Cross-Account and Unauthenticated Attack Vectors', () => {
    it('DENIES unauthenticated user from updating any telemetry', () => {
      const sim = new FirestoreRulesSimulator({ auth: null });
      const incoming = { ...BASE_SELLER_DOC, lastLoginAt: Date.now() };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
    });

    it('DENIES attacker from updating another users telemetry document', () => {
      const sim = new FirestoreRulesSimulator({ auth: ATTACKER_AUTH });
      const incoming = { ...BASE_SELLER_DOC, lastLoginAt: Date.now() };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
    });
  });

  describe('5. Role Hierarchy & Delegation Boundaries (Shop Owner & Admin)', () => {
    it('ALLOWS Shop Owner to update a SELLER profile (e.g. update phone or name)', () => {
      const sim = new FirestoreRulesSimulator({ auth: SHOP_OWNER_AUTH });
      const incoming = {
        ...BASE_SELLER_DOC,
        displayName: 'Somchai Updated Name',
        phone: '0899999999'
      };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, true);
      assert.equal(result.reasons.conditionShopOwner, true);
    });

    it('DENIES Shop Owner from escalating a SELLER to SYSTEM_ADMIN', () => {
      const sim = new FirestoreRulesSimulator({ auth: SHOP_OWNER_AUTH });
      const incoming = {
        ...BASE_SELLER_DOC,
        role: 'SYSTEM_ADMIN'
      };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
    });

    it('DENIES Shop Owner from modifying a SYSTEM_ADMIN document', () => {
      const adminDoc = {
        email: 'wittinunt.k@gmail.com',
        displayName: 'Wittinunt K.',
        role: 'SYSTEM_ADMIN',
        isActive: true
      };
      const sim = new FirestoreRulesSimulator({ auth: SHOP_OWNER_AUTH });
      const incoming = { ...adminDoc, displayName: 'Modified By Owner' };

      const result = sim.canUpdateUser({
        targetEmail: adminDoc.email,
        currentDoc: adminDoc,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, false);
    });

    it('ALLOWS System Admin to modify any field on any user document', () => {
      const sim = new FirestoreRulesSimulator({ auth: SYSTEM_ADMIN_AUTH });
      const incoming = {
        ...BASE_SELLER_DOC,
        role: 'SHOP_OWNER',
        displayName: 'Promoted to Owner'
      };

      const result = sim.canUpdateUser({
        targetEmail: BASE_SELLER_DOC.email,
        currentDoc: BASE_SELLER_DOC,
        incomingDoc: incoming
      });

      assert.equal(result.allowed, true);
      assert.equal(result.reasons.conditionSystemAdmin, true);
    });
  });

  describe('6. Firebase Storage Security Rules Validation', () => {
    function canUploadStorage({ auth, sizeBytes, contentType, path }) {
      // Expression from storage.rules:
      // match /payment_proofs/{allPaths=**} {
      //   allow write: if request.auth != null
      //     && request.resource.size < 5 * 1024 * 1024
      //     && request.resource.contentType.matches('image/.*');
      // }
      // match /fruits/{allPaths=**} {
      //   allow write: if request.auth != null
      //     && request.resource.size < 5 * 1024 * 1024
      //     && request.resource.contentType.matches('image/.*');
      // }
      if (!auth) return false;
      const isAllowedPath = path.startsWith('payment_proofs/') || path.startsWith('fruits/');
      if (!isAllowedPath) return false;
      const sizeOk = sizeBytes < 5 * 1024 * 1024;
      const mimeOk = /^image\/.*$/.test(contentType);
      return sizeOk && mimeOk;
    }

    it('ALLOWS valid image upload under 5MB (JPEG 1.2MB)', () => {
      const allowed = canUploadStorage({
        auth: SELLER_AUTH,
        sizeBytes: 1.2 * 1024 * 1024,
        contentType: 'image/jpeg',
        path: 'payment_proofs/order-101.jpg'
      });
      assert.equal(allowed, true);
    });

    it('ALLOWS valid PNG upload under 5MB (PNG 3.4MB)', () => {
      const allowed = canUploadStorage({
        auth: SELLER_AUTH,
        sizeBytes: 3.4 * 1024 * 1024,
        contentType: 'image/png',
        path: 'fruits/durian-monthong.png'
      });
      assert.equal(allowed, true);
    });

    it('DENIES oversized file (6MB)', () => {
      const allowed = canUploadStorage({
        auth: SELLER_AUTH,
        sizeBytes: 6 * 1024 * 1024,
        contentType: 'image/jpeg',
        path: 'payment_proofs/huge-slip.jpg'
      });
      assert.equal(allowed, false);
    });

    it('DENIES exactly 5MB boundary edge case (must be strictly < 5MB)', () => {
      const allowed = canUploadStorage({
        auth: SELLER_AUTH,
        sizeBytes: 5 * 1024 * 1024,
        contentType: 'image/jpeg',
        path: 'payment_proofs/exact-5mb.jpg'
      });
      assert.equal(allowed, false);
    });

    it('DENIES non-image MIME types (e.g. application/pdf, text/html, application/javascript)', () => {
      assert.equal(canUploadStorage({
        auth: SELLER_AUTH,
        sizeBytes: 100 * 1024,
        contentType: 'application/pdf',
        path: 'payment_proofs/malicious.pdf'
      }), false);

      assert.equal(canUploadStorage({
        auth: SELLER_AUTH,
        sizeBytes: 100 * 1024,
        contentType: 'text/html',
        path: 'payment_proofs/xss.html'
      }), false);

      assert.equal(canUploadStorage({
        auth: SELLER_AUTH,
        sizeBytes: 100 * 1024,
        contentType: 'application/javascript',
        path: 'payment_proofs/exploit.js'
      }), false);
    });

    it('DENIES unauthenticated upload', () => {
      const allowed = canUploadStorage({
        auth: null,
        sizeBytes: 500 * 1024,
        contentType: 'image/jpeg',
        path: 'payment_proofs/slip.jpg'
      });
      assert.equal(allowed, false);
    });
  });

  describe('7. Role Restrictions for Rounds, Products, Master Fruits and Orders', () => {
    const database = {
      'users/seller_somchai@fruitdrop.local': {
        role: 'SELLER',
        isActive: true
      },
      'users/natyabuyna089@gmail.com': {
        role: 'SHOP_OWNER',
        isActive: true
      },
      'users/wittinunt.k@gmail.com': {
        role: 'SYSTEM_ADMIN',
        isActive: true
      }
    };

    const sellerSim = new FirestoreRulesSimulator({
      auth: { uid: 'uid_seller', token: { email: 'seller_somchai@fruitdrop.local' } },
      database
    });

    const ownerSim = new FirestoreRulesSimulator({
      auth: { uid: 'uid_owner', token: { email: 'natyabuyna089@gmail.com' } },
      database
    });

    const adminSim = new FirestoreRulesSimulator({
      auth: { uid: 'uid_admin', token: { email: 'wittinunt.k@gmail.com' } },
      database
    });

    it('DENIES SELLER from creating/updating/deleting rounds', () => {
      assert.equal(sellerSim.canWriteRound(), false);
    });

    it('ALLOWS SHOP_OWNER to create/update/delete rounds', () => {
      assert.equal(ownerSim.canWriteRound(), true);
    });

    it('ALLOWS SYSTEM_ADMIN to create/update/delete rounds', () => {
      assert.equal(adminSim.canWriteRound(), true);
    });

    it('DENIES SELLER from creating/updating/deleting products and master_fruits', () => {
      assert.equal(sellerSim.canWriteProduct(), false);
      assert.equal(sellerSim.canWriteMasterFruit(), false);
    });

    it('ALLOWS SHOP_OWNER and SYSTEM_ADMIN to manage products and master_fruits', () => {
      assert.equal(ownerSim.canWriteProduct(), true);
      assert.equal(ownerSim.canWriteMasterFruit(), true);
      assert.equal(adminSim.canWriteProduct(), true);
      assert.equal(adminSim.canWriteMasterFruit(), true);
    });

    it('ALLOWS SELLER to update orders (status, weighing, proof)', () => {
      assert.equal(sellerSim.canUpdateOrder(), true);
    });

    it('DENIES SELLER from deleting orders', () => {
      assert.equal(sellerSim.canDeleteOrder(), false);
    });

    it('ALLOWS SHOP_OWNER and SYSTEM_ADMIN to delete orders', () => {
      assert.equal(ownerSim.canDeleteOrder(), true);
      assert.equal(adminSim.canDeleteOrder(), true);
    });
  });
});
