<template>
  <!-- Section: Admin Layout & Authentication Gate (Light Theme & Fixed Bottom Navigation) -->
  <q-layout id="admin-layout" data-audit-id="admin-layout" view="hHh lpR fFf" class="bg-grey-1 text-grey-9" style="min-height: 100vh;">
    <!-- 1. Authenticated Top App Header -->
    <q-header v-if="fruitStore.authUser && fruitStore.isAdmin" elevated class="bg-white text-grey-9 shadow-1">
      <q-toolbar class="q-px-md" style="max-width: 680px; margin: 0 auto;">
        <!-- Brand Identity: Clickable to Customer Storefront -->
        <div
          class="row items-center no-wrap cursor-pointer q-mr-auto"
          data-audit-id="btn-logo-nav-to-storefront"
          @click="$router.push('/')"
        >
          <q-avatar size="30px" class="q-mr-xs">
            <q-img src="/mascots/logo_fruit_drop.png" fit="contain" />
          </q-avatar>
          <span class="text-subtitle1 text-weight-bolder text-grey-9">Fruit Drop</span>
          <q-tooltip anchor="bottom middle" self="top middle">แตะเพื่อไปยังหน้าร้าน</q-tooltip>
        </div>

        <!-- User Role Badge & Name (Minimal & uncluttered) -->
        <div class="row items-center no-wrap q-mr-sm text-caption text-grey-8">
          <span class="text-weight-medium ellipsis" style="max-width: 110px;">
            {{ userStore.currentAppUser?.displayName || fruitStore.authUser.displayName || fruitStore.authUser.email }}
          </span>
          <q-badge
            :color="getRoleColor(userStore.currentUserRole)"
            class="q-ml-xs text-weight-bolder"
            rounded
          >
            {{ getRoleShortLabel(userStore.currentUserRole) }}
          </q-badge>
        </div>

        <!-- Logout Action Button -->
        <q-btn
          flat
          dense
          round
          icon="logout"
          color="negative"
          size="sm"
          data-audit-id="btn-admin-logout"
          @click="handleLogout"
        >
          <q-tooltip>ออกจากระบบ</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- 2. Main Page Container / Auth Gate -->
    <q-page-container>
      <!-- Unauthenticated State: Login Gate -->
      <div v-if="!fruitStore.authUser" class="row justify-center items-center q-pa-md" style="min-height: 80vh;">
        <q-card class="bg-white text-grey-9 q-pa-lg rounded-borders text-center shadow-3" style="max-width: 420px; width: 100%;">
          <q-avatar size="96px" class="q-mb-md">
            <q-img src="/mascots/logo_fruit_drop.png" fit="contain" />
          </q-avatar>
          <div class="text-h6 text-weight-bolder q-mb-xs text-grey-9">
            ระบบแอดมิน Fruit Drop
          </div>
          <div class="text-caption text-grey-7 q-mb-lg">
            เข้าสู่ระบบเพื่อจัดการรอบจอง โต๊ะท้ายรถ และดูผลประกอบการ
          </div>

          <div class="q-mb-md">
            <GoogleSignInButton
              theme="light"
              shape="pill"
              label="เข้าสู่ระบบด้วย Google"
              :loading="fruitStore.isLoading"
              @click="handleLogin"
            />
          </div>

          <q-separator color="grey-3" class="q-my-md" />

          <!-- Return to Customer Storefront Link -->
          <q-btn
            flat
            no-caps
            color="primary"
            icon="storefront"
            label="กลับไปหน้าสั่งจองผลไม้ (ลูกค้า)"
            to="/"
            class="text-weight-bold"
          />
        </q-card>
      </div>

      <!-- Unauthorized State: Account not in system -->
      <div v-else-if="!fruitStore.isAdmin" class="row justify-center items-center q-pa-md" style="min-height: 80vh;">
        <q-card class="bg-white text-grey-9 q-pa-lg rounded-borders text-center shadow-3" style="max-width: 440px; width: 100%;">
          <q-icon name="gpp_bad" color="negative" size="64px" class="q-mb-sm" />
          <div class="text-h6 text-weight-bolder text-negative q-mb-xs">
            ไม่มีสิทธิ์เข้าใช้งานระบบ
          </div>
          <div class="text-body2 text-grey-8 q-mb-xs">
            บัญชี: <strong>{{ fruitStore.authUser.email }}</strong>
          </div>
          <div class="text-caption text-grey-7 q-mb-lg">
            อีเมลนี้ไม่ได้รับสิทธิ์เข้าใช้งาน โปรดติดต่อผู้ดูแลระบบเพื่อขอเพิ่มสิทธิ์
          </div>

          <div class="row justify-center">
            <q-btn
              outline
              color="negative"
              class="q-mr-sm q-px-md text-weight-bold"
              icon="logout"
              label="ออกจากระบบ"
              no-caps
              rounded
              @click="handleLogout"
            />
            <q-btn
              color="primary"
              class="q-px-md text-weight-bold"
              icon="storefront"
              label="ย้อนกลับ"
              no-caps
              rounded
              to="/"
            />
          </div>
        </q-card>
      </div>

      <!-- Authorized State: Render Sub-Page -->
      <router-view v-else />
    </q-page-container>

    <!-- 3. Fixed Bottom Navigation Footer (AppSheet Style) -->
    <q-footer
      v-if="fruitStore.authUser && fruitStore.isAdmin"
      elevated
      class="bg-white text-grey-8 shadow-up-2"
      data-audit-id="admin-bottom-nav-footer"
    >
      <q-tabs
        dense
        align="justify"
        indicator-color="positive"
        active-color="positive"
        class="text-grey-7"
        no-caps
        style="max-width: 680px; margin: 0 auto;"
      >
        <q-route-tab
          to="/admin"
          exact
          icon="directions_car"
          label="ท้ายรถ"
          data-audit-id="tab-admin-dispatch"
        />
        <q-route-tab
          v-if="userStore.isSystemAdmin || userStore.isShopOwner"
          to="/admin/rounds"
          icon="event_note"
          label="รอบส่ง"
          data-audit-id="tab-admin-rounds"
        />
        <q-route-tab
          v-if="userStore.isSystemAdmin || userStore.isShopOwner"
          to="/admin/analytics"
          icon="query_stats"
          label="กำไร-ขาดทุน"
          data-audit-id="tab-admin-analytics"
        />
        <q-route-tab
          v-if="userStore.canManageUsers"
          to="/admin/users"
          icon="group"
          label="ทีมงาน"
          data-audit-id="tab-admin-users"
        />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
// Admin parent layout script managing light theme, authentication state, and AppSheet-style fixed bottom navigation
import { onMounted, onBeforeUnmount, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import { useUserStore } from '@/stores/userStore';
import { getRoleShortLabel, getRoleColor } from '@/utils/roles';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';

const $q = useQuasar();
const fruitStore = useFruitStore();
const userStore = useUserStore();

// Login handler
async function handleLogin() {
  try {
    await fruitStore.loginAdmin();
    $q.notify({ type: 'positive', message: 'เข้าสู่ระบบสำเร็จ' });
  } catch (err) {
    $q.notify({ type: 'negative', message: 'ไม่สามารถเข้าสู่ระบบได้' });
  }
}

// Logout handler
async function handleLogout() {
  await fruitStore.logoutAdmin();
  $q.notify({ type: 'info', message: 'ออกจากระบบแล้ว' });
}

// Start admin subscriptions only when authenticated as admin
function startAdminSubscriptions() {
  if (fruitStore.authUser && fruitStore.isAdmin) {
    fruitStore.subscribeToAllRounds();
    fruitStore.subscribeToOrders(fruitStore.activeRoundId);
    userStore.subscribeUsers();
  }
}

// Tear down all admin subscriptions and reset store caches
function stopAdminSubscriptions() {
  fruitStore.unsubscribeAll();
  userStore.cleanupStore();
}

// Watch authentication status so subscriptions start immediately on login and stop on logout
watch(
  [() => fruitStore.authUser, () => fruitStore.isAdmin],
  ([user, admin]) => {
    if (user && admin) {
      startAdminSubscriptions();
    } else {
      stopAdminSubscriptions();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stopAdminSubscriptions();
});
</script>
