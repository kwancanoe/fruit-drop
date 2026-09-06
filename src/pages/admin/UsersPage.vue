<template>
  <!-- Section: Full-Page 3-Tier RBAC Staff Management -->
  <q-page id="admin-users-page" data-audit-id="admin-users-page" class="q-pa-md bg-grey-1 text-grey-9" style="max-width: 680px; margin: 0 auto; padding-bottom: 84px;">
    <!-- Page Header with Back Navigation & Top Action -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center">
        <q-btn
          flat
          dense
          round
          icon="arrow_back"
          color="grey-8"
          class="q-mr-sm"
          data-audit-id="btn-back-to-dispatch"
          @click="handleBack"
        >
          <q-tooltip>กลับโต๊ะจ่ายของท้ายรถ</q-tooltip>
        </q-btn>
        <div>
          <div class="text-h6 text-weight-bolder leading-tight text-grey-9">
            จัดการผู้ใช้และทีมงาน
          </div>
          <div class="text-caption text-grey-7">
            สิทธิ์ของคุณ: <strong class="text-positive">{{ formatRole(userStore.currentUserRole) }}</strong>
          </div>
        </div>
      </div>

      <!-- Action Button: Open Add User Dialog -->
      <q-btn
        v-if="userStore.isSystemAdmin || userStore.isShopOwner"
        color="positive"
        icon="person_add"
        label="เพิ่มผู้ใช้งาน"
        no-caps
        class="text-weight-bold shadow-1 q-px-sm"
        data-audit-id="btn-open-add-user-dialog"
        @click="showAddUserDialog = true"
      />
    </div>

    <!-- AppSheet-Style Team Member Deck View (No Nested Cards) -->
    <q-card class="bg-white text-grey-9 rounded-borders shadow-1 overflow-hidden q-mb-xl" data-audit-id="card-users-deck">
      <div class="q-px-md q-py-sm row items-center justify-between">
        <div class="text-subtitle1 text-weight-bolder text-positive row items-center">
          <q-icon name="group" size="20px" class="q-mr-xs" />
          รายชื่อผู้มีสิทธิ์ใช้งานในระบบ ({{ userStore.users.length }} คน)
        </div>
      </div>

      <q-separator />

      <!-- Empty State -->
      <div v-if="userStore.users.length === 0" class="text-center q-pa-xl text-grey-6">
        <q-icon name="person_off" size="48px" class="q-mb-sm text-grey-4" />
        <div class="text-subtitle1 text-weight-bold text-grey-8">ยังไม่มีรายชื่อผู้ใช้งาน</div>
        <div class="text-caption text-grey-6 q-mb-md">กดปุ่ม 'เพิ่มผู้ใช้งาน' เพื่อให้สิทธิ์ทีมงาน</div>
        <q-btn
          color="positive"
          icon="person_add"
          label="เพิ่มผู้ใช้งานคนแรก"
          no-caps
          @click="showAddUserDialog = true"
        />
      </div>

      <!-- Native Flush Deck List -->
      <q-list v-else separator>
        <div
          v-for="user in userStore.users"
          :key="user.email"
          class="q-pa-md row items-center justify-between no-wrap"
          :data-audit-id="`user-row-${user.email}`"
        >
          <!-- User Details (Left Avatar + Contact Block) -->
          <div class="row items-center col ellipsis q-pr-sm">
            <q-avatar
              :color="getRoleColor(user.role)"
              text-color="white"
              icon="person"
              size="44px"
              class="q-mr-md shadow-1 flex-shrink-0"
            />
            <div class="col ellipsis">
              <div class="row items-center q-mb-xs">
                <span class="text-subtitle1 text-weight-bolder text-grey-9 q-mr-sm ellipsis">
                  {{ user.displayName }}
                </span>
                <q-badge :color="getRoleColor(user.role)" class="text-weight-bold" rounded>
                  {{ formatRole(user.role) }}
                </q-badge>
              </div>
              <div class="text-caption text-grey-8 row items-center">
                <q-icon name="mail" size="14px" class="q-mr-xs text-grey-6" />
                <span class="ellipsis">{{ user.email }}</span>
              </div>
              <div class="text-caption text-grey-8 row items-center q-mt-xs">
                <q-icon name="phone" size="14px" class="q-mr-xs text-positive" />
                <a :href="`tel:${user.phone}`" class="text-grey-9 text-weight-bold text-decoration-none">
                  {{ user.phone }}
                </a>
              </div>
              <div v-if="user.lastLoginDevice" class="text-caption text-grey-6 text-italic q-mt-xs" style="font-size: 11px;">
                อุปกรณ์: {{ user.lastLoginDevice.deviceModel }} ({{ user.lastLoginDevice.platform }})
              </div>
            </div>
          </div>

          <!-- Delete Action -->
          <div class="col-auto text-right">
            <q-btn
              v-if="canDelete(user)"
              flat
              round
              dense
              color="negative"
              icon="delete"
              size="md"
              :data-audit-id="`btn-delete-user-${user.email}`"
              @click="confirmDeleteUser(user)"
            >
              <q-tooltip>ลบสิทธิ์ผู้ใช้นี้</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-list>
    </q-card>

    <!-- Dialog: Add New Staff Member Modal (On-Demand) -->
    <q-dialog v-model="showAddUserDialog" persistent>
      <q-card style="width: 100%; max-width: 500px;" class="rounded-borders overflow-hidden">
        <!-- Dialog Header -->
        <div class="q-pa-md bg-positive text-white row items-center justify-between">
          <div class="text-subtitle1 text-weight-bolder row items-center">
            <q-icon name="person_add" size="22px" class="q-mr-xs" />
            เพิ่มผู้ช่วยขาย / ผู้ใช้งานใหม่
          </div>
          <q-btn flat round dense icon="close" color="white" v-close-popup />
        </div>

        <q-card-section class="q-pa-md">
          <q-form @submit.prevent="handleSaveNewUser">
            <div class="q-mb-sm">
              <q-input
                v-model="newUserForm.email"
                outlined
                dense
                type="email"
                label="Gmail ของผู้ใช้ *"
                placeholder="example@gmail.com"
                :rules="[val => !!val && val.includes('@') || 'ระบุ Gmail ให้ถูกต้อง']"
                data-audit-id="input-new-user-email"
              >
                <template #prepend>
                  <q-icon name="mail" color="positive" />
                </template>
              </q-input>
            </div>

            <div class="q-mb-sm">
              <q-input
                v-model="newUserForm.displayName"
                outlined
                dense
                label="ชื่อ-นามสกุล หรือชื่อเล่น *"
                placeholder="เช่น น้องบอย Garmin"
                :rules="[val => !!val && val.trim().length > 0 || 'ระบุชื่อ']"
                data-audit-id="input-new-user-name"
              >
                <template #prepend>
                  <q-icon name="person" color="positive" />
                </template>
              </q-input>
            </div>

            <div class="q-mb-sm">
              <q-input
                v-model="newUserForm.phone"
                outlined
                dense
                type="tel"
                label="เบอร์โทรศัพท์ *"
                placeholder="08X-XXX-XXXX"
                mask="###-###-####"
                unmasked-value
                :rules="[val => !!val && val.length >= 9 || 'ระบุเบอร์โทรศัพท์']"
                data-audit-id="input-new-user-phone"
              >
                <template #prepend>
                  <q-icon name="phone" color="positive" />
                </template>
              </q-input>
            </div>

            <div class="q-mb-sm">
              <q-select
                v-model="newUserForm.role"
                :options="roleOptions"
                emit-value
                map-options
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

            <div v-if="userStore.isShopOwner" class="text-caption text-grey-7 q-mb-sm">
              * เจ้าของร้านสามารถเพิ่มผู้ใช้ระดับ "ผู้ช่วยขาย (Seller)" ได้เท่านั้น
            </div>

            <div class="row items-center justify-end q-mt-md">
              <q-btn flat label="ยกเลิก" color="grey-7" v-close-popup class="q-mr-sm" no-caps />
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
        </q-card-section>
      </q-card>
    </q-dialog>
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

// Modal visibility for add user
const showAddUserDialog = ref(false);

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
    $q.notify({ type: 'warning', message: 'ระบุข้อมูลให้ครบทุกช่อง' });
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

    // Reset Form & Close Dialog
    newUserForm.value = {
      email: '',
      displayName: '',
      phone: '',
      role: 'SELLER'
    };
    showAddUserDialog.value = false;
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
    dark: false,
    title: 'ยืนยันการลบสิทธิ์',
    message: `ต้องการลบสิทธิ์ของ ${user.displayName} (${user.email}) หรือไม่?`,
    cancel: { flat: true, label: 'ยกเลิก', color: 'grey-7' },
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
