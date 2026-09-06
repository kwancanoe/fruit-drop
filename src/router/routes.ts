import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  // Customer Pre-order Flow
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'customer-home', component: () => import('@/pages/IndexPage.vue') },
      { path: 'orders/:orderId', name: 'customer-order-detail', component: () => import('@/pages/customer/OrderDetailPage.vue') },
    ],
  },

  // Admin Dedicated Layout & Full Sub-Pages
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    children: [
      { path: '', name: 'admin-dispatch', component: () => import('@/pages/admin/DispatchPage.vue') },
      { path: 'rounds', name: 'admin-rounds', component: () => import('@/pages/admin/RoundsPage.vue') },
      { path: 'rounds/new', name: 'admin-round-new', component: () => import('@/pages/admin/RoundEditPage.vue') },
      { path: 'rounds/:roundId/edit', name: 'admin-round-edit', component: () => import('@/pages/admin/RoundEditPage.vue') },
      { path: 'orders/:orderId', name: 'admin-order-detail', component: () => import('@/pages/admin/OrderDetailPage.vue') },
      { path: 'scan', name: 'admin-scan', component: () => import('@/pages/admin/QrScannerPage.vue') },
      { path: 'analytics', name: 'admin-analytics', component: () => import('@/pages/admin/AnalyticsPage.vue') },
      { path: 'fruits', name: 'admin-fruits', component: () => import('@/pages/admin/FruitsPage.vue') },
      { path: 'users', name: 'admin-users', component: () => import('@/pages/admin/UsersPage.vue') }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
];

export default routes;
