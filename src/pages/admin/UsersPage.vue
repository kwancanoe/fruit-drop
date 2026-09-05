<template>
  <!-- Section: Full-Page 3-Tier RBAC Staff Management -->
  <q-page id="admin-users-page" data-audit-id="admin-users-page" class="q-pa-md bg-grey-10 text-white" style="max-width: 680px; margin: 0 auto;">
    <!-- Page Header with Back Navigation -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center">
        <q-btn
          flat
          dense
          round
          icon="arrow_back"
          color="white"
          class="q-mr-sm"
          data-audit-id="btn-back-to-dispatch"
          @click="handleBack"
        >
          <q-tooltip>กลับโต๊ะจ่ายของท้ายรถ</q-tooltip>
        </q-btn>
        <div>
          <div class="text-h6 text-weight-bolder leading-tight">
            จัดการผู้ใช้และทีมงาน
          </div>
          <div class="text-caption text-grey-4">
            สิทธิ์ของคุณ: <strong class="text-positive">{{ formatRole(userStore.currentUserRole) }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 1: Add New Staff Member Card -->
    <q-card class="bg-grey-9 text-white q-pa-md rounded-borders q-mb-md shadow-2">
      <div class="text-subtitle1 text-weight-bolder text-positive q-mb-sm row items-center">
        <q-icon name="person_add" size="20px" class="q-mr-xs" />
        เพิ่มผู้ช่วยขาย / ผู้ใช้งานใหม่
      </div>

      <q-form @submit.prevent="handleSaveNewUser">
        <div class="row q-mb-sm">
          <div class="col-12 col-sm-6 q-pr-sm-xs q-mb-sm q-mb-sm-none">
            <q-input
              v-model="newUserForm.email"
              dark
              outlined
              dense
              type="email"
              label="Gmail ของผู้ใช้ *"
              placeholder="example@gmail.com"
              :rules="[val => !!val && val.includes('@') || 'กรุณากรอก Gmail ให้ถูกต้อง']"
              data-audit-id="input-new-user-email"
            >
              <template #prepend>
                <q-icon name="mail" color="positive" />
              </template>
            </q-input>
          </div>

          <div class="col-12 col-sm-6 q-pl-sm-xs">
            <q-input
              v-model="newUserForm.displayName"
              dark
              outlined
              dense
              label="ชื่อ-นามสกุล หรือชื่อเล่น *"
              placeholder="เช่น น้องบอย Garmin"
              :rules="[val => !!val && val.trim().length > 0 || 'กรุณากรอกชื่อ']"
              data-audit-id="input-new-user-name"
            >
              <template #prepend>
                <q-icon name="person" color="positive" />
              </template>
            </q-input>
          </div>
        </div>

        <div class="row q-mb-sm">
          <div class="col-12 col-sm-6 q-pr-sm-xs q-mb-sm q-mb-sm-none">
            <q-input
              v-model="newUserForm.phone"
              dark
              outlined
              dense
              type="tel"
              label="เบอร์โทรศัพท์ *"
              placeholder="08X-XXX-XXXX"
              mask="###-###-####"
              unmasked-value
              :rules="[val => !!val && val.length >= 9 || 'กรุณากรอกเบอร์โทรศัพท์']"
              data-audit-id="input-new-user-phone"
            >
              <template #prepend>
                <q-icon name="phone" color="positive" />
              </template>
            </q-input>
          </div>

          <div class="col-12 col-sm-6 q-pl-sm-xs">
            <q-select
              v-model="newUserForm.role"
              :options="roleOptions"
              emit-value
              map-options
              dark
              outlined
              dense
              label="ระดับสิทธิ์ในระบบ *"
              :readonly="userStore.isShopOwner"
              data-audit-id="select-new-user-role"
            >
              <template #prepend>
                <q-icon name="badge" color="positive" />
              </template>
            </q-select>
          </div>
        </div>

        <div v-if="userStore.isShopOwner" class="text-caption text-grey-4 q-mb-sm">
          * เจ้าของร้านสามารถเพิ่มผู้ใช้ระดับ "ผู้ช่วยขาย (Seller)" ได้เท่านั้น
        </div>

        <div class="row items-center justify-end">
          <q-btn
            color="positive"
            icon="add"
            label="บันทึกและให้สิทธิ์ผู้ใช้"
            no-caps
            type="submit"
            class="q-px-md text-weight-bold shadow-1"
            :loading="userStore.isLoading"
            data-audit-id="btn-save-new-user"
          />
        </div>
      </q-form>
    </q-card>

    <!-- Section 2: Active Users List -->
    <q-card class="bg-grey-9 text-white q-pa-md rounded-borders shadow-2 q-mb-xl">
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-subtitle1 text-weight-bolder text-positive row items-center">
          <q-icon name="group" size="20px" class="q-mr-xs" />
          รายชื่อผู้มีสิทธิ์ใช้งานในระบบ ({{ userStore.users.length }} คน)
        </div>
      </div>

      <div v-if="userStore.users.length === 0" class="text-center q-pa-lg text-grey-5">
        ยังไม่มีรายชื่อผู้ใช้งาน
      </div>

      <div v-else class="column">
        <div
          v-for="user in userStore.users"
          :key="user.email"
          class="bg-grey-10 q-pa-sm rounded-borders q-mb-sm shadow-1 row items-center justify-between"
          :data-audit-id="`user-row-${user.email}`"
        >
          <!-- User Details -->
          <div class="row items-center col-10">
            <q-avatar :color="getRoleColor(user.role)" text-color="white" icon="person" size="38px" class="q-mr-sm" />
            <div>
              <div class="row items-center">
                <span class="text-subtitle2 text-weight-bold text-white q-mr-xs">
                  {{ user.displayName }}
                </span>
                <q-badge :color="getRoleColor(user.role)" class="text-weight-bold" rounded style="font-size: 10px;">
                  {{ formatRole(user.role) }}
                </q-badge>
              </div>
              <div class="text-caption text-grey-4">
                {{ user.email }} | โทร: {{ user.phone }}
              </div>
              <div v-if="user.lastLoginDevice" class="text-caption text-grey-5 text-italic" style="font-size: 11px;">
                อุปกรณ์: {{ user.lastLoginDevice.deviceModel }} ({{ user.lastLoginDevice.platform }})
              </div>
            </div>
          </div>

          <!-- Delete Action -->
          <div class="col-2 text-right">
            <q-btn
              v-if="canDelete(user)"
              flat
              round
              dense
              color="negative"
              icon="delete"
              size="sm"
              :data-audit-id="`btn-delete-user-${user.email}`"
              @click="confirmDeleteUser(user)"
            >
              <q-tooltip>ลบสิทธิ์ผู้ใช้นี้</q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
// Full-page Staff / User Management with 3-Tier RBAC (System Admin, Shop Owner, Seller)
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useUserStore } from '@/stores/userStore';
import type { AppUser, UserRole } from '@/types/fruit_app';

const router = useRouter();
const $q = useQuasar();
const userStore = useUserStore();

// Back navigation handler
function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push('/admin');
  }
}

const newUserForm = ref<{
  email: string;
  displayName: string;
  phone: string;
  role: UserRole;
}>({
  email: '',
  displayName: '',
  phone: '',
  role: 'SELLER'
});

// Role options
const roleOptions = computed(() => {
  if (userStore.isSystemAdmin) {
    return [
      { label: 'System Admin (ผู้ดูแลระบบสูงสุด)', value: 'SYSTEM_ADMIN' },
      { label: 'Shop Owner (เจ้าของร้าน)', value: 'SHOP_OWNER' },
      { label: 'Seller (ผู้ช่วยขาย)', value: 'SELLER' }
    ];
  }
  return [
    { label: 'Seller (ผู้ช่วยขาย)', value: 'SELLER' }
  ];
});

function formatRole(role: UserRole | null | undefined): string {
  switch (role) {
    case 'SYSTEM_ADMIN': return 'System Admin (แอดมินสูงสุด)';
    case 'SHOP_OWNER': return 'Shop Owner (เจ้าของร้าน)';
    case 'SELLER': return 'Seller (ผู้ช่วยขาย)';
    default: return 'ไม่มีสิทธิ์';
  }
}

function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'SYSTEM_ADMIN': return 'purple-9';
    case 'SHOP_OWNER': return 'positive';
    case 'SELLER': return 'warning';
    default: return 'grey-7';
  }
}

function canDelete(targetUser: AppUser): boolean {
  if (userStore.isSystemAdmin) {
    return true;
  }
  if (userStore.isShopOwner) {
    return targetUser.role === 'SELLER';
  }
  return false;
}

// Add User
async function handleSaveNewUser() {
  if (!newUserForm.value.email || !newUserForm.value.displayName || !newUserForm.value.phone) {
    $q.notify({ type: 'warning', message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
    return;
  }

  try {
    await userStore.addUser(newUserForm.value);
    $q.notify({
      type: 'positive',
      message: `เพิ่มผู้ใช้ ${newUserForm.value.email} เรียบร้อยแล้ว`,
      position: 'top',
      timeout: 2000
    });

    // Reset Form
    newUserForm.value = {
      email: '',
      displayName: '',
      phone: '',
      role: 'SELLER'
    };
  } catch (err: unknown) {
    const error = err as Error;
    $q.notify({
      type: 'negative',
      message: error.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้',
      position: 'top'
    });
  }
}

// Delete User Confirm
function confirmDeleteUser(user: AppUser) {
  $q.dialog({
    dark: true,
    title: 'ยืนยันการลบสิทธิ์',
    message: `ต้องการลบสิทธิ์ของ ${user.displayName} (${user.email}) หรือไม่?`,
    cancel: { flat: true, label: 'ยกเลิก', color: 'grey-4' },
    ok: { color: 'negative', label: 'ยืนยันลบ', noCaps: true }
  }).onOk(() => {
    void (async () => {
      try {
        await userStore.deleteUser(user.email);
        $q.notify({
          type: 'positive',
          message: `ลบสิทธิ์ผู้ใช้ ${user.email} เรียบร้อยแล้ว`,
          position: 'top',
          timeout: 1500
        });
      } catch (err: unknown) {
        const error = err as Error;
        $q.notify({
          type: 'negative',
          message: error.message || 'ไม่สามารถลบผู้ใช้ได้'
        });
      }
    })();
  });
}
</script>
