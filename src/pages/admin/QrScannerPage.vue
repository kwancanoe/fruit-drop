<template>
  <!-- Section: In-App Camera QR Code Scanner for Admin Dispatch Desk -->
  <q-page id="admin-qr-scanner-page" data-audit-id="admin-qr-scanner-page" class="q-pa-md bg-grey-1 text-grey-9" style="max-width: 680px; margin: 0 auto; padding-bottom: 84px;">
    <!-- Top Bar Navigation -->
    <div class="row items-center justify-between q-mb-md">
      <q-btn
        flat
        dense
        no-caps
        icon="arrow_back"
        label="กลับหน้ารายการ"
        color="grey-8"
        class="text-weight-bold"
        data-audit-id="btn-back-from-scanner"
        @click="handleBack"
      />
      <div class="text-subtitle2 text-weight-bolder text-primary">
        สแกน QR Code ลูกค้า
      </div>
    </div>

    <!-- Scanner Viewport Card -->
    <q-card class="bg-white shadow-2 rounded-borders overflow-hidden q-mb-md" data-audit-id="card-scanner-viewport">
      <q-card-section class="q-pa-none relative-position bg-black text-white" style="min-height: 340px;">
        <!-- HTML5 Video Render Target Container -->
        <div id="qr-reader" style="width: 100%; min-height: 340px;"></div>

        <!-- Camera Status Overlay when starting or error -->
        <div
          v-if="cameraStatus === 'INITIALIZING'"
          class="absolute-full flex flex-center column bg-dark text-white q-pa-lg"
          style="z-index: 10;"
        >
          <q-spinner color="positive" size="56px" />
          <div class="text-subtitle1 text-weight-bold q-mt-md">กำลังเปิดกล้องถ่ายภาพ...</div>
          <div class="text-caption text-grey-4 text-center q-mt-xs">
            โปรดอนุญาตให้ใช้งานกล้อง
          </div>
        </div>

        <div
          v-else-if="cameraStatus === 'ERROR'"
          class="absolute-full flex flex-center column bg-dark text-white q-pa-lg"
          style="z-index: 10;"
        >
          <q-icon name="videocam_off" color="negative" size="56px" />
          <div class="text-subtitle1 text-weight-bold q-mt-md">ไม่สามารถเปิดกล้องได้</div>
          <div class="text-caption text-grey-4 text-center q-mt-xs q-mb-md">
            {{ errorMessage || 'เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้กล้อง หรือไม่มีกล้องที่ใช้งานได้' }}
          </div>
          <q-btn
            color="primary"
            icon="refresh"
            label="ลองเปิดกล้องใหม่อีกครั้ง"
            no-caps
            rounded
            @click="startScanner"
          />
        </div>

        <!-- Animated Scanner Target Overlay -->
        <div
          v-if="cameraStatus === 'RUNNING'"
          class="absolute-full pointer-events-none flex flex-center"
          style="z-index: 5;"
        >
          <!-- Viewfinder Frame -->
          <div class="scanner-viewfinder relative-position">
            <!-- Corner Accents -->
            <div class="scanner-corner corner-top-left absolute-top-left"></div>
            <div class="scanner-corner corner-top-right absolute-top-right"></div>
            <div class="scanner-corner corner-bottom-left absolute-bottom-left"></div>
            <div class="scanner-corner corner-bottom-right absolute-bottom-right"></div>
          </div>
        </div>
      </q-card-section>

      <!-- Scanner Controls Footer -->
      <q-card-actions class="bg-white q-pa-sm row justify-around items-center">
        <!-- Switch Camera (Front/Back) -->
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          icon="cameraswitch"
          label="สลับกล้อง"
          size="sm"
          :disable="cameraStatus !== 'RUNNING'"
          @click="toggleCameraFacing"
        />

        <!-- Torch / Flashlight Toggle (if supported) -->
        <q-btn
          flat
          dense
          no-caps
          :color="isTorchOn ? 'amber-9' : 'grey-8'"
          :icon="isTorchOn ? 'flashlight_on' : 'flashlight_off'"
          label="ไฟฉาย"
          size="sm"
          :disable="cameraStatus !== 'RUNNING'"
          @click="toggleTorch"
        />
      </q-card-actions>
    </q-card>

    <!-- Instructions & Tip -->
    <div class="bg-green-1 q-pa-sm rounded-borders q-mb-md row items-center text-primary text-caption">
      <q-icon name="qr_code_scanner" size="20px" class="q-mr-xs" />
      <span>นำอุปกรณ์ไปส่องที่ QR Code ของลูกค้า</span>
    </div>

    <!-- Manual Order Code Fallback (Imperative for 100% Reliability) -->
    <q-card class="bg-white shadow-1 rounded-borders q-mb-md" data-audit-id="card-manual-input">
      <q-card-section class="q-pa-md">
        <div class="text-subtitle2 text-weight-bold text-grey-8 q-mb-xs">
          หรือกรอกรหัสออเดอร์ด้วยตัวเอง
        </div>
        <div class="row items-center no-wrap">
          <q-input
            v-model="manualCodeInput"
            outlined
            dense
            placeholder="เช่น FD-1004"
            class="col"
            input-class="text-weight-bold text-primary"
            @keyup.enter="handleManualSubmit"
          >
            <template #prepend>
              <q-icon name="tag" color="primary" />
            </template>
          </q-input>

          <q-btn
            color="primary"
            label="เปิดออเดอร์"
            no-caps
            dense
            class="q-ml-sm q-px-md text-weight-bold"
            @click="handleManualSubmit"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const router = useRouter();
const $q = useQuasar();

type CameraStatus = 'INITIALIZING' | 'RUNNING' | 'ERROR' | 'STOPPED';

const cameraStatus = ref<CameraStatus>('INITIALIZING');
const errorMessage = ref<string>('');
const manualCodeInput = ref<string>('');
const isTorchOn = ref<boolean>(false);
const currentFacingMode = ref<'environment' | 'user'>('environment');

let html5QrScanner: Html5Qrcode | null = null;
let isScanHandled = false;

// Initialize camera scanner
async function startScanner() {
  cameraStatus.value = 'INITIALIZING';
  errorMessage.value = '';
  isScanHandled = false;

  try {
    if (html5QrScanner) {
      try {
        await html5QrScanner.stop();
        html5QrScanner.clear();
      } catch {
        // ignore cleanup error
      }
    }

    html5QrScanner = new Html5Qrcode('qr-reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false
    });

    const qrConfig = {
      fps: 15,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    await html5QrScanner.start(
      { facingMode: currentFacingMode.value },
      qrConfig,
      onScanSuccess,
      onScanFailure
    );

    cameraStatus.value = 'RUNNING';
  } catch (err: unknown) {
    console.error('Camera QR scanner error:', err);
    cameraStatus.value = 'ERROR';
    errorMessage.value = err instanceof Error ? err.message : 'ไม่สามารถเข้าถึงกล้องถ่ายภาพได้';
  }
}

// Successful QR detection callback
function onScanSuccess(decodedText: string) {
  if (isScanHandled) return;

  const orderId = parseOrderIdFromText(decodedText);
  if (!orderId) {
    // If not a recognized fruit-drop order, notify gently
    $q.notify({
      type: 'warning',
      message: `QR ที่สแกนไม่ใช่ออเดอร์ Fruit Drop (${decodedText.substring(0, 25)}...)`,
      position: 'top',
      timeout: 1500
    });
    return;
  }

  isScanHandled = true;

  // Haptic feedback & audio chime
  if (navigator.vibrate) {
    navigator.vibrate([80, 40, 80]);
  }

  $q.notify({
    type: 'positive',
    message: `สแกนพบออเดอร์ #${orderId} กำลังเปิดหน้าส่งมอบ...`,
    position: 'top',
    timeout: 1000
  });

  // Stop scanner and navigate
  void stopScanner().finally(() => {
    void router.push(`/admin/orders/${orderId}`);
  });
}

function onScanFailure() {
  // Silent frame miss, continue scanning
}

// Parse Order ID from varied QR formats: URL, direct ID, or numeric
function parseOrderIdFromText(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();

  // Pattern 1: URL containing /admin/orders/FD-XXXX
  const urlMatch = trimmed.match(/\/admin\/orders\/(FD-\d+)/i);
  if (urlMatch?.[1]) {
    return urlMatch[1].toUpperCase();
  }

  // Pattern 2: Direct FD-XXXX
  const fdMatch = trimmed.match(/(FD-\d+)/i);
  if (fdMatch?.[1]) {
    return fdMatch[1].toUpperCase();
  }

  // Pattern 3: JSON payload {"orderId": "FD-1004"}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as { orderId?: string };
      if (parsed.orderId) {
        return parsed.orderId.toUpperCase();
      }
    } catch {
      // not JSON
    }
  }

  // Pattern 4: Raw 4-digit code e.g. 1004
  if (/^\d{4}$/.test(trimmed)) {
    return `FD-${trimmed}`;
  }

  return null;
}

// Switch between Rear and Front cameras
async function toggleCameraFacing() {
  currentFacingMode.value = currentFacingMode.value === 'environment' ? 'user' : 'environment';
  await startScanner();
}

// Toggle Torch / Flashlight
async function toggleTorch() {
  if (!html5QrScanner) return;
  try {
    isTorchOn.value = !isTorchOn.value;
    await html5QrScanner.applyVideoConstraints({
      advanced: [{ torch: isTorchOn.value } as MediaTrackConstraintSet]
    });
  } catch (err) {
    console.warn('Torch not supported on this device/browser:', err);
    $q.notify({
      type: 'info',
      message: 'อุปกรณ์นี้ไม่รองรับการเปิดไฟฉายผ่านเบราว์เซอร์',
      position: 'top',
      timeout: 1500
    });
  }
}

// Manual Input Submission
function handleManualSubmit() {
  const code = manualCodeInput.value.trim();
  if (!code) {
    $q.notify({ type: 'warning', message: 'ระบุรหัสออเดอร์', position: 'top' });
    return;
  }

  const orderId = parseOrderIdFromText(code);
  if (!orderId) {
    $q.notify({ type: 'warning', message: 'รูปแบบรหัสออเดอร์ไม่ถูกต้อง (เช่น FD-1004)', position: 'top' });
    return;
  }

  void stopScanner().finally(() => {
    void router.push(`/admin/orders/${orderId}`);
  });
}

// Safely stop scanner and free camera hardware
async function stopScanner() {
  if (html5QrScanner) {
    try {
      await html5QrScanner.stop();
      html5QrScanner.clear();
    } catch {
      // ignore already stopped
    } finally {
      html5QrScanner = null;
      cameraStatus.value = 'STOPPED';
    }
  }
}

function handleBack() {
  void stopScanner().finally(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      void router.push('/admin');
    }
  });
}

onMounted(() => {
  void startScanner();
});

onBeforeUnmount(() => {
  void stopScanner();
});
</script>

<style scoped lang="scss">
.scanner-viewfinder {
  width: 240px;
  height: 240px;
  border: 3px solid $positive;
  border-radius: 16px;
  box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.4);
}

.scanner-corner {
  width: 20px;
  height: 20px;

  &.corner-top-left {
    border-top: 5px solid $positive;
    border-left: 5px solid $positive;
    border-top-left-radius: 14px;
  }
  &.corner-top-right {
    border-top: 5px solid $positive;
    border-right: 5px solid $positive;
    border-top-right-radius: 14px;
  }
  &.corner-bottom-left {
    border-bottom: 5px solid $positive;
    border-left: 5px solid $positive;
    border-bottom-left-radius: 14px;
  }
  &.corner-bottom-right {
    border-bottom: 5px solid $positive;
    border-right: 5px solid $positive;
    border-bottom-right-radius: 14px;
  }
}
</style>
