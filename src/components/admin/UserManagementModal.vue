<template>
  <!-- Section: 3-Tier RBAC User Management Modal -->
  <q-dialog
    :model-value="isOpen"
    persistent
    transition-show="jump-up"
    transition-hide="jump-down"
    @update:model-value="val => $emit('update:isOpen', val)"
  >
    <q-card id="user-management-modal" data-audit-id="user-management-modal" class="rounded-borders bg-white" style="width: 95vw; max-width: 600px;">
      <!-- Header -->
      <q-card-section class="bg-dark text-white row items-center justify-between q-pa-md">
        <div class="row items-center">
          <q-avatar size="36px" class="q-mr-sm bg-primary">
            <q-icon name="group" color="white" />
          </q-avatar>
          <div>
            <div class="text-subtitle1 text-weight-bolder">
              จัดการผู้ใช้และสิทธิ์ทีมงาน (User Management)
            </div>
            <div class="text-caption text-grey-4">
              สิทธิ์ของคุณ: <strong>{{ formatRole(userStore.currentUserRole) }}</strong>
            </div>
          </div>
        </div>
        <q-btn flat round dense icon="close" color="white" @click="$emit('update:isOpen', false)" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- Top Action Row -->
        <div class="row items-center justify-between q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-grey-9">
            รายชื่อผู้มีสิทธิ์ใช้งานระบบ ({{ userStore.users.length }} คน)
          </div>
          <q-btn
            color="positive"
            icon="person_add"
            label="เพิ่มผู้ช่วยขาย / ผู้ใช้ใหม่"
            size="sm"
            no-caps
            class="q-px-sm text-weight-bold shadow-1"
            @click="openAddUserDialog"
          />
        </div>

        <!-- Users List -->
        <q-list separator class="bg-grey-1 rounded-borders">
          <q-item v-for="user in userStore.users" :key="user.email" class="q-py-sm">
            <q-item-section avatar>
              <q-avatar :color="getRoleColor(user.role)" text-color="white" icon="person" size="38px" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-weight-bold text-grey-9">
                {{ user.displayName }}
                <q-badge :color="getRoleColor(user.role)" class="q-ml-xs text-weight-bold" rounded>
                  {{ formatRole(user.role) }}
                </q-badge>
              </q-item-label>
              <q-item-label caption class="text-grey-7">
                {{ user.email }} | โทร: {{ user.phone }}
              </q-item-label>
              <q-item-label v-if="user.lastLoginDevice" caption class="text-grey-6 text-italic" style="font-size: 11px;">
                อุปกรณ์ล่าสุด: {{ user.lastLoginDevice.deviceModel }} ({{ user.lastLoginDevice.platform }})
              </q-item-label>
            </q-item-section>

            <!-- Actions (Delete button if allowed) -->
            <q-item-section side>
              <q-btn
                v-if="canDelete(user)"
                flat
                round
                dense
                color="negative"
                icon="delete"
                size="sm"
                @click="confirmDeleteUser(user)"
              >
                <q-tooltip>ลบสิทธิ์ผู้ใช้นี้</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>

  <!-- Add User Sub-Dialog -->
  <q-dialog v-model="showAddModal" persistent>
    <q-card class="rounded-borders bg-white" style="width: 90vw; max-width: 440px;">
      <q-card-section class="bg-primary text-white row items-center justify-between q-pa-md">
        <div class="text-subtitle1 text-weight-bolder">เพิ่มผู้ใช้ใหม่</div>
        <q-btn flat round dense icon="close" color="white" @click="showAddModal = false" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="q-mb-sm">
          <q-input
            v-model="newUserForm.email"
            outlined
            dense
            type="email"
            label="Gmail ของผู้ใช้ *"
            placeholder="example@gmail.com"
            :rules="[val => !!val && val.includes('@') || 'กรุณากรอก Gmail ให้ถูกต้อง']"
          >
            <template #prepend>
              <q-icon name="mail" color="primary" />
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
            :rules="[val => !!val && val.trim().length > 0 || 'กรุณากรอกชื่อ']"
          >
            <template #prepend>
              <q-icon name="person" color="primary" />
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
            :rules="[val => !!val && val.length >= 9 || 'กรุณากรอกเบอร์โทรศัพท์']"
          >
            <template #prepend>
              <q-icon name="phone" color="primary" />
            </template>
          </q-input>
        </div>

        <div class="q-mb-md">
          <q-select
            v-model="newUserForm.role"
            outlined
            dense
            :options="roleOptions"
            emit-value
            map-options
            label="ระดับสิทธิ์ในระบบ *"
            :readonly="userStore.isShopOwner"
          >
            <template #prepend>
              <q-icon name="badge" color="primary" />
            </template>
          </q-select>
          <div v-if="userStore.isShopOwner" class="text-caption text-grey-7 q-mt-xs">
            * เจ้าของร้านสามารถเพิ่มผู้ใช้ระดับ "ผู้ช่วยขาย (Seller)" ได้เท่านั้น
          </div>
        </div>

        <div class="row">
          <div class="col-12">
            <q-btn
              color="positive"
              label="บันทึกและให้สิทธิ์ผู้ใช้"
              class="full-width q-py-sm text-weight-bold shadow-2"
              no-caps
              :loading="userStore.isLoading"
              @click="handleSaveNewUser"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useUserStore } from '@/stores/userStore';
import type { AppUser, UserRole } from '@/types/fruit_app';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', val: boolean): void;
}>();

const $q = useQuasar();
const userStore = useUserStore();

const showAddModal = ref<boolean>(false);
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

function openAddUserDialog() {
  newUserForm.value = {
    email: '',
    displayName: '',
    phone: '',
    role: 'SELLER'
  };
  showAddModal.value = true;
}

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
    showAddModal.value = false;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
    $q.notify({ type: 'negative', message: errorMsg });
  }
}

function canDelete(user: AppUser): boolean {
  if (user.email.toLowerCase() === userStore.currentAppUser?.email.toLowerCase()) {
    return false; // Cannot delete self
  }
  if (userStore.isSystemAdmin) return true;
  if (userStore.isShopOwner && user.role === 'SELLER') return true;
  return false;
}

function confirmDeleteUser(user: AppUser) {
  $q.dialog({
    title: 'ยืนยันการลบผู้ใช้',
    message: `คุณต้องการลบสิทธิ์ของ "${user.displayName}" (${user.email}) ใช่หรือไม่?`,
    cancel: true,
    persistent: true,
    ok: {
      color: 'negative',
      label: 'ยืนยันลบ',
      noCaps: true
    }
  }).onOk(() => {
    void deleteUserRecord(user);
  });
}

async function deleteUserRecord(user: AppUser) {
  try {
    await userStore.deleteUser(user.id || user.email);
    $q.notify({
      type: 'positive',
      message: `ลบผู้ใช้ ${user.email} เรียบร้อยแล้ว`,
      position: 'top',
      timeout: 1500
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'ไม่สามารถลบได้';
    $q.notify({ type: 'negative', message: errorMsg });
  }
}

function formatRole(role?: UserRole | null): string {
  switch (role) {
    case 'SYSTEM_ADMIN': return 'System Admin';
    case 'SHOP_OWNER': return 'Shop Owner';
    case 'SELLER': return 'ผู้ช่วยขาย';
    default: return 'ผู้ใช้ทั่วไป';
  }
}

function getRoleColor(role?: UserRole | null): string {
  switch (role) {
    case 'SYSTEM_ADMIN': return 'purple-9';
    case 'SHOP_OWNER': return 'positive';
    case 'SELLER': return 'warning';
    default: return 'grey-7';
  }
}
</script>
