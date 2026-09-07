// tests/unit/challenger_m3_lifecycle.test.mjs
// Empirical Challenger Test Harness for Milestone 3:
// Listener Lifecycle Contracts, Unmount Cleanup, and Read Leak Elimination
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parse as parseSfc } from 'vue/compiler-sfc';

const PROJECT_ROOT = process.cwd();

/**
 * Helper to parse a TypeScript file into an AST SourceFile
 */
function parseTypeScriptFile(filePath) {
  const fullPath = path.resolve(PROJECT_ROOT, filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return {
    content,
    sourceFile: ts.createSourceFile(path.basename(filePath), content, ts.ScriptTarget.Latest, true)
  };
}

/**
 * Helper to parse a Vue SFC and extract <script setup> or <script> AST
 */
function parseVueSfcFile(filePath) {
  const fullPath = path.resolve(PROJECT_ROOT, filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const { descriptor } = parseSfc(content);
  const scriptContent = descriptor.scriptSetup?.content || descriptor.script?.content || '';
  const scriptAst = ts.createSourceFile(
    path.basename(filePath) + '.ts',
    scriptContent,
    ts.ScriptTarget.Latest,
    true
  );
  return {
    content,
    descriptor,
    scriptContent,
    scriptAst
  };
}

// ---------------------------------------------------------------------------
// SUITE 1: AST Verification of Pinia Store Unsubscription & Lifecycle Contracts
// ---------------------------------------------------------------------------
describe('Milestone 3 Suite 1: AST Contract Verification in Pinia Stores', () => {

  test('fruitStore.ts exports all 7 required unsubscription & cleanup functions', () => {
    const { sourceFile } = parseTypeScriptFile('src/stores/fruitStore.ts');
    let returnedProps = [];

    function findReturn(node) {
      if (ts.isReturnStatement(node) && node.expression && ts.isObjectLiteralExpression(node.expression)) {
        returnedProps = node.expression.properties.map(p => {
          if (p.name) return p.name.getText(sourceFile);
          return '';
        });
      }
      ts.forEachChild(node, findReturn);
    }
    findReturn(sourceFile);

    const requiredFunctions = [
      'unsubscribeOpenRounds',
      'unsubscribeAllRounds',
      'unsubscribeProducts',
      'unsubscribeMasterFruits',
      'unsubscribeOrders',
      'unsubscribeAll',
      'cleanupStore'
    ];

    for (const fn of requiredFunctions) {
      assert.ok(
        returnedProps.includes(fn),
        `fruitStore return statement MUST include '${fn}'. Found properties: ${returnedProps.filter(p => p.includes('unsub') || p.includes('cleanup')).join(', ')}`
      );
    }
  });

  test('userStore.ts exports unsubscribeUsers and cleanupStore functions', () => {
    const { sourceFile } = parseTypeScriptFile('src/stores/userStore.ts');
    let returnedProps = [];

    function findReturn(node) {
      if (ts.isReturnStatement(node) && node.expression && ts.isObjectLiteralExpression(node.expression)) {
        returnedProps = node.expression.properties.map(p => {
          if (p.name) return p.name.getText(sourceFile);
          return '';
        });
      }
      ts.forEachChild(node, findReturn);
    }
    findReturn(sourceFile);

    assert.ok(
      returnedProps.includes('unsubscribeUsers'),
      'userStore return statement MUST export unsubscribeUsers'
    );
    assert.ok(
      returnedProps.includes('cleanupStore'),
      'userStore return statement MUST export cleanupStore'
    );
  });

  test('fruitStore.ts defines unsubscribeAll calling all 5 listener handles', () => {
    const { content, sourceFile } = parseTypeScriptFile('src/stores/fruitStore.ts');

    // Locate function unsubscribeAll
    let unsubscribeAllBody = '';
    function findUnsubscribeAll(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.getText(sourceFile) === 'unsubscribeAll') {
        unsubscribeAllBody = node.body ? node.body.getText(sourceFile) : '';
      }
      ts.forEachChild(node, findUnsubscribeAll);
    }
    findUnsubscribeAll(sourceFile);

    assert.ok(unsubscribeAllBody.length > 0, 'unsubscribeAll function declaration must exist');
    assert.ok(unsubscribeAllBody.includes('unsubscribeOpenRounds()'), 'unsubscribeAll must invoke unsubscribeOpenRounds()');
    assert.ok(unsubscribeAllBody.includes('unsubscribeAllRounds()'), 'unsubscribeAll must invoke unsubscribeAllRounds()');
    assert.ok(unsubscribeAllBody.includes('unsubscribeProducts()'), 'unsubscribeAll must invoke unsubscribeProducts()');
    assert.ok(unsubscribeAllBody.includes('unsubscribeMasterFruits()'), 'unsubscribeAll must invoke unsubscribeMasterFruits()');
    assert.ok(unsubscribeAllBody.includes('unsubscribeOrders()'), 'unsubscribeAll must invoke unsubscribeOrders()');
  });

  test('fruitStore.ts defines cleanupStore invoking unsubscribeAll()', () => {
    const { sourceFile } = parseTypeScriptFile('src/stores/fruitStore.ts');

    let cleanupStoreBody = '';
    function findCleanupStore(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.getText(sourceFile) === 'cleanupStore') {
        cleanupStoreBody = node.body ? node.body.getText(sourceFile) : '';
      }
      ts.forEachChild(node, findCleanupStore);
    }
    findCleanupStore(sourceFile);

    assert.ok(cleanupStoreBody.length > 0, 'cleanupStore function declaration must exist in fruitStore');
    assert.ok(cleanupStoreBody.includes('unsubscribeAll()'), 'cleanupStore must delegate to unsubscribeAll()');
  });

  test('fruitStore.ts logoutAdmin invokes cleanupStore and userStore.cleanupStore prior to signOut', () => {
    const { sourceFile } = parseTypeScriptFile('src/stores/fruitStore.ts');

    let logoutAdminBody = '';
    function findLogoutAdmin(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.getText(sourceFile) === 'logoutAdmin') {
        logoutAdminBody = node.body ? node.body.getText(sourceFile) : '';
      }
      ts.forEachChild(node, findLogoutAdmin);
    }
    findLogoutAdmin(sourceFile);

    assert.ok(logoutAdminBody.length > 0, 'logoutAdmin function declaration must exist');
    assert.ok(logoutAdminBody.includes('cleanupStore()'), 'logoutAdmin must invoke cleanupStore()');
    assert.ok(logoutAdminBody.includes('userStore.cleanupStore()'), 'logoutAdmin must invoke userStore.cleanupStore()');

    const cleanupIdx = logoutAdminBody.indexOf('cleanupStore()');
    const signOutIdx = logoutAdminBody.indexOf('signOut');
    assert.ok(cleanupIdx < signOutIdx, 'cleanupStore() must be called BEFORE signOut() to avoid permission errors');
  });

  test('subscription methods in fruitStore call corresponding unsubscription prior to onSnapshot', () => {
    const { content, sourceFile } = parseTypeScriptFile('src/stores/fruitStore.ts');

    const subscriptionChecks = [
      { name: 'subscribeToOpenRounds', expectedUnsub: 'unsubscribeOpenRounds()' },
      { name: 'subscribeToAllRounds', expectedUnsub: 'unsubscribeAllRounds()' },
      { name: 'subscribeToOrders', expectedUnsub: 'unsubscribeOrders()' },
      { name: 'subscribeToMasterFruits', expectedUnsub: 'unsubscribeMasterFruits()' }
    ];

    for (const check of subscriptionChecks) {
      let bodyText = '';
      function findFn(node) {
        if (ts.isFunctionDeclaration(node) && node.name?.getText(sourceFile) === check.name) {
          bodyText = node.body ? node.body.getText(sourceFile) : '';
        }
        ts.forEachChild(node, findFn);
      }
      findFn(sourceFile);

      assert.ok(bodyText.length > 0, `Function ${check.name} must exist`);
      assert.ok(
        bodyText.includes(check.expectedUnsub),
        `Function ${check.name} must call ${check.expectedUnsub} before attaching onSnapshot`
      );

      const unsubIndex = bodyText.indexOf(check.expectedUnsub);
      const onSnapshotIndex = bodyText.indexOf('onSnapshot');
      assert.ok(
        unsubIndex !== -1 && onSnapshotIndex !== -1 && unsubIndex < onSnapshotIndex,
        `In ${check.name}, ${check.expectedUnsub} must precede onSnapshot`
      );
    }
  });

  test('userStore.ts cleanupStore cleans listener and resets reactive users and currentAppUser', () => {
    const { sourceFile } = parseTypeScriptFile('src/stores/userStore.ts');

    let cleanupBody = '';
    function findCleanup(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.getText(sourceFile) === 'cleanupStore') {
        cleanupBody = node.body ? node.body.getText(sourceFile) : '';
      }
      ts.forEachChild(node, findCleanup);
    }
    findCleanup(sourceFile);

    assert.ok(cleanupBody.length > 0, 'cleanupStore must exist in userStore');
    assert.ok(cleanupBody.includes('unsubscribeUsers()'), 'cleanupStore must call unsubscribeUsers()');
    assert.ok(cleanupBody.includes('users.value = []'), 'cleanupStore must reset users.value to empty array');
    assert.ok(cleanupBody.includes('currentAppUser.value = null'), 'cleanupStore must reset currentAppUser.value to null');
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: Empirical Behavioral & Stress Testing of Unsubscription Mechanics
// ---------------------------------------------------------------------------
describe('Milestone 3 Suite 2: Empirical Behavioral & Stress Testing of Cleanup Logic', () => {

  /**
   * Factory creating a stateful listener manager mimicking fruitStore and userStore handles
   */
  function createTestListenerManager() {
    let openRoundsUnsub = null;
    let allRoundsUnsub = null;
    let productsUnsub = null;
    let masterFruitsUnsub = null;
    let ordersUnsub = null;
    let usersUnsub = null;

    let users = [];
    let currentAppUser = null;

    // Call counters for forensic auditing
    const callCounters = {
      openRounds: 0,
      allRounds: 0,
      products: 0,
      masterFruits: 0,
      orders: 0,
      users: 0
    };

    function unsubscribeOpenRounds() {
      if (openRoundsUnsub) {
        openRoundsUnsub();
        openRoundsUnsub = null;
      }
    }

    function unsubscribeAllRounds() {
      if (allRoundsUnsub) {
        allRoundsUnsub();
        allRoundsUnsub = null;
      }
    }

    function unsubscribeProducts() {
      if (productsUnsub) {
        productsUnsub();
        productsUnsub = null;
      }
    }

    function unsubscribeMasterFruits() {
      if (masterFruitsUnsub) {
        masterFruitsUnsub();
        masterFruitsUnsub = null;
      }
    }

    function unsubscribeOrders() {
      if (ordersUnsub) {
        ordersUnsub();
        ordersUnsub = null;
      }
    }

    function unsubscribeUsers() {
      if (usersUnsub) {
        usersUnsub();
        usersUnsub = null;
      }
    }

    function unsubscribeAll() {
      unsubscribeOpenRounds();
      unsubscribeAllRounds();
      unsubscribeProducts();
      unsubscribeMasterFruits();
      unsubscribeOrders();
    }

    function cleanupFruitStore() {
      unsubscribeAll();
    }

    function cleanupUserStore() {
      unsubscribeUsers();
      users = [];
      currentAppUser = null;
    }

    // Attach mock listeners
    function attachOpenRounds() {
      unsubscribeOpenRounds();
      openRoundsUnsub = () => { callCounters.openRounds++; };
    }

    function attachAllRounds() {
      unsubscribeAllRounds();
      allRoundsUnsub = () => { callCounters.allRounds++; };
    }

    function attachProducts() {
      unsubscribeProducts();
      productsUnsub = () => { callCounters.products++; };
    }

    function attachMasterFruits() {
      unsubscribeMasterFruits();
      masterFruitsUnsub = () => { callCounters.masterFruits++; };
    }

    function attachOrders() {
      unsubscribeOrders();
      ordersUnsub = () => { callCounters.orders++; };
    }

    function attachUsers() {
      unsubscribeUsers();
      usersUnsub = () => { callCounters.users++; };
      users = [{ uid: 'test', role: 'SELLER' }];
      currentAppUser = { uid: 'test', role: 'SELLER' };
    }

    return {
      callCounters,
      attachOpenRounds,
      attachAllRounds,
      attachProducts,
      attachMasterFruits,
      attachOrders,
      attachUsers,
      unsubscribeOpenRounds,
      unsubscribeAllRounds,
      unsubscribeProducts,
      unsubscribeMasterFruits,
      unsubscribeOrders,
      unsubscribeUsers,
      unsubscribeAll,
      cleanupFruitStore,
      cleanupUserStore,
      getHandles: () => ({
        openRoundsUnsub,
        allRoundsUnsub,
        productsUnsub,
        masterFruitsUnsub,
        ordersUnsub,
        usersUnsub
      }),
      getUserState: () => ({ users, currentAppUser })
    };
  }

  test('calling individual unsubscription functions when no listener is attached is a safe no-op', () => {
    const mgr = createTestListenerManager();

    // Verify initial null state
    const handles = mgr.getHandles();
    assert.equal(handles.openRoundsUnsub, null);
    assert.equal(handles.allRoundsUnsub, null);
    assert.equal(handles.productsUnsub, null);
    assert.equal(handles.masterFruitsUnsub, null);
    assert.equal(handles.ordersUnsub, null);
    assert.equal(handles.usersUnsub, null);

    // Call each unsubscription function on null handle
    assert.doesNotThrow(() => mgr.unsubscribeOpenRounds());
    assert.doesNotThrow(() => mgr.unsubscribeAllRounds());
    assert.doesNotThrow(() => mgr.unsubscribeProducts());
    assert.doesNotThrow(() => mgr.unsubscribeMasterFruits());
    assert.doesNotThrow(() => mgr.unsubscribeOrders());
    assert.doesNotThrow(() => mgr.unsubscribeUsers());
    assert.doesNotThrow(() => mgr.unsubscribeAll());

    // Verify zero calls executed
    assert.deepEqual(mgr.callCounters, {
      openRounds: 0,
      allRounds: 0,
      products: 0,
      masterFruits: 0,
      orders: 0,
      users: 0
    });
  });

  test('calling cleanupStore() multiple times in succession is safe and idempotent', () => {
    const mgr = createTestListenerManager();

    // Attach all listeners
    mgr.attachOpenRounds();
    mgr.attachAllRounds();
    mgr.attachProducts();
    mgr.attachMasterFruits();
    mgr.attachOrders();
    mgr.attachUsers();

    // First cleanup: all 6 should fire once
    mgr.cleanupFruitStore();
    mgr.cleanupUserStore();

    assert.equal(mgr.callCounters.openRounds, 1);
    assert.equal(mgr.callCounters.allRounds, 1);
    assert.equal(mgr.callCounters.products, 1);
    assert.equal(mgr.callCounters.masterFruits, 1);
    assert.equal(mgr.callCounters.orders, 1);
    assert.equal(mgr.callCounters.users, 1);
    assert.deepEqual(mgr.getUserState().users, []);
    assert.equal(mgr.getUserState().currentAppUser, null);

    // Repeated cleanups (stress test 20 consecutive invocations)
    for (let i = 0; i < 20; i++) {
      assert.doesNotThrow(() => mgr.cleanupFruitStore());
      assert.doesNotThrow(() => mgr.cleanupUserStore());
    }

    // Call counters must remain exactly 1 (no duplicate calls or errors)
    assert.equal(mgr.callCounters.openRounds, 1);
    assert.equal(mgr.callCounters.allRounds, 1);
    assert.equal(mgr.callCounters.products, 1);
    assert.equal(mgr.callCounters.masterFruits, 1);
    assert.equal(mgr.callCounters.orders, 1);
    assert.equal(mgr.callCounters.users, 1);
  });

  test('rapid subscription re-attachment cancels prior listener and avoids dangling leaks', () => {
    const mgr = createTestListenerManager();

    // Rapidly switch active round 10 times
    for (let i = 0; i < 10; i++) {
      mgr.attachOrders();
    }

    // Previous 9 listeners must have been cleaned up
    assert.equal(mgr.callCounters.orders, 9);

    // Clean up final 10th listener
    mgr.unsubscribeOrders();
    assert.equal(mgr.callCounters.orders, 10);
  });

  test('interleaved subscription and teardown preserves isolation', () => {
    const mgr = createTestListenerManager();

    mgr.attachOpenRounds();
    mgr.attachProducts();
    assert.equal(mgr.callCounters.openRounds, 0);
    assert.equal(mgr.callCounters.products, 0);

    // Unsubscribe open rounds only
    mgr.unsubscribeOpenRounds();
    assert.equal(mgr.callCounters.openRounds, 1);
    assert.equal(mgr.callCounters.products, 0);

    // Products listener is still active
    assert.ok(mgr.getHandles().productsUnsub !== null);

    // Teardown all
    mgr.unsubscribeAll();
    assert.equal(mgr.callCounters.openRounds, 1); // Not called again
    assert.equal(mgr.callCounters.products, 1);   // Now called
  });
});

// ---------------------------------------------------------------------------
// SUITE 3: AST / Source Scan of Vue Components (Layouts & Pages)
// ---------------------------------------------------------------------------
describe('Milestone 3 Suite 3: AST Verification of Vue Layouts & Pages', () => {

  test('src/layouts/MainLayout.vue has ZERO occurrences of subscribeToOrders', () => {
    const { content, scriptContent } = parseVueSfcFile('src/layouts/MainLayout.vue');

    assert.equal(
      content.includes('subscribeToOrders'),
      false,
      'MainLayout.vue MUST NOT contain any occurrence of subscribeToOrders (storefront read leak eliminated)'
    );
    assert.equal(
      scriptContent.includes('subscribeToOrders'),
      false,
      'MainLayout.vue script setup MUST NOT call subscribeToOrders'
    );
  });

  test('src/layouts/MainLayout.vue includes onBeforeUnmount with unsubscribeOpenRounds', () => {
    const { scriptContent, scriptAst } = parseVueSfcFile('src/layouts/MainLayout.vue');

    let onBeforeUnmountCalls = [];
    function findUnmount(node) {
      if (ts.isCallExpression(node) && node.expression.getText(scriptAst) === 'onBeforeUnmount') {
        onBeforeUnmountCalls.push(node.getText(scriptAst));
      }
      ts.forEachChild(node, findUnmount);
    }
    findUnmount(scriptAst);

    assert.equal(onBeforeUnmountCalls.length, 1, 'MainLayout.vue must have exactly one onBeforeUnmount call');
    assert.ok(
      onBeforeUnmountCalls[0].includes('unsubscribeOpenRounds'),
      'MainLayout.vue onBeforeUnmount must invoke fruitStore.unsubscribeOpenRounds()'
    );
  });

  test('src/layouts/MainLayout.vue does NOT pass orders prop to OrderLookupModal', () => {
    const { content } = parseVueSfcFile('src/layouts/MainLayout.vue');

    // Check OrderLookupModal template section
    const modalTagRegex = /<OrderLookupModal[\s\S]*?\/>/;
    const modalTagMatch = content.match(modalTagRegex);
    assert.ok(modalTagMatch, 'OrderLookupModal must exist in MainLayout template');

    const modalTagContent = modalTagMatch[0];
    assert.equal(
      modalTagContent.includes(':orders'),
      false,
      'OrderLookupModal in MainLayout MUST NOT bind :orders="fruitStore.orders" (prevents eager order reads)'
    );
  });

  test('src/layouts/AdminLayout.vue includes onBeforeUnmount and reactive auth watcher for listener lifecycle', () => {
    const { scriptContent, scriptAst } = parseVueSfcFile('src/layouts/AdminLayout.vue');

    let onBeforeUnmountCalls = [];
    let stopAdminSubFunction = '';
    let watchCalls = [];

    function visit(node) {
      if (ts.isCallExpression(node)) {
        const fnName = node.expression.getText(scriptAst);
        if (fnName === 'onBeforeUnmount') {
          onBeforeUnmountCalls.push(node.getText(scriptAst));
        } else if (fnName === 'watch') {
          watchCalls.push(node.getText(scriptAst));
        }
      }
      if (ts.isFunctionDeclaration(node) && node.name?.getText(scriptAst) === 'stopAdminSubscriptions') {
        stopAdminSubFunction = node.body ? node.body.getText(scriptAst) : '';
      }
      ts.forEachChild(node, visit);
    }
    visit(scriptAst);

    // Verify onBeforeUnmount
    assert.ok(onBeforeUnmountCalls.length >= 1, 'AdminLayout must declare onBeforeUnmount');
    assert.ok(
      onBeforeUnmountCalls[0].includes('stopAdminSubscriptions()'),
      'AdminLayout onBeforeUnmount must call stopAdminSubscriptions()'
    );

    // Verify stopAdminSubscriptions implementation
    assert.ok(stopAdminSubFunction.includes('fruitStore.unsubscribeAll()'), 'stopAdminSubscriptions must call fruitStore.unsubscribeAll()');
    assert.ok(stopAdminSubFunction.includes('userStore.cleanupStore()'), 'stopAdminSubscriptions must call userStore.cleanupStore()');

    // Verify watch implementation for immediate auth reaction
    assert.ok(
      watchCalls.some(w => w.includes('authUser') && w.includes('isAdmin') && w.includes('stopAdminSubscriptions')),
      'AdminLayout must watch authUser and isAdmin to stopAdminSubscriptions when unauthenticated'
    );
  });

  test('src/pages/admin/FruitsPage.vue includes onBeforeUnmount with unsubscribeMasterFruits', () => {
    const { scriptContent, scriptAst } = parseVueSfcFile('src/pages/admin/FruitsPage.vue');

    let onBeforeUnmountCalls = [];
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(scriptAst) === 'onBeforeUnmount') {
        onBeforeUnmountCalls.push(node.getText(scriptAst));
      }
      ts.forEachChild(node, visit);
    }
    visit(scriptAst);

    assert.ok(onBeforeUnmountCalls.length >= 1, 'FruitsPage.vue must declare onBeforeUnmount');
    assert.ok(
      onBeforeUnmountCalls[0].includes('fruitStore.unsubscribeMasterFruits()'),
      'FruitsPage.vue onBeforeUnmount must invoke fruitStore.unsubscribeMasterFruits()'
    );
  });

  test('src/pages/admin/RoundEditPage.vue includes onBeforeUnmount with unsubscribeMasterFruits', () => {
    const { scriptContent, scriptAst } = parseVueSfcFile('src/pages/admin/RoundEditPage.vue');

    let onBeforeUnmountCalls = [];
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(scriptAst) === 'onBeforeUnmount') {
        onBeforeUnmountCalls.push(node.getText(scriptAst));
      }
      ts.forEachChild(node, visit);
    }
    visit(scriptAst);

    assert.ok(onBeforeUnmountCalls.length >= 1, 'RoundEditPage.vue must declare onBeforeUnmount');
    assert.ok(
      onBeforeUnmountCalls[0].includes('fruitStore.unsubscribeMasterFruits()'),
      'RoundEditPage.vue onBeforeUnmount must invoke fruitStore.unsubscribeMasterFruits()'
    );
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: Adversarial Stress Scenarios & Edge Case Analysis
// ---------------------------------------------------------------------------
describe('Milestone 3 Suite 4: Adversarial Stress & Failure Mode Analysis', () => {

  test('Edge Case: calling subscribeToProducts with empty roundId should safely clean up or reset', () => {
    // In fruitStore.ts:
    // function subscribeToProducts(roundId: string) {
    //   if (!roundId) {
    //     products.value = [];
    //     return;
    //   }
    //   unsubscribeProducts();
    //   ...
    // Notice: If subscribeToProducts is called with empty roundId, does it leak the previous productsUnsub?
    // Let's test the behavior:
    let productsUnsub = null;
    let unsubCalled = false;

    function unsubscribeProducts() {
      if (productsUnsub) {
        productsUnsub();
        productsUnsub = null;
      }
    }

    // Vulnerable pattern (early return without unsubscribe):
    function vulnerableSubscribeToProducts(roundId) {
      if (!roundId) {
        return;
      }
      unsubscribeProducts();
      productsUnsub = () => { unsubCalled = true; };
    }

    // Attach listener for round 1
    vulnerableSubscribeToProducts('round-1');
    assert.ok(productsUnsub !== null, 'Listener attached for round 1');

    // Call with empty string
    vulnerableSubscribeToProducts('');
    // Notice that productsUnsub is STILL NOT NULL!
    const leaked = productsUnsub !== null;
    assert.equal(leaked, true, 'Confirmed vulnerability: early return without unsub leaves listener active');

    // Correct pattern (unsub before or on early return):
    function robustSubscribeToProducts(roundId) {
      unsubscribeProducts();
      if (!roundId) {
        return;
      }
      productsUnsub = () => { unsubCalled = true; };
    }

    // Now test robust pattern
    robustSubscribeToProducts('round-2');
    assert.ok(productsUnsub !== null);
    robustSubscribeToProducts('');
    assert.equal(productsUnsub, null, 'Robust pattern safely cleans listener on empty roundId');
  });

  test('Storefront Lifecycle Invariant: MainLayout unmount leaves products listener dangling unless cleanupStore/unsubscribeAll is called', () => {
    // In MainLayout.vue:
    // onMounted: subscribeToActiveRound() -> auto-selects first round -> subscribeToProducts(firstRoundId)
    // onBeforeUnmount: fruitStore.unsubscribeOpenRounds()
    let openRoundsUnsub = () => {};
    let productsUnsub = () => {};

    // Simulate MainLayout.onBeforeUnmount
    function mainLayoutUnmount() {
      if (openRoundsUnsub) {
        openRoundsUnsub();
        openRoundsUnsub = null;
      }
    }

    mainLayoutUnmount();

    assert.equal(openRoundsUnsub, null, 'openRounds listener is cleaned up');
    assert.notEqual(productsUnsub, null, 'Observation: productsUnsub remains active unless unsubscribeAll/cleanupStore is invoked');
  });
});
