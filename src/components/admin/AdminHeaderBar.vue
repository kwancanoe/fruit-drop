<template>
  <!-- Section: Admin High-Contrast Night Toolbar & Real-Time Logistics Stats -->
  <div id="admin-header-bar" data-audit-id="admin-header-bar" class="bg-dark text-white q-pa-sm rounded-borders q-mb-md shadow-2">
    <!-- Top Row: Identity and Auth -->
    <div class="row items-center justify-between q-pa-xs">
      <div class="row items-center">
        <q-avatar size="38px" class="q-mr-sm">
          <q-img src="/mascots/logo_fruit_drop.png" fit="contain" />
        </q-avatar>
        <div>
          <div class="text-subtitle1 text-weight-bolder leading-tight">
            โต๊ะจ่ายของท้ายรถ
          </div>
        </div>
      </div>

      <!-- Auth and Action Buttons -->
      <div class="row items-center">
        <!-- Round Management Button (Visible to System Admin & Shop Owner) -->
        <q-btn
          v-if="userStore.canManageUsers"
          outline
          dense
          no-caps
          color="positive"
          icon="event_note"
          label="จัดการรอบจอง"
          class="q-mr-sm q-px-sm"
          size="sm"
          @click="$emit('open-round-management')"
        />

        <!-- User Management Button (Visible only to System Admin & Shop Owner) -->
        <q-btn
          v-if="userStore.canManageUsers"
          outline
          dense
          no-caps
          color="info"
          icon="group"
          label="จัดการผู้ใช้"
          class="q-mr-sm q-px-sm"
          size="sm"
          @click="$emit('open-user-management')"
        />

        <q-btn
          outline
          dense
          no-caps
          color="accent"
          icon="content_paste"
          label="สรุปยอดผลไม้"
          class="q-mr-sm q-px-sm"
          size="sm"
          @click="$emit('open-harvest-summary')"
        />

        <template v-if="authUser">
          <q-chip dense color="grey-8" text-color="white" class="q-mr-xs">
            <q-avatar icon="person" color="primary" text-color="white" />
            <span class="text-caption ellipsis" style="max-width: 110px;">{{ userStore.currentAppUser?.displayName || authUser.displayName || authUser.email }}</span>
            <q-badge
              :color="userStore.isSystemAdmin ? 'purple-9' : userStore.isShopOwner ? 'positive' : 'warning'"
              class="q-ml-xs text-weight-bolder"
              style="font-size: 10px;"
              rounded
            >
              {{ userStore.isSystemAdmin ? 'Admin' : userStore.isShopOwner ? 'Owner' : 'Seller' }}
            </q-badge>
          </q-chip>
          <q-btn
            flat
            dense
            round
            icon="logout"
            color="negative"
            size="sm"
            @click="$emit('logout')"
          >
            <q-tooltip>ออกจากระบบ</q-tooltip>
          </q-btn>
        </template>
        <template v-else>
          <q-btn
            dense
            no-caps
            color="positive"
            icon="login"
            label="เข้าสู่ระบบ Google"
            class="q-px-sm"
            size="sm"
            @click="$emit('login')"
          />
        </template>
      </div>
    </div>

    <q-separator color="grey-8" class="q-my-xs" />

    <!-- Live Statistics Strip -->
    <div class="row items-center justify-around text-center q-pt-xs text-caption">
      <!-- Delivered Progress -->
      <div class="col-4 q-px-xs">
        <div class="text-grey-4">ส่งมอบแล้ว</div>
        <div class="text-subtitle2 text-weight-bolder text-positive">
          {{ completedCount }} / {{ totalCount }} รายการ
        </div>
      </div>

      <!-- Cash in hand -->
      <div class="col-4 q-px-xs">
        <div class="text-grey-4">เงินสดในมือ</div>
        <div class="text-subtitle2 text-weight-bolder text-warning">
          {{ cashInHandTotal.toLocaleString() }} บาท
        </div>
      </div>

      <!-- Bank transfer -->
      <div class="col-4 q-px-xs">
        <div class="text-grey-4">ยอดโอนพร้อมเพย์</div>
        <div class="text-subtitle2 text-weight-bolder text-info">
          {{ prepaidTotal.toLocaleString() }} บาท
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { User } from 'firebase/auth';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();

defineProps<{
  authUser: User | null;
  isAdmin: boolean;
  totalCount: number;
  completedCount: number;
  cashInHandTotal: number;
  prepaidTotal: number;
}>();

defineEmits<{
  (e: 'login'): void;
  (e: 'logout'): void;
  (e: 'open-harvest-summary'): void;
  (e: 'open-user-management'): void;
  (e: 'open-round-management'): void;
}>();
</script>
