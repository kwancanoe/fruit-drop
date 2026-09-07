import { register } from 'register-service-worker';
import { Notify } from 'quasar';

// Proactive SW update triggers and reload prompt
let refreshing = false;
function triggerReload() {
  if (!refreshing) {
    refreshing = true;
    window.location.reload();
  }
}

function promptOrReload(registration: ServiceWorkerRegistration) {
  Notify.create({
    message: 'มีเวอร์ชันใหม่พร้อมใช้งาน',
    caption: 'แตะเพื่ออัปเดตเวอร์ชันล่าสุด',
    icon: 'system_update',
    timeout: 0,
    position: 'top',
    color: 'positive',
    textColor: 'white',
    classes: 'rounded-borders text-weight-bold shadow-4',
    actions: [
      {
        label: 'อัปเดตเลย',
        color: 'white',
        handler: () => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          triggerReload();
        },
      },
    ],
  });
}

register(import.meta.env.QUASAR_SERVICE_WORKER_FILE, {
  ready() {
    // Service worker is active
  },

  registered(registration) {
    // 1. Immediate check on startup
    registration.update().catch(() => {});

    // 2. Mobile tab return (User unlocks phone or switches back to tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {});
      }
    });

    // 3. Window focus check
    window.addEventListener('focus', () => {
      registration.update().catch(() => {});
    });
  },

  cached() {
    // Content cached for offline use
  },

  updatefound() {
    // New content downloading
  },

  updated(registration) {
    promptOrReload(registration);
  },

  offline() {
    // App running in offline mode
  },

  error(err) {
    console.error('Error during service worker registration:', err);
  },
});
