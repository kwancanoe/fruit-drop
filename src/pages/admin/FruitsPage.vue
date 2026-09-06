<template>
  <!-- Section: Master Fruit Catalog Management Page -->
  <q-page
    id="admin-fruits-page"
    data-audit-id="admin-fruits-page"
    class="q-pa-md bg-grey-1 text-grey-9"
    style="max-width: 680px; margin: 0 auto; padding-bottom: 84px;"
  >
    <!-- Header with Back Button and Quick Add Action -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center">
        <q-btn
          flat
          dense
          round
          icon="arrow_back"
          color="grey-8"
          class="q-mr-sm"
          data-audit-id="btn-back-from-fruits"
          @click="handleBack"
        >
          <q-tooltip>กลับหน้าก่อนหน้า</q-tooltip>
        </q-btn>
        <div>
          <div class="text-h6 text-weight-bolder leading-tight text-grey-9">
            แคตตาล็อกผลไม้
          </div>
          <div class="text-caption text-grey-7">
            จัดการชนิดผลไม้ ราคา/ต้นทุนตั้งต้น และรูปมาสคอต ({{ fruitStore.masterFruits.length }} รายการ)
          </div>
        </div>
      </div>

      <!-- Add Fruit Button -->
      <q-btn
        color="positive"
        icon="add"
        label="เพิ่มผลไม้ใหม่"
        rounded
        no-caps
        class="q-px-sm text-weight-bold"
        data-audit-id="btn-add-master-fruit"
        @click="openAddDialog"
      />
    </div>

    <!-- Loading State -->
    <div v-if="fruitStore.isLoading" class="text-center q-pa-xl text-grey-7">
      <q-spinner-dots color="positive" size="40px" />
      <div class="q-mt-sm">กำลังโหลดแคตตาล็อกผลไม้...</div>
    </div>

    <!-- Empty State -->
    <q-card
      v-else-if="fruitStore.masterFruits.length === 0"
      class="bg-white text-center q-pa-xl rounded-borders shadow-1"
    >
      <q-icon name="eco" size="64px" color="grey-4" class="q-mb-sm" />
      <div class="text-subtitle1 text-weight-bold text-grey-9 q-mb-xs">
        ยังไม่มีข้อมูลผลไม้ในระบบ
      </div>
      <div class="text-caption text-grey-6 q-mb-md">
        เริ่มต้นด้วยการโหลดผลไม้มาตรฐาน 7 ชนิด หรือสร้างชนิดใหม่
      </div>
      <q-btn
        color="positive"
        icon="add"
        label="เพิ่มผลไม้แรก"
        rounded
        no-caps
        @click="openAddDialog"
      />
    </q-card>

    <!-- Master Fruits List Cards -->
    <div v-else>
      <q-card
        v-for="fruit in fruitStore.masterFruits"
        :key="fruit.id"
        class="bg-white q-pa-md rounded-borders q-mb-md shadow-1 overflow-hidden"
        :data-audit-id="`master-fruit-card-${fruit.id}`"
      >
        <div class="row items-center justify-between no-wrap">
          <!-- Left: Avatar & Info -->
          <div class="row items-center no-wrap col">
            <FruitMascotAvatar
              :name="fruit.name"
              :image-url="fruit.imageUrl"
              size="56px"
              class="q-mr-md flex-shrink-0"
            />

            <div class="col min-width-0">
              <div class="row items-center q-mb-xs">
                <div class="text-subtitle1 text-weight-bolder text-grey-9 q-mr-sm ellipsis">
                  {{ fruit.name }}
                </div>
                <q-badge
                  :color="fruit.productType === 'VARIABLE_WHOLE_FRUIT' ? 'purple-7' : 'green-8'"
                  rounded
                  dense
                  class="text-caption"
                  style="font-size: 10px;"
                >
                  {{ fruit.productType === 'VARIABLE_WHOLE_FRUIT' ? 'ชั่งตามลูก' : 'ขายยกกิโล' }}
                </q-badge>
              </div>

              <!-- Price & Cost Details -->
              <div class="text-caption text-grey-8 row items-center wrap" style="gap: 8px;">
                <span>ราคาขาย: <strong>{{ fruit.defaultPricePerKg }}</strong> บ.</span>
                <span>ต้นทุน: <strong>{{ fruit.defaultCostPerKg }}</strong> บ.</span>
                <span class="text-positive text-weight-bold">
                  (กำไร {{ fruit.defaultPricePerKg - fruit.defaultCostPerKg }} บ./กก.)
                </span>
              </div>
            </div>
          </div>

          <!-- Right: Status Toggle & Edit Button -->
          <div class="column items-end flex-shrink-0 q-ml-sm">
            <q-btn
              outline
              size="sm"
              no-caps
              color="warning"
              icon="edit"
              label="แก้ไข"
              rounded
              class="q-px-sm text-weight-bold q-mb-xs"
              :data-audit-id="`btn-edit-master-fruit-${fruit.id}`"
              @click="openEditDialog(fruit)"
            />

            <div class="row items-center">
              <q-toggle
                :model-value="fruit.isActive"
                color="positive"
                dense
                size="sm"
                :data-audit-id="`toggle-fruit-active-${fruit.id}`"
                @update:model-value="val => handleToggleActive(fruit.id, val)"
              />
              <span class="text-caption text-grey-7 q-ml-xs" style="font-size: 11px;">
                {{ fruit.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </div>
          </div>
        </div>
      </q-card>
    </div>

    <!-- Create / Edit Dialog -->
    <FruitEditDialog
      v-model="showEditDialog"
      :fruit-to-edit="selectedFruitToEdit"
      @saved="onFruitSaved"
    />
  </q-page>
</template>

<script setup lang="ts">
// 1-line: Admin Master Fruit Catalog Management Page displaying master cards with active toggles and editor dialog
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import type { MasterFruit } from '@/types/fruit_app';
import { useFruitStore } from '@/stores/fruitStore';
import FruitMascotAvatar from '@/components/common/FruitMascotAvatar.vue';
import FruitEditDialog from '@/components/admin/FruitEditDialog.vue';

const router = useRouter();
const $q = useQuasar();
const fruitStore = useFruitStore();

const showEditDialog = ref(false);
const selectedFruitToEdit = ref<MasterFruit | null>(null);

function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push('/admin/rounds');
  }
}

function openAddDialog() {
  selectedFruitToEdit.value = null;
  showEditDialog.value = true;
}

function openEditDialog(fruit: MasterFruit) {
  selectedFruitToEdit.value = fruit;
  showEditDialog.value = true;
}

async function handleToggleActive(id: string, isActive: boolean) {
  try {
    await fruitStore.toggleMasterFruitActive(id, isActive);
    $q.notify({
      type: 'positive',
      message: isActive ? 'เปิดใช้งานผลไม้นี้แล้ว' : 'ปิดการใช้งานผลไม้นี้แล้ว',
      position: 'top',
      timeout: 1500
    });
  } catch (err) {
    console.error('Toggle master fruit active failed:', err);
    $q.notify({ type: 'negative', message: 'ไม่สามารถเปลี่ยนสถานะได้' });
  }
}

function onFruitSaved() {
  // Real-time Firestore snapshot updates list automatically
}

onMounted(() => {
  fruitStore.subscribeToMasterFruits();
});
</script>

<style scoped lang="scss">
.min-width-0 {
  min-width: 0;
}
</style>
