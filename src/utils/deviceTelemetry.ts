// Hardware Device Telemetry & PWA Device Fingerprinting Engine
import type { DeviceFingerprint } from '@/types/fruit_app';

const STORAGE_KEY_DEVICE_ID = 'fruit_drop_pwa_device_id';

interface NavigatorUAData {
  brands?: { brand: string; version: string }[];
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{
    model?: string;
    platform?: string;
    platformVersion?: string;
    architecture?: string;
  }>;
}

/**
 * Get or initialize persistent Device UUID for this PWA installation
 */
export function getPersistentDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (!id) {
      id = `DEV-${crypto.randomUUID()}`;
      localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
    }
    return id;
  } catch {
    return `DEV-TEMP-${Math.random().toString(36).substring(2, 10)}`;
  }
}

/**
 * Collect device hardware model, platform, and persistent UUID
 */
export async function collectDeviceFingerprint(): Promise<DeviceFingerprint> {
  const deviceId = getPersistentDeviceId();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let model = 'Web Browser';
  let platform = 'Unknown OS';

  const nav = navigator as Navigator & { userAgentData?: NavigatorUAData };

  // 1. Try modern User-Agent Client Hints (Android / Chromium)
  if (nav.userAgentData && typeof nav.userAgentData.getHighEntropyValues === 'function') {
    try {
      const highEntropy = await nav.userAgentData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion'
      ]);
      if (highEntropy.model) {
        model = highEntropy.model; // e.g. "SM-S928B", "Pixel 8"
      }
      if (highEntropy.platform) {
        platform = `${highEntropy.platform} ${highEntropy.platformVersion || ''}`.trim();
      }
    } catch {
      // Fallback
    }
  }

  // 2. Fallback heuristic from User-Agent (iOS / Safari / Desktop)
  if (model === 'Web Browser') {
    if (/iPhone/i.test(ua)) {
      model = 'Apple iPhone';
      platform = 'iOS';
    } else if (/iPad/i.test(ua)) {
      model = 'Apple iPad';
      platform = 'iPadOS';
    } else if (/Android/i.test(ua)) {
      const match = ua.match(/;\s*([^;]+)\s+Build\//);
      if (match && match[1]) {
        model = match[1].trim(); // e.g. "SM-G998B"
      } else {
        model = 'Android Device';
      }
      platform = 'Android';
    } else if (/Macintosh/i.test(ua)) {
      model = 'Apple Mac';
      platform = 'macOS';
    } else if (/Windows/i.test(ua)) {
      model = 'PC / Laptop';
      platform = 'Windows';
    }
  }

  return {
    deviceId,
    deviceModel: model,
    platform,
    userAgent: ua.substring(0, 150)
  };
}
