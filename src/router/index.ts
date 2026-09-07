import { defineRouter } from '#q-app';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import { Notify } from 'quasar';
import { auth } from '@/boot/firebase';
import { useUserStore } from '@/stores/userStore';
import { ADMIN_WHITELIST_EMAILS } from '@/types/fruit_app';

import routes from './routes';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : (import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE)
  });

  // Global Auth & Role Navigation Guard
  Router.beforeEach(async (to, _from) => {
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
    const userStore = useUserStore();
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
      to.matched.some(record => (record.meta.disallowedRoles as string[] | undefined)?.includes('SELLER')) ||
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
  });

  return Router;
});
