// tests/unit/router_guard.test.mjs
// Empirical test harness for Route Guards (Feature 4)
import { test, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRouter, createMemoryHistory } from 'vue-router';

// 1. Whitelist definition from src/types/fruit_app.ts
const ADMIN_WHITELIST_EMAILS = [
  'wittinunt.k@gmail.com',
  'natyabuyna089@gmail.com',
  'kwancanoe@gmail.com'
];

// 2. Exact route configuration mirrored from src/router/routes.ts
const routes = [
  // Customer Pre-order Flow
  {
    path: '/',
    component: { template: '<div>MainLayout</div>' },
    children: [
      { path: '', name: 'customer-home', component: { template: '<div>Index</div>' } },
      { path: 'orders/:orderId', name: 'customer-order-detail', component: { template: '<div>Order</div>' } },
    ],
  },

  // Admin Dedicated Layout & Full Sub-Pages
  {
    path: '/admin',
    component: { template: '<div>AdminLayout</div>' },
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'admin-dispatch', component: { template: '<div>Dispatch</div>' } },
      { path: 'rounds', name: 'admin-rounds', component: { template: '<div>Rounds</div>' } },
      { path: 'rounds/new', name: 'admin-round-new', component: { template: '<div>RoundNew</div>' } },
      { path: 'rounds/:roundId/edit', name: 'admin-round-edit', component: { template: '<div>RoundEdit</div>' } },
      { path: 'orders/:orderId', name: 'admin-order-detail', component: { template: '<div>OrderDetail</div>' } },
      { path: 'scan', name: 'admin-scan', component: { template: '<div>QrScanner</div>' } },
      {
        path: 'analytics',
        name: 'admin-analytics',
        component: { template: '<div>Analytics</div>' },
        meta: { disallowedRoles: ['SELLER'] }
      },
      {
        path: 'fruits',
        name: 'admin-fruits',
        component: { template: '<div>Fruits</div>' },
        meta: { disallowedRoles: ['SELLER'] }
      },
      {
        path: 'users',
        name: 'admin-users',
        component: { template: '<div>Users</div>' },
        meta: { disallowedRoles: ['SELLER'] }
      }
    ]
  },

  // 404 Catch-all
  {
    path: '/:catchAll(.*)*',
    component: { template: '<div>NotFound</div>' },
  },
];

// 3. Exact Navigation Guard implementation mirrored from src/router/index.ts:39-94
function createNavigationGuard({ auth, userStore, Notify }) {
  return async (to, _from) => {
    const isAdminRoute = to.matched.some(record => record.meta.requiresAuth) || to.path.startsWith('/admin');
    if (!isAdminRoute) {
      return true;
    }

    // 1. Wait for Firebase Auth state to be ready from IndexedDB persistence
    await auth.authStateReady();
    const currentUser = auth.currentUser;

    // 2. Unauthenticated access handling:
    // Allow direct access to '/admin' (login gate), but redirect all deep sub-routes (/admin/*) to '/admin'
    if (!currentUser) {
      if (to.path !== '/admin') {
        return { path: '/admin' };
      }
      return true;
    }

    // 3. Resolve user profile in Pinia store
    if (!userStore.currentAppUser && currentUser.email) {
      await userStore.bindAuthUser(currentUser.email, currentUser.uid);
    }

    // 4. Staff verification (Whitelist or active in users collection)
    const email = currentUser.email?.toLowerCase() || '';
    const isAuthorizedStaff = ADMIN_WHITELIST_EMAILS.includes(email) || !!userStore.currentAppUser?.isActive;
    if (!isAuthorizedStaff) {
      if (to.path !== '/admin') {
        return { path: '/admin' };
      }
      return true;
    }

    // 5. Seller role restrictions: block /admin/analytics, /admin/fruits, /admin/users
    const userRole = userStore.currentUserRole || (ADMIN_WHITELIST_EMAILS.includes(email) ? 'SYSTEM_ADMIN' : 'SELLER');
    const isSeller = userRole === 'SELLER';

    const isRestrictedForSeller =
      to.matched.some(record => record.meta.disallowedRoles?.includes('SELLER')) ||
      ['/admin/analytics', '/admin/fruits', '/admin/users'].some(prefix => to.path.startsWith(prefix));

    if (isSeller && isRestrictedForSeller) {
      Notify.create({
        type: 'warning',
        message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะเจ้าของร้านหรือผู้ดูแลระบบ)',
        position: 'top',
        timeout: 2500
      });
      return { path: '/admin' };
    }

    return true;
  };
}

describe('Feature 4: Router Guard Empirical Test Suite', () => {
  let notifications = [];
  const mockNotify = {
    create: (payload) => {
      notifications.push(payload);
    }
  };

  function setupRouter(userContext) {
    notifications = [];
    const mockAuth = {
      currentUser: userContext.currentUser || null,
      authStateReady: async () => true
    };

    const mockUserStore = {
      currentAppUser: userContext.appUser || null,
      currentUserRole: userContext.appUser?.role || null,
      bindAuthUser: async (email, uid) => {
        if (userContext.appUser) {
          mockUserStore.currentAppUser = userContext.appUser;
          mockUserStore.currentUserRole = userContext.appUser.role;
        }
      }
    };

    const router = createRouter({
      history: createMemoryHistory(),
      routes
    });

    const guard = createNavigationGuard({
      auth: mockAuth,
      userStore: mockUserStore,
      Notify: mockNotify
    });

    router.beforeEach(guard);
    return { router, mockNotify };
  }

  // User context fixtures
  const UNATHENTICATED = {
    currentUser: null,
    appUser: null
  };

  const NON_STAFF_AUTH = {
    currentUser: { email: 'customer_somying@gmail.com', uid: 'cust-101' },
    appUser: null // Not in staff collection
  };

  const INACTIVE_STAFF = {
    currentUser: { email: 'fired_seller@fruitdrop.local', uid: 'sell-000' },
    appUser: { email: 'fired_seller@fruitdrop.local', role: 'SELLER', isActive: false }
  };

  const SELLER_STAFF = {
    currentUser: { email: 'seller_somchai@fruitdrop.local', uid: 'sell-001' },
    appUser: { email: 'seller_somchai@fruitdrop.local', role: 'SELLER', isActive: true }
  };

  const SHOP_OWNER = {
    currentUser: { email: 'natyabuyna089@gmail.com', uid: 'owner-001' },
    appUser: { email: 'natyabuyna089@gmail.com', role: 'SHOP_OWNER', isActive: true }
  };

  const SYSTEM_ADMIN = {
    currentUser: { email: 'wittinunt.k@gmail.com', uid: 'admin-001' },
    appUser: { email: 'wittinunt.k@gmail.com', role: 'SYSTEM_ADMIN', isActive: true }
  };

  describe('1. Unauthenticated User Behavior', () => {
    it('allows public customer home (/)', async () => {
      const { router } = setupRouter(UNATHENTICATED);
      await router.push('/');
      assert.equal(router.currentRoute.value.path, '/');
    });

    it('allows public customer order detail (/orders/123)', async () => {
      const { router } = setupRouter(UNATHENTICATED);
      await router.push('/orders/123');
      assert.equal(router.currentRoute.value.path, '/orders/123');
    });

    it('allows direct access to /admin login gate', async () => {
      const { router } = setupRouter(UNATHENTICATED);
      await router.push('/admin');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('redirects /admin/rounds to /admin', async () => {
      const { router } = setupRouter(UNATHENTICATED);
      await router.push('/admin/rounds');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('redirects /admin/analytics to /admin', async () => {
      const { router } = setupRouter(UNATHENTICATED);
      await router.push('/admin/analytics');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('redirects /admin/fruits to /admin', async () => {
      const { router } = setupRouter(UNATHENTICATED);
      await router.push('/admin/fruits');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('redirects /admin/users to /admin', async () => {
      const { router } = setupRouter(UNATHENTICATED);
      await router.push('/admin/users');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('redirects nested /admin/rounds/new to /admin', async () => {
      const { router } = setupRouter(UNATHENTICATED);
      await router.push('/admin/rounds/new');
      assert.equal(router.currentRoute.value.path, '/admin');
    });
  });

  describe('2. Authenticated Non-Staff User Behavior', () => {
    it('allows public customer home (/)', async () => {
      const { router } = setupRouter(NON_STAFF_AUTH);
      await router.push('/');
      assert.equal(router.currentRoute.value.path, '/');
    });

    it('allows customer order detail (/orders/123)', async () => {
      const { router } = setupRouter(NON_STAFF_AUTH);
      await router.push('/orders/123');
      assert.equal(router.currentRoute.value.path, '/orders/123');
    });

    it('allows /admin (login gate / unauthorized gate message)', async () => {
      const { router } = setupRouter(NON_STAFF_AUTH);
      await router.push('/admin');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('redirects non-staff from /admin/rounds to /admin', async () => {
      const { router } = setupRouter(NON_STAFF_AUTH);
      await router.push('/admin/rounds');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('redirects non-staff from /admin/analytics to /admin', async () => {
      const { router } = setupRouter(NON_STAFF_AUTH);
      await router.push('/admin/analytics');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('redirects non-staff from /admin/fruits to /admin', async () => {
      const { router } = setupRouter(NON_STAFF_AUTH);
      await router.push('/admin/fruits');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('redirects non-staff from /admin/users to /admin', async () => {
      const { router } = setupRouter(NON_STAFF_AUTH);
      await router.push('/admin/users');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('redirects inactive staff from /admin/rounds to /admin', async () => {
      const { router } = setupRouter(INACTIVE_STAFF);
      await router.push('/admin/rounds');
      assert.equal(router.currentRoute.value.path, '/admin');
    });
  });

  describe('3. Authenticated SELLER User Behavior', () => {
    it('allows /admin (tailgate dispatch desk)', async () => {
      const { router } = setupRouter(SELLER_STAFF);
      await router.push('/admin');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('allows /admin/rounds (view rounds)', async () => {
      const { router } = setupRouter(SELLER_STAFF);
      await router.push('/admin/rounds');
      assert.equal(router.currentRoute.value.path, '/admin/rounds');
    });

    it('allows /admin/orders/123 (tailgate order fulfillment)', async () => {
      const { router } = setupRouter(SELLER_STAFF);
      await router.push('/admin/orders/123');
      assert.equal(router.currentRoute.value.path, '/admin/orders/123');
    });

    it('allows /admin/scan (QR scanner)', async () => {
      const { router } = setupRouter(SELLER_STAFF);
      await router.push('/admin/scan');
      assert.equal(router.currentRoute.value.path, '/admin/scan');
    });

    it('BLOCKS /admin/analytics and redirects to /admin with warning notification', async () => {
      const { router } = setupRouter(SELLER_STAFF);
      await router.push('/admin/analytics');
      assert.equal(router.currentRoute.value.path, '/admin');
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].type, 'warning');
      assert.match(notifications[0].message, /คุณไม่มีสิทธิ์เข้าถึงหน้านี้/);
    });

    it('BLOCKS /admin/fruits and redirects to /admin with warning notification', async () => {
      const { router } = setupRouter(SELLER_STAFF);
      await router.push('/admin/fruits');
      assert.equal(router.currentRoute.value.path, '/admin');
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].type, 'warning');
    });

    it('BLOCKS /admin/users and redirects to /admin with warning notification', async () => {
      const { router } = setupRouter(SELLER_STAFF);
      await router.push('/admin/users');
      assert.equal(router.currentRoute.value.path, '/admin');
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].type, 'warning');
    });
  });

  describe('4. Authenticated SYSTEM_ADMIN User Behavior', () => {
    it('allows /admin', async () => {
      const { router } = setupRouter(SYSTEM_ADMIN);
      await router.push('/admin');
      assert.equal(router.currentRoute.value.path, '/admin');
    });

    it('allows /admin/rounds', async () => {
      const { router } = setupRouter(SYSTEM_ADMIN);
      await router.push('/admin/rounds');
      assert.equal(router.currentRoute.value.path, '/admin/rounds');
    });

    it('allows /admin/analytics', async () => {
      const { router } = setupRouter(SYSTEM_ADMIN);
      await router.push('/admin/analytics');
      assert.equal(router.currentRoute.value.path, '/admin/analytics');
      assert.equal(notifications.length, 0);
    });

    it('allows /admin/fruits', async () => {
      const { router } = setupRouter(SYSTEM_ADMIN);
      await router.push('/admin/fruits');
      assert.equal(router.currentRoute.value.path, '/admin/fruits');
      assert.equal(notifications.length, 0);
    });

    it('allows /admin/users', async () => {
      const { router } = setupRouter(SYSTEM_ADMIN);
      await router.push('/admin/users');
      assert.equal(router.currentRoute.value.path, '/admin/users');
      assert.equal(notifications.length, 0);
    });
  });

  describe('5. Authenticated SHOP_OWNER User Behavior', () => {
    it('allows /admin/analytics for Shop Owner', async () => {
      const { router } = setupRouter(SHOP_OWNER);
      await router.push('/admin/analytics');
      assert.equal(router.currentRoute.value.path, '/admin/analytics');
    });

    it('allows /admin/fruits for Shop Owner', async () => {
      const { router } = setupRouter(SHOP_OWNER);
      await router.push('/admin/fruits');
      assert.equal(router.currentRoute.value.path, '/admin/fruits');
    });

    it('allows /admin/users for Shop Owner', async () => {
      const { router } = setupRouter(SHOP_OWNER);
      await router.push('/admin/users');
      assert.equal(router.currentRoute.value.path, '/admin/users');
    });
  });
});
