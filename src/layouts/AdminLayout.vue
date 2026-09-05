<template>
  <!-- Section: Admin Layout & Authentication Gate -->
  <q-layout id="admin-layout" data-audit-id="admin-layout" view="hHh lpR fFf" class="bg-grey-10 text-white" style="min-height: 100vh;">
    <!-- 1. Authenticated Top Navigation Header -->
    <q-header v-if="fruitStore.authUser && fruitStore.isAdmin" elevated class="bg-grey-9 text-white">
      <q-toolbar class="q-px-md">
        <!-- Brand Identity -->
        <q-avatar size="36px" class="q-mr-sm">
          <q-img src="/mascots/logo_fruit_drop.png" fit="contain" />
        </q-avatar>
        <q-toolbar-title class="text-subtitle1 text-weight-bolder">
          Fruit Drop <span class="text-caption text-positive text-weight-bold">แอดมิน</span>
        </q-toolbar-title>

        <!-- User Profile Chip & Role Badge -->
        <q-chip dense color="grey-8" text-color="white" class="q-mr-xs">
          <q-avatar icon="person" color="primary" text-color="white" />
          <span class="text-caption ellipsis" style="max-width: 100px;">
            {{ userStore.currentAppUser?.displayName || fruitStore.authUser.displayName || fruitStore.authUser.email }}
          </span>
          <q-badge
            :color="userStore.isSystemAdmin ? 'purple-9' : userStore.isShopOwner ? 'positive' : 'warning'"
            class="q-ml-xs text-weight-bolder"
            style="font-size: 10px;"
            rounded
          >
            {{ userStore.isSystemAdmin ? 'Admin' : userStore.isShopOwner ? 'Owner' : 'Seller' }}
          </q-badge>
        </q-chip>

        <!-- Logout Action Button -->
        <q-btn
          flat
          dense
          round
          icon="logout"
          color="negative"
          size="sm"
          @click="handleLogout"
        >
          <q-tooltip>ออกจากระบบ</q-tooltip>
        </q-btn>
      </q-toolbar>

      <!-- Sub-Navigation Route Tabs -->
      <q-tabs
        dense
        align="center"
        indicator-color="positive"
        active-color="positive"
        class="bg-grey-10 text-grey-4"
        narrow-indicator
      >
        <q-route-tab
          to="/admin"
          exact
          icon="directions_car"
          label="ท้ายรถ"
          no-caps
          data-audit-id="tab-admin-dispatch"
        />
        <q-route-tab
          to="/admin/rounds"
          icon="event_note"
          label="รอบส่ง"
          no-caps
          data-audit-id="tab-admin-rounds"
        />
        <q-route-tab
          to="/admin/analytics"
          icon="query_stats"
          label="กำไร-ขาดทุน"
          no-caps
          data-audit-id="tab-admin-analytics"
        />
        <q-route-tab
          to="/admin/harvest"
          icon="content_paste"
          label="ยอดเก็บ"
          no-caps
          data-audit-id="tab-admin-harvest"
        />
        <q-route-tab
          v-if="userStore.canManageUsers"
          to="/admin/users"
          icon="group"
          label="ทีมงาน"
          no-caps
          data-audit-id="tab-admin-users"
        />
      </q-tabs>
    </q-header>

    <!-- 2. Main Page Container / Auth Gate -->
    <q-page-container>
      <!-- Unauthenticated State: Login Gate -->
      <div v-if="!fruitStore.authUser" class="row justify-center items-center q-pa-md" style="min-height: 80vh;">
        <q-card class="bg-grey-9 text-white q-pa-lg rounded-borders text-center shadow-4" style="max-width: 420px; width: 100%;">
          <q-avatar size="96px" class="q-mb-md">
            <q-img src="/mascots/logo_fruit_drop.png" fit="contain" />
          </q-avatar>
          <div class="text-h6 text-weight-bolder q-mb-xs">
            ระบบแอดมิน Fruit Drop
          </div>
          <div class="text-caption text-grey-4 q-mb-lg">
            เข้าสู่ระบบเพื่อจัดการรอบจอง โต๊ะท้ายรถ และดูผลประกอบการ
          </div>

          <GoogleSignInButton
            theme="light"
            shape="pill"
            label="เข้าสู่ระบบด้วย Google"
            :loading="fruitStore.isLoading"
            @click="handleLogin"
          />
        </q-card>
      </div>

      <!-- Unauthorized State: Account not in system -->
      <div v-else-if="!fruitStore.isAdmin" class="row justify-center items-center q-pa-md" style="min-height: 80vh;">
        <q-card class="bg-grey-9 text-white q-pa-lg rounded-borders text-center shadow-4" style="max-width: 440px; width: 100%;">
          <q-icon name="gpp_bad" color="negative" size="64px" class="q-mb-sm" />
          <div class="text-h6 text-weight-bolder text-negative q-mb-xs">
            ไม่มีสิทธิ์เข้าใช้งานระบบ
          </div>
          <div class="text-body2 text-grey-3 q-mb-xs">
            บัญชี: <strong>{{ fruitStore.authUser.email }}</strong>
          </div>
          <div class="text-caption text-grey-4 q-mb-lg">
            อีเมลนี้ไม่ได้รับสิทธิ์เข้าใช้งานโต๊ะแอดมิน กรุณาติดต่อผู้ดูแลระบบเพื่อขอเพิ่มสิทธิ์
          </div>

          <q-btn
            outline
            color="white"
            class="full-width q-py-xs text-weight-bold"
            icon="logout"
            label="ออกจากระบบ (Logout)"
            no-caps
            rounded
            @click="handleLogout"
          />
        </q-card>
      </div>

      <!-- Authorized State: Render Sub-Page -->
      <router-view v-else />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// Admin parent layout script managing authentication state and route navigation
import { onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import { useUserStore } from '@/stores/userStore';
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

onMounted(() => {
  fruitStore.subscribeToAllRounds();
  fruitStore.subscribeToOrders(fruitStore.activeRoundId);
  userStore.subscribeUsers();
});
</script>
