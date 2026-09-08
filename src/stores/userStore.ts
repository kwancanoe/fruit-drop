// Pinia Store: User Management & 3-Tier RBAC for Fruit Drop
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '@/boot/firebase';
import type { AppUser, UserRole } from '@/types/fruit_app';
import { collectDeviceFingerprint } from '@/utils/deviceTelemetry';

export const useUserStore = defineStore('user', () => {
  const users = ref<AppUser[]>([]);
  const currentAppUser = ref<AppUser | null>(null);
  const isLoading = ref<boolean>(false);
  let usersUnsub: Unsubscribe | null = null;

  // Compute current user role
  const currentUserRole = computed<UserRole | null>(() => {
    return currentAppUser.value?.role || null;
  });

  const isSystemAdmin = computed<boolean>(() => {
    return currentAppUser.value?.role === 'SYSTEM_ADMIN';
  });

  const isShopOwner = computed<boolean>(() => {
    return currentAppUser.value?.role === 'SHOP_OWNER';
  });

  const isSeller = computed<boolean>(() => {
    return currentAppUser.value?.role === 'SELLER';
  });

  // Only System Admin and Shop Owner can access User Management
  const canManageUsers = computed<boolean>(() => {
    return isSystemAdmin.value || isShopOwner.value;
  });

  // Allowed roles that the current user can assign when creating/editing users
  const allowedAssignableRoles = computed<UserRole[]>(() => {
    if (isSystemAdmin.value) {
      return ['SYSTEM_ADMIN', 'SHOP_OWNER', 'SELLER'];
    }
    if (isShopOwner.value) {
      return ['SELLER']; // Nong Aon can only create/manage Sellers
    }
    return [];
  });

  // Unsubscribe from Users collection listener
  function unsubscribeUsers() {
    if (usersUnsub) {
      usersUnsub();
      usersUnsub = null;
    }
  }

  // Cleanup store state and listeners
  function cleanupStore() {
    unsubscribeUsers();
    users.value = [];
    currentAppUser.value = null;
  }

  // Subscribe to all users in Firestore
  function subscribeUsers() {
    unsubscribeUsers();

    const usersRef = collection(db, 'users');
    usersUnsub = onSnapshot(usersRef, (snapshot) => {
      users.value = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as AppUser;
        return {
          ...data,
          id: docSnap.id,
          email: data.email || docSnap.id
        };
      });
    }, (err) => {
      console.warn('Users snapshot error:', err);
    });
  }

  // Bind current authenticated user to AppUser profile
  async function bindAuthUser(email: string | null, uid?: string) {
    if (!email) {
      currentAppUser.value = null;
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let found = users.value.find(u => u.email.toLowerCase() === normalizedEmail);

    // Direct Firestore lookup if cache is not yet ready
    if (!found) {
      try {
        const userDocRef = doc(db, 'users', normalizedEmail);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data() as AppUser;
          found = {
            ...data,
            id: snap.id,
            email: data.email || snap.id
          };
        }
      } catch (err) {
        console.warn('Direct user lookup error:', err);
      }
    }

    // Bootstrap fallback if not found in Firestore
    if (!found) {
      if (normalizedEmail === 'wittinunt.k@gmail.com') {
        found = {
          email: normalizedEmail,
          displayName: 'Wittinunt Khansuwan',
          phone: '0653539941',
          role: 'SYSTEM_ADMIN',
          isActive: true,
          createdAt: Date.now()
        };
      } else if (normalizedEmail === 'natyabuyna089@gmail.com') {
        found = {
          email: normalizedEmail,
          displayName: 'นาตยา บุญณะ',
          phone: '0878902935',
          role: 'SHOP_OWNER',
          isActive: true,
          createdAt: Date.now()
        };
      } else if (normalizedEmail === 'kwancanoe@gmail.com') {
        found = {
          email: normalizedEmail,
          displayName: 'Kwan Canoe',
          phone: '',
          role: 'SYSTEM_ADMIN',
          isActive: true,
          createdAt: Date.now()
        };
      }
    }

    currentAppUser.value = found || null;

    // Collect device telemetry and sync to Firestore
    if (found) {
      try {
        const fingerprint = await collectDeviceFingerprint();
        const userDocRef = doc(db, 'users', found.id || normalizedEmail);
        await setDoc(userDocRef, {
          ...found,
          uid: uid || found.uid || '',
          lastLoginAt: Date.now(),
          lastLoginDevice: fingerprint,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        // Ignore telemetry update error if permissions or offline
      }
    }
  }

  // Create or invite new user
  async function addUser(payload: {
    email: string;
    displayName: string;
    phone: string;
    role: UserRole;
  }) {
    if (!canManageUsers.value) {
      throw new Error('คุณไม่มีสิทธิ์ในการเพิ่มผู้ใช้');
    }

    // Shop Owner cannot create System Admin or Shop Owner
    if (isShopOwner.value && payload.role !== 'SELLER') {
      throw new Error('เจ้าของร้านสามารถเพิ่มได้เฉพาะผู้ช่วยขาย (Seller) เท่านั้น');
    }

    isLoading.value = true;
    try {
      const cleanEmail = payload.email.toLowerCase().trim();
      const newUser: AppUser = {
        email: cleanEmail,
        displayName: payload.displayName.trim(),
        phone: payload.phone.trim(),
        role: payload.role,
        isActive: true,
        createdAt: Date.now(),
        createdById: currentAppUser.value?.email || 'SYSTEM'
      };

      const userDocRef = doc(db, 'users', cleanEmail);
      await setDoc(userDocRef, newUser, { merge: true });
    } finally {
      isLoading.value = false;
    }
  }

  // Update existing user
  async function updateUser(targetDocId: string, updates: Partial<AppUser>) {
    if (!canManageUsers.value) {
      throw new Error('คุณไม่มีสิทธิ์ในการแก้ไขผู้ใช้');
    }

    const target = users.value.find(u => u.id === targetDocId || u.email === targetDocId);
    if (!target) throw new Error('ไม่พบข้อมูลผู้ใช้');

    // Shop Owner cannot modify System Admins or Shop Owners
    if (isShopOwner.value && target.role !== 'SELLER') {
      throw new Error('เจ้าของร้านสามารถแก้ไขได้เฉพาะผู้ช่วยขาย (Seller) เท่านั้น');
    }

    // Shop Owner cannot promote someone to non-SELLER
    if (isShopOwner.value && updates.role && updates.role !== 'SELLER') {
      throw new Error('เจ้าของร้านไม่สามารถเปลี่ยนสิทธิ์เป็น Admin หรือ Owner ได้');
    }

    isLoading.value = true;
    try {
      const userDocRef = doc(db, 'users', targetDocId);
      await updateDoc(userDocRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } finally {
      isLoading.value = false;
    }
  }

  // Delete / Deactivate user
  async function deleteUser(targetDocId: string) {
    if (!canManageUsers.value) {
      throw new Error('คุณไม่มีสิทธิ์ในการลบผู้ใช้');
    }

    const target = users.value.find(u => u.id === targetDocId || u.email === targetDocId);
    if (!target) throw new Error('ไม่พบข้อมูลผู้ใช้');

    // Cannot delete yourself
    if (target.email.toLowerCase() === currentAppUser.value?.email.toLowerCase()) {
      throw new Error('ไม่สามารถลบบัญชีของตัวเองได้');
    }

    // Shop Owner can only delete Sellers
    if (isShopOwner.value && target.role !== 'SELLER') {
      throw new Error('เจ้าของร้านสามารถลบได้เฉพาะผู้ช่วยขาย (Seller) เท่านั้น');
    }

    isLoading.value = true;
    try {
      const userDocRef = doc(db, 'users', targetDocId);
      await deleteDoc(userDocRef);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    users,
    currentAppUser,
    isLoading,
    currentUserRole,
    isSystemAdmin,
    isShopOwner,
    isSeller,
    canManageUsers,
    allowedAssignableRoles,
    subscribeUsers,
    unsubscribeUsers,
    cleanupStore,
    bindAuthUser,
    addUser,
    updateUser,
    deleteUser
  };
});
