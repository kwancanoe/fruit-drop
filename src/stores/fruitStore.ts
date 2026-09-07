// Pinia Store: Fruit Drop state management (Active Round, Products, Orders, and Admin Auth)
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';

/**
 * Recursively removes all keys whose value is undefined from an object.
 * Firestore setDoc and updateDoc throw fatal errors if any field value is undefined.
 */
export function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData) as unknown as T;
  }
  // Preserve Firestore FieldValue instances (serverTimestamp, deleteField, etc.)
  if (obj.constructor && obj.constructor.name === 'FieldValue') {
    return obj;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = sanitizeFirestoreData(value);
    }
  }
  return result as T;
}
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, googleProvider } from '@/boot/firebase';
import type {
  MasterFruit,
  PreorderRound,
  ProductItem,
  Order,
  OrderItem,
  CustomerInfo,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  OrderAttribution,
  RoundCreationPayload
} from '@/types/fruit_app';
import { ADMIN_WHITELIST_EMAILS } from '@/types/fruit_app';
import { useUserStore } from '@/stores/userStore';
import { collectDeviceFingerprint } from '@/utils/deviceTelemetry';
import { calculateOrderFinalTotal } from '@/utils/pricing';
import { compressImage } from '@/utils/imageCompressor';

export const useFruitStore = defineStore('fruit', () => {
  // State
  const openRounds = ref<PreorderRound[]>([]);
  const allRounds = ref<PreorderRound[]>([]);
  const activeRound = ref<PreorderRound | null>(null);
  const products = ref<ProductItem[]>([]);
  const masterFruits = ref<MasterFruit[]>([]);
  const orders = ref<Order[]>([]);
  const isLoading = ref<boolean>(false);
  const authUser = ref<User | null>(null);

  // Firestore listener unsubscription handles
  let openRoundsUnsub: Unsubscribe | null = null;
  let allRoundsUnsub: Unsubscribe | null = null;
  let productsUnsub: Unsubscribe | null = null;
  let masterFruitsUnsub: Unsubscribe | null = null;
  let ordersUnsub: Unsubscribe | null = null;

  // Unsubscribe individual listeners
  function unsubscribeOpenRounds() {
    if (openRoundsUnsub) {
      openRoundsUnsub();
      openRoundsUnsub = null;
    }
  }

  function unsubscribeAllRounds() {
    if (allRoundsUnsub) {
      allRoundsUnsub();
      allRoundsUnsub = null;
    }
  }

  function unsubscribeProducts() {
    if (productsUnsub) {
      productsUnsub();
      productsUnsub = null;
    }
  }

  function unsubscribeMasterFruits() {
    if (masterFruitsUnsub) {
      masterFruitsUnsub();
      masterFruitsUnsub = null;
    }
  }

  function unsubscribeOrders() {
    if (ordersUnsub) {
      ordersUnsub();
      ordersUnsub = null;
    }
  }

  // Comprehensive store cleanup: invokes every active unsubscription handle and resets to null
  function unsubscribeAll() {
    unsubscribeOpenRounds();
    unsubscribeAllRounds();
    unsubscribeProducts();
    unsubscribeMasterFruits();
    unsubscribeOrders();
  }

  function cleanupStore() {
    unsubscribeAll();
  }


  // Computed - Active master fruits for round creation
  const activeMasterFruits = computed<MasterFruit[]>(() =>
    masterFruits.value.filter(f => f.isActive)
  );

  // Computed - Allow access if in whitelist or active in users collection
  const isAdmin = computed<boolean>(() => {
    if (!authUser.value || !authUser.value.email) return false;
    const email = authUser.value.email.toLowerCase();
    const userStore = useUserStore();
    return ADMIN_WHITELIST_EMAILS.includes(email) || !!userStore.currentAppUser?.isActive;
  });

  const activeRoundId = computed<string>(() => activeRound.value?.roundId || 'ROUND-001');

  // Initialize Auth state listener and bind userStore profile & device telemetry
  function initAuth() {
    const userStore = useUserStore();
    onAuthStateChanged(auth, (user) => {
      authUser.value = user;
      void userStore.bindAuthUser(user?.email || null, user?.uid);
    });
  }

  // Admin Google Sign-In
  async function loginAdmin() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      authUser.value = result.user;
      return result.user;
    } catch (error) {
      console.error('Firebase Auth Login Error:', error);
      throw error;
    }
  }

  // Admin Sign-Out
  async function logoutAdmin() {
    cleanupStore();
    const userStore = useUserStore();
    userStore.cleanupStore();
    await signOut(auth);
    authUser.value = null;
  }

  // Subscribe to Open Rounds (for Customer flow)
  function subscribeToOpenRounds() {
    unsubscribeOpenRounds();

    const roundsRef = collection(db, 'rounds');
    // Note: Query isOpen without orderBy to avoid requiring a composite index in Firestore; sort in client memory
    const q = query(roundsRef, where('isOpen', '==', true));

    openRoundsUnsub = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(docSnap => ({
        ...docSnap.data() as PreorderRound,
        id: docSnap.id
      }));
      fetched.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
      openRounds.value = fetched;

      // Automatically select first open round if none selected
      const firstOpenRound = openRounds.value[0];
      if (firstOpenRound) {
        if (!activeRound.value || !openRounds.value.some(r => r.roundId === activeRound.value?.roundId)) {
          activeRound.value = firstOpenRound;
          subscribeToProducts(firstOpenRound.roundId);
        }
      } else {
        activeRound.value = null;
        products.value = [];
      }
    }, (error) => {
      console.warn('Snapshot open rounds error:', error);
    });
  }

  // Backward-compatible alias
  function subscribeToActiveRound() {
    subscribeToOpenRounds();
  }

  // Subscribe to All Rounds (for Admin Round Management)
  function subscribeToAllRounds() {
    unsubscribeAllRounds();

    const roundsRef = collection(db, 'rounds');
    const q = query(roundsRef, orderBy('createdAt', 'desc'));

    allRoundsUnsub = onSnapshot(q, (snapshot) => {
      allRounds.value = snapshot.docs.map(docSnap => ({
        ...docSnap.data() as PreorderRound,
        id: docSnap.id
      }));

      // Auto-select saved round or latest OPEN round
      if (allRounds.value.length > 0) {
        let savedRound: PreorderRound | undefined;
        try {
          const savedId = localStorage.getItem('fruit_drop_admin_selected_round');
          if (savedId) {
            savedRound = allRounds.value.find(r => r.roundId === savedId);
          }
        } catch {
          // Ignore localStorage errors
        }

        const currentActive = allRounds.value.find(r => r.roundId === activeRound.value?.roundId);
        if (currentActive) {
          activeRound.value = currentActive;
        } else if (savedRound) {
          selectActiveRound(savedRound);
        } else {
          const firstOpen = allRounds.value.find(r => r.isOpen);
          if (firstOpen) {
            selectActiveRound(firstOpen);
          } else if (allRounds.value[0]) {
            selectActiveRound(allRounds.value[0]);
          }
        }
      }
    }, (error) => {
      console.warn('Snapshot all rounds error:', error);
    });
  }

  // Select active round to view products and orders
  function selectActiveRound(round: PreorderRound) {
    activeRound.value = round;
    try {
      localStorage.setItem('fruit_drop_admin_selected_round', round.roundId);
    } catch {
      // Ignore localStorage errors
    }
    subscribeToProducts(round.roundId);
    subscribeToOrders(round.roundId);
  }

  // Subscribe to Products for a round
  function subscribeToProducts(roundId: string) {
    if (!roundId) {
      products.value = [];
      return;
    }
    unsubscribeProducts();

    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('roundId', '==', roundId));

    productsUnsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        products.value = snapshot.docs.map(d => ({ ...d.data() as ProductItem, id: d.id }));
      } else {
        products.value = [];
      }
    }, (error) => {
      console.warn('Snapshot products error:', error);
      products.value = [];
    });
  }

  // Subscribe to Orders (Admin & Live Dashboard)
  function subscribeToOrders(roundId: string) {
    unsubscribeOrders();

    const ordersRef = collection(db, 'orders');
    // Note: Query roundId without orderBy to avoid requiring a composite index in Firestore; sort in client memory
    const q = query(ordersRef, where('roundId', '==', roundId));

    ordersUnsub = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ ...d.data() as Order, id: d.id }));
      fetched.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
      orders.value = fetched;
    }, (error) => {
      console.warn('Snapshot orders error:', error);
    });
  }

  // Place a new Order
  async function submitOrder(payload: {
    roundId: string;
    customer: CustomerInfo;
    items: OrderItem[];
    pickupSlot: string;
    pickupTime?: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    totalEstimatedPrice: number;
  }): Promise<string> {
    isLoading.value = true;
    try {
      // Human-readable Order ID e.g. "FD-8421"
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderId = `FD-${randomSuffix}`;

      // Ensure all items snapshot costPerKg and bundle contracts
      const snapshottedItems: OrderItem[] = payload.items.map(item => {
        const prod = products.value.find(p => p.id === item.productId);
        const costPerKg = (typeof item.costPerKg === 'number' && !isNaN(item.costPerKg))
          ? item.costPerKg
          : (prod?.costPerKg ?? 0);

        return {
          ...item,
          costPerKg
        };
      });

      const newOrder: Order = {
        orderId,
        roundId: payload.roundId,
        customer: payload.customer,
        items: snapshottedItems,
        pickupSlot: payload.pickupSlot,
        pickupTime: payload.pickupTime || payload.pickupSlot,
        orderStatus: 'WAITING_PICKUP',
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus,
        totalEstimatedPrice: payload.totalEstimatedPrice,
        totalFinalPrice: payload.totalEstimatedPrice,
        createdAt: Date.now()
      };

      const orderDocRef = doc(collection(db, 'orders'));
      await setDoc(orderDocRef, sanitizeFirestoreData(newOrder));

      // Local array optimistic append
      orders.value = [newOrder, ...orders.value];

      return orderId;
    } finally {
      isLoading.value = false;
    }
  }

  // Admin: Update Weighed Fruit (Durian scale calculator)
  async function updateWeighedFruit(orderId: string, itemIndex: number, actualKg: number, finalItemPrice: number) {
    const targetOrder = orders.value.find(o => o.orderId === orderId);
    if (!targetOrder) return;

    const itemToUpdate = targetOrder.items[itemIndex];
    if (!itemToUpdate) return;

    itemToUpdate.actualWeighedKg = actualKg;
    itemToUpdate.itemFinalPrice = finalItemPrice;

    // Recalculate total final price using centralized pricing engine
    const sum = calculateOrderFinalTotal(targetOrder.items, products.value);
    targetOrder.totalFinalPrice = sum;

    // Sync to Firestore if document id exists
    if (targetOrder.id) {
      await updateDoc(doc(db, 'orders', targetOrder.id), {
        items: targetOrder.items,
        totalFinalPrice: sum,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Upload payment or cash handover photo proof to Firebase Storage with automatic compression guard
  async function uploadPaymentProof(orderId: string, imageBlob: Blob | File): Promise<string> {
    // Ensure image is compressed to max 1200x1200px JPEG quality 0.75 (< 300KB) to respect storage.rules (< 5MB)
    let uploadTarget: Blob = imageBlob;
    try {
      if (imageBlob.size > 300 * 1024 || (typeof File !== 'undefined' && imageBlob instanceof File)) {
        const compressed = await compressImage(imageBlob, 1200, 1200, 0.75);
        uploadTarget = compressed.blob;
      }
    } catch (compressionErr) {
      console.warn('Image compression fallback to raw blob in fruitStore:', compressionErr);
      uploadTarget = imageBlob;
    }

    const filename = `payment_proofs/${orderId}_${Date.now()}.jpg`;
    const fileRef = sRef(storage, filename);
    await uploadBytes(fileRef, uploadTarget, { contentType: 'image/jpeg' });
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  }

  // Admin: Update Order Status (Mark delivered, cash collected, etc.)
  async function updateOrderStatus(orderId: string, updates: Partial<Order>) {
    const cleanId = orderId.trim().toUpperCase();
    let targetOrder = orders.value.find(o => o.orderId.toUpperCase() === cleanId);
    let orderDocId = targetOrder?.id;

    // Fallback: If not present in memory array, fetch document from Firestore
    if (!targetOrder) {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('orderId', '==', cleanId));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0]) {
        targetOrder = { ...snap.docs[0].data() as Order, id: snap.docs[0].id };
        orderDocId = snap.docs[0].id;
      } else {
        console.warn(`[fruitStore] updateOrderStatus: Order not found: ${orderId}`);
        return;
      }
    }

    // If order is transitioning to COMPLETED, record attribution audit trail
    if (updates.orderStatus === 'COMPLETED' && !updates.attribution) {
      const userStore = useUserStore();
      const fingerprint = await collectDeviceFingerprint();
      const effectivePaymentMethod = updates.paymentMethod ?? targetOrder.paymentMethod;
      const attribution: OrderAttribution = {
        handledByUserId: authUser.value?.uid || userStore.currentAppUser?.uid || '',
        handledByEmail: authUser.value?.email || userStore.currentAppUser?.email || '',
        handledByName: userStore.currentAppUser?.displayName || authUser.value?.displayName || 'ผู้ช่วยขาย',
        handledByRole: userStore.currentUserRole || 'SELLER',
        deviceFingerprint: fingerprint,
        paymentModeAtHandover: effectivePaymentMethod === 'PAY_AT_CAR' ? 'CASH' : 'TRANSFER',
        proofCapturedAt: Date.now()
      };
      updates.attribution = attribution;
    }

    // Apply updates to local targetOrder in-memory state
    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined) {
        delete (targetOrder as any)[key];
      } else {
        (targetOrder as any)[key] = val;
      }
    }

    if (orderDocId) {
      const firestoreUpdates: Record<string, any> = {
        updatedAt: serverTimestamp()
      };
      for (const [key, val] of Object.entries(updates)) {
        if (val === undefined) {
          firestoreUpdates[key] = deleteField();
        } else {
          firestoreUpdates[key] = sanitizeFirestoreData(val);
        }
      }
      await updateDoc(doc(db, 'orders', orderDocId), firestoreUpdates);
    }
  }

  // Admin / Seller: Cancel an Order with reason audit trail
  async function cancelOrder(orderId: string, reason?: string): Promise<void> {
    const cleanId = orderId.trim().toUpperCase();
    let targetOrder = orders.value.find(o => o.orderId.toUpperCase() === cleanId);
    let docId = targetOrder?.id;

    if (!docId) {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('orderId', '==', cleanId));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0]) {
        docId = snap.docs[0].id;
        targetOrder = { ...snap.docs[0].data() as Order, id: docId };
      }
    }

    if (!docId) throw new Error(`Order #${orderId} not found`);

    const cancelTimestamp = Date.now();
    const finalReason = reason?.trim() || 'ลูกค้าไม่มารับตามนัด (No-show)';

    if (targetOrder) {
      targetOrder.orderStatus = 'CANCELLED';
      targetOrder.cancelledAt = cancelTimestamp;
      targetOrder.cancelReason = finalReason;
    }

    await updateDoc(doc(db, 'orders', docId), {
      orderStatus: 'CANCELLED',
      cancelledAt: cancelTimestamp,
      cancelReason: finalReason,
      updatedAt: serverTimestamp()
    });
  }

  // Admin / Seller: Revert a Cancelled Order back to WAITING_PICKUP
  async function revertOrderCancellation(orderId: string): Promise<void> {
    const cleanId = orderId.trim().toUpperCase();
    let targetOrder = orders.value.find(o => o.orderId.toUpperCase() === cleanId);
    let docId = targetOrder?.id;

    if (!docId) {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('orderId', '==', cleanId));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0]) {
        docId = snap.docs[0].id;
        targetOrder = { ...snap.docs[0].data() as Order, id: docId };
      }
    }

    if (!docId) throw new Error(`Order #${orderId} not found`);

    if (targetOrder) {
      targetOrder.orderStatus = 'WAITING_PICKUP';
      delete targetOrder.cancelledAt;
      delete targetOrder.cancelReason;
    }

    await updateDoc(doc(db, 'orders', docId), {
      orderStatus: 'WAITING_PICKUP',
      cancelledAt: deleteField(),
      cancelReason: deleteField(),
      updatedAt: serverTimestamp()
    });
  }

  // Create and publish a new Preorder Round with selected fruits
  async function createRound(payload: RoundCreationPayload): Promise<string> {
    isLoading.value = true;
    try {
      const timestamp = Date.now();
      const roundId = `ROUND-${timestamp.toString().slice(-6)}`;
      const enabledFruits = payload.fruits.filter(f => f.isEnabled);
      const fruitNames = enabledFruits.map(f => f.name);

      const newRound: PreorderRound = {
        roundId,
        title: payload.title || `รอบส่งผลไม้ ${payload.pickupDate}`,
        pickupDate: payload.pickupDate,
        pickupLocation: payload.pickupLocation,
        pickupSlots: payload.pickupSlots,
        standbyTime: payload.standbyTime,
        standbyStartTime: payload.standbyStartTime,
        standbyEndTime: payload.standbyEndTime,
        promptPayNumber: payload.promptPayNumber,
        promptPayName: payload.promptPayName,
        bankName: payload.bankName || 'KBANK (กสิกรไทย)',
        bankAccountNumber: payload.bankAccountNumber || '8172235408',
        bankAccountName: payload.bankAccountName || payload.promptPayName || 'นาตยา บุญณะ',
        isOpen: true,
        fruitSummary: fruitNames,
        createdAt: timestamp
      };

      // 1. Save round document
      await setDoc(doc(db, 'rounds', roundId), sanitizeFirestoreData(newRound));

      // 2. Save configured products for this round
      for (const fruit of enabledFruits) {
        const prodId = `PROD-${roundId}-${fruit.fruitKey.toUpperCase()}`;
        const masterFruit = masterFruits.value.find(m => m.fruitKey === fruit.fruitKey)
          || DEFAULT_MASTER_FRUITS.find(m => m.fruitKey === fruit.fruitKey);
        const bundles = masterFruit?.bundles && masterFruit.bundles.length > 0
          ? masterFruit.bundles
          : undefined;

        const sizeTiers = masterFruit?.sizeTiers && masterFruit.sizeTiers.length > 0
          ? masterFruit.sizeTiers.map(tier => ({
              ...tier,
              estimatedPriceMin: Math.round(tier.minKg * fruit.pricePerKg),
              estimatedPriceMax: Math.round(tier.maxKg * fruit.pricePerKg)
            }))
          : undefined;

        const prodItem: ProductItem = {
          id: prodId,
          roundId,
          name: fruit.name,
          mascotKey: fruit.fruitKey,
          imageUrl: fruit.imageUrl || masterFruit?.imageUrl || `/mascots/mascot_${fruit.fruitKey}.png`,
          productType: fruit.productType,
          pricePerKg: fruit.pricePerKg,
          costPerKg: fruit.costPerKg || 0,
          totalQuotaKg: fruit.totalQuotaKg,
          currentReservedKg: 0,
          minKg: 1,
          stepKg: 1,
          ...(bundles ? { bundles } : {}),
          ...(sizeTiers ? { sizeTiers } : {})
        };

        await setDoc(doc(db, 'products', prodId), sanitizeFirestoreData(prodItem));
      }

      // Sync active round immediately
      activeRound.value = newRound;
      subscribeToProducts(roundId);
      subscribeToOrders(roundId);

      return roundId;
    } finally {
      isLoading.value = false;
    }
  }

  // Update an existing Preorder Round and its fruit catalog
  async function updateRound(roundId: string, payload: import('@/types/fruit_app').RoundUpdatePayload): Promise<void> {
    isLoading.value = true;
    try {
      const enabledFruits = payload.fruits.filter(f => f.isEnabled);
      const fruitNames = enabledFruits.map(f => f.name);

      const roundUpdates = {
        title: payload.title,
        pickupDate: payload.pickupDate,
        pickupLocation: payload.pickupLocation,
        pickupSlots: payload.pickupSlots,
        standbyTime: payload.standbyTime,
        standbyStartTime: payload.standbyStartTime,
        standbyEndTime: payload.standbyEndTime,
        promptPayNumber: payload.promptPayNumber,
        promptPayName: payload.promptPayName,
        bankName: payload.bankName || 'KBANK (กสิกรไทย)',
        bankAccountNumber: payload.bankAccountNumber || '8172235408',
        bankAccountName: payload.bankAccountName || payload.promptPayName,
        isOpen: payload.isOpen,
        fruitSummary: fruitNames,
        updatedAt: serverTimestamp()
      };

      // 1. Update round document
      await updateDoc(doc(db, 'rounds', roundId), sanitizeFirestoreData(roundUpdates));

      // 2. Fetch existing products for this round to preserve currentReservedKg
      const existingProducts = await getProductsByRoundId(roundId);
      const existingMap = new Map(existingProducts.map(p => [p.mascotKey, p]));

      // 3. Upsert configured products for this round
      for (const fruit of payload.fruits) {
        const prodId = `PROD-${roundId}-${fruit.fruitKey.toUpperCase()}`;
        const existing = existingMap.get(fruit.fruitKey);

        if (fruit.isEnabled) {
          const masterFruit = masterFruits.value.find(m => m.fruitKey === fruit.fruitKey)
            || DEFAULT_MASTER_FRUITS.find(m => m.fruitKey === fruit.fruitKey);
          const bundles = masterFruit?.bundles && masterFruit.bundles.length > 0
            ? masterFruit.bundles
            : (existing?.bundles || undefined);

          const sizeTiers = masterFruit?.sizeTiers && masterFruit.sizeTiers.length > 0
            ? masterFruit.sizeTiers.map(tier => ({
                ...tier,
                estimatedPriceMin: Math.round(tier.minKg * fruit.pricePerKg),
                estimatedPriceMax: Math.round(tier.maxKg * fruit.pricePerKg)
              }))
            : (existing?.sizeTiers || undefined);

          const prodItem: ProductItem = {
            id: prodId,
            roundId,
            name: fruit.name,
            mascotKey: fruit.fruitKey,
            imageUrl: fruit.imageUrl || masterFruit?.imageUrl || existing?.imageUrl || `/mascots/mascot_${fruit.fruitKey}.png`,
            productType: fruit.productType,
            pricePerKg: fruit.pricePerKg,
            costPerKg: fruit.costPerKg || 0,
            totalQuotaKg: fruit.totalQuotaKg,
            currentReservedKg: existing?.currentReservedKg || 0,
            minKg: 1,
            stepKg: 1,
            ...(bundles ? { bundles } : {}),
            ...(sizeTiers ? { sizeTiers } : {})
          };
          await setDoc(doc(db, 'products', prodId), sanitizeFirestoreData(prodItem));
        } else if (existing) {
          // If disabled and previously existed, delete product doc so customer cannot book
          await deleteDoc(doc(db, 'products', prodId));
        }
      }

      // 4. Update local activeRound state if active
      if (activeRound.value?.roundId === roundId) {
        activeRound.value = {
          ...activeRound.value,
          ...payload,
          fruitSummary: fruitNames
        };
        subscribeToProducts(roundId);
      }
    } finally {
      isLoading.value = false;
    }
  }

  // Fetch round by ID directly
  async function getRoundById(roundId: string): Promise<PreorderRound | null> {
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'rounds', roundId));
    if (snap.exists()) {
      return { ...snap.data() as PreorderRound, id: snap.id };
    }
    return null;
  }

  // Fetch products by round ID directly
  async function getProductsByRoundId(roundId: string): Promise<ProductItem[]> {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('roundId', '==', roundId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() as ProductItem, id: d.id }));
  }

  // Helper: Extract search candidates for Order ID and Telephone number
  function extractSearchCandidates(searchQuery: string): {
    orderIdCandidates: string[];
    phoneCandidates: string[];
    cleanDigits: string;
    rawText: string;
  } {
    const raw = searchQuery.trim();
    if (!raw) return { orderIdCandidates: [], phoneCandidates: [], cleanDigits: '', rawText: '' };

    const stripped = raw.replace(/^[#№]\s*/, '').trim();
    const cleanUpper = stripped.toUpperCase().replace(/\s+/g, '');
    const cleanDigits = raw.replace(/\D/g, '');

    const orderIdSet = new Set<string>();
    const phoneSet = new Set<string>();

    if (cleanUpper) orderIdSet.add(cleanUpper);

    const fdMatch = cleanUpper.match(/^FD[\s-_]?(\d{4})$/i);
    if (fdMatch && fdMatch[1]) {
      orderIdSet.add(`FD-${fdMatch[1]}`);
      orderIdSet.add(fdMatch[1]);
    } else if (/^\d{4}$/.test(stripped)) {
      orderIdSet.add(`FD-${stripped}`);
      orderIdSet.add(stripped);
    }

    let phoneDigits = cleanDigits;
    if (phoneDigits.startsWith('66') && phoneDigits.length >= 11) {
      phoneDigits = '0' + phoneDigits.slice(2);
    }

    if (phoneDigits.length >= 9 && phoneDigits.length <= 11) {
      phoneSet.add(phoneDigits);
      phoneSet.add(raw);
      if (phoneDigits.length === 10) {
        phoneSet.add(phoneDigits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'));
        phoneSet.add(phoneDigits.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'));
      } else if (phoneDigits.length === 9) {
        phoneSet.add(phoneDigits.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3'));
        phoneSet.add(phoneDigits.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3'));
      }
    }

    return {
      orderIdCandidates: Array.from(orderIdSet),
      phoneCandidates: Array.from(phoneSet),
      cleanDigits,
      rawText: raw
    };
  }

  // Fetch single order by human-readable orderId across memory & Firestore
  async function getOrderByOrderId(orderId: string): Promise<Order | null> {
    const raw = orderId.trim();
    if (!raw) return null;
    const { orderIdCandidates } = extractSearchCandidates(raw);

    const inMemory = orders.value.find(o => {
      const oIdUpper = (o.orderId || '').toUpperCase().trim();
      return orderIdCandidates.some(c => c.toUpperCase() === oIdUpper);
    });
    if (inMemory) return inMemory;

    if (orderIdCandidates.length > 0) {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('orderId', 'in', orderIdCandidates.slice(0, 10)));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0]) {
        return { ...snap.docs[0].data() as Order, id: snap.docs[0].id };
      }
    }

    try {
      const docSnap = await getDoc(doc(db, 'orders', raw));
      if (docSnap.exists()) {
        return { ...docSnap.data() as Order, id: docSnap.id };
      }
    } catch {
      // Safely ignore doc lookup errors
    }
    return null;
  }

  // Search single order across all rounds in memory and Firestore by Order ID or Phone number
  async function searchOrderAcrossRounds(searchQuery: string): Promise<Order | null> {
    const raw = searchQuery.trim();
    if (!raw) return null;
    const { orderIdCandidates, phoneCandidates, cleanDigits } = extractSearchCandidates(raw);

    // 1. Search in local active memory first
    const inMemory = orders.value.find(o => {
      const orderPhoneDigits = (o.customer?.phone || '').replace(/\D/g, '');
      const orderIdClean = (o.orderId || '').toUpperCase().trim();
      const matchId = orderIdCandidates.some(c => c.toUpperCase() === orderIdClean);
      const matchPhone = cleanDigits.length >= 4 && (
        orderPhoneDigits === cleanDigits ||
        (cleanDigits.length >= 9 && orderPhoneDigits.includes(cleanDigits)) ||
        phoneCandidates.some(p => (o.customer?.phone || '') === p)
      );
      const matchName = o.customer?.name && o.customer.name.toLowerCase().includes(raw.toLowerCase());
      return matchId || matchPhone || matchName;
    });
    if (inMemory) return inMemory;

    const ordersRef = collection(db, 'orders');

    // 2. Query Firestore by Order ID candidates (indexed)
    if (orderIdCandidates.length > 0) {
      const orderIdQuery = query(ordersRef, where('orderId', 'in', orderIdCandidates.slice(0, 10)));
      const orderIdSnap = await getDocs(orderIdQuery);
      if (!orderIdSnap.empty && orderIdSnap.docs[0]) {
        return { ...orderIdSnap.docs[0].data() as Order, id: orderIdSnap.docs[0].id };
      }
    }

    // 3. Query Firestore by customer phone candidates (indexed)
    if (phoneCandidates.length > 0) {
      const phoneQuery = query(ordersRef, where('customer.phone', 'in', phoneCandidates.slice(0, 10)));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
        const sorted = phoneSnap.docs
          .map(d => ({ ...d.data() as Order, id: d.id }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return sorted[0] || null;
      }
    }

    return null;
  }

  // Toggle round open/closed status
  async function toggleRoundStatus(roundId: string, isOpen: boolean) {
    await updateDoc(doc(db, 'rounds', roundId), {
      isOpen,
      updatedAt: serverTimestamp()
    });
  }

  // Seed default master products to Firestore
  async function seedMasterData() {
    const roundDoc = doc(db, 'rounds', 'ROUND-001');
    const defaultRound: PreorderRound = {
      roundId: 'ROUND-001',
      title: 'รอบส่งผลไม้ Fruit Drop',
      pickupDate: 'วันอังคารที่ 8 กันยายน 2569',
      pickupLocation: 'ท้ายรถลานจอดรถห้าง เสา B12 ชั้น 1B',
      standbyStartTime: '19:00',
      standbyEndTime: '23:00',
      standbyTime: '19:00 - 23:00',
      pickupSlots: ['19:00 น.', '19:30 น.', '20:00 น.', '20:30 น.', '21:00 น.', '21:30 น.', '22:00 น.', '22:30 น.', '23:00 น.'],
      promptPayNumber: '0878902935',
      promptPayName: 'นาตยา บุญณะ',
      bankName: 'KBANK (กสิกรไทย)',
      bankAccountNumber: '8172235408',
      bankAccountName: 'นาตยา บุญณะ',
      isOpen: true,
      fruitSummary: ['เงาะโรงเรียน', 'ทุเรียนหมอนทอง'],
      createdAt: Date.now()
    };
    await setDoc(roundDoc, defaultRound);

    for (const mf of DEFAULT_MASTER_FRUITS) {
      const prodId = `PROD-ROUND-001-${mf.fruitKey.toUpperCase()}`;
      const prodItem: ProductItem = {
        id: prodId,
        roundId: 'ROUND-001',
        name: mf.name,
        mascotKey: mf.fruitKey,
        imageUrl: mf.imageUrl || `/mascots/mascot_${mf.fruitKey}.png`,
        productType: mf.productType,
        pricePerKg: mf.defaultPricePerKg,
        costPerKg: mf.defaultCostPerKg || 0,
        totalQuotaKg: mf.defaultTotalQuotaKg || 100,
        currentReservedKg: 0,
        minKg: 1,
        stepKg: 1,
        ...(mf.bundles ? { bundles: mf.bundles } : {}),
        ...(mf.sizeTiers ? { sizeTiers: mf.sizeTiers } : {})
      };
      await setDoc(doc(db, 'products', prodId), sanitizeFirestoreData(prodItem));
      await setDoc(doc(db, 'master_fruits', mf.id), sanitizeFirestoreData(mf));
    }
  }

  // Master Fruits Subscription (Ordered by sortOrder)
  function subscribeToMasterFruits() {
    unsubscribeMasterFruits();

    const fruitsRef = collection(db, 'master_fruits');
    masterFruitsUnsub = onSnapshot(fruitsRef, (snapshot) => {
      if (snapshot.empty) {
        masterFruits.value = [];
        return;
      }

      const fetched = snapshot.docs.map(docSnap => ({
        ...docSnap.data() as MasterFruit,
        id: docSnap.id
      }));

      fetched.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
      masterFruits.value = fetched;
    }, (error) => {
      console.warn('Snapshot master fruits error:', error);
      masterFruits.value = [];
    });
  }

  // Save / Update Master Fruit
  async function saveMasterFruit(fruitData: Partial<MasterFruit> & { name: string; fruitKey: string }): Promise<void> {
    const id = fruitData.id || fruitData.fruitKey.trim().toLowerCase();

    const payload: MasterFruit = {
      id,
      fruitKey: id,
      name: fruitData.name.trim(),
      productType: fruitData.productType || 'FIXED_WEIGHT',
      defaultPricePerKg: Number(fruitData.defaultPricePerKg) || 0,
      defaultCostPerKg: Number(fruitData.defaultCostPerKg) || 0,
      defaultTotalQuotaKg: Number(fruitData.defaultTotalQuotaKg) || 100,
      imageUrl: fruitData.imageUrl || `/mascots/mascot_${id}.png`,
      avatarType: fruitData.avatarType || 'PREDEFINED',
      ...(fruitData.bundles ? { bundles: fruitData.bundles } : {}),
      ...(fruitData.sizeTiers ? { sizeTiers: fruitData.sizeTiers } : {}),
      isActive: fruitData.isActive !== undefined ? fruitData.isActive : true,
      sortOrder: fruitData.sortOrder !== undefined ? fruitData.sortOrder : (masterFruits.value.length + 1),
      createdAt: fruitData.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    await setDoc(doc(db, 'master_fruits', id), sanitizeFirestoreData(payload));
  }

  // Toggle Master Fruit Active / Inactive (Soft delete)
  async function toggleMasterFruitActive(id: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(db, 'master_fruits', id), {
      isActive,
      updatedAt: Date.now()
    });
  }

  // Delete Master Fruit (Soft delete by default to protect historical order integrity)
  async function deleteMasterFruit(id: string): Promise<void> {
    await updateDoc(doc(db, 'master_fruits', id), {
      isActive: false,
      updatedAt: Date.now()
    });
  }

  // Upload fruit mascot / custom avatar image to Firebase Storage with compression
  async function uploadFruitImage(file: File | Blob, fruitKey: string): Promise<string> {
    const compressed = await compressImage(file, 600, 600, 0.85);
    const filename = `fruits/mascot_${fruitKey}_${Date.now()}.jpg`;
    const fileRef = sRef(storage, filename);
    await uploadBytes(fileRef, compressed.blob);
    return await getDownloadURL(fileRef);
  }

  return {
    openRounds,
    allRounds,
    activeRound,
    products,
    masterFruits,
    activeMasterFruits,
    orders,
    isLoading,
    authUser,
    isAdmin,
    activeRoundId,
    initAuth,
    loginAdmin,
    logoutAdmin,
    subscribeToOpenRounds,
    subscribeToAllRounds,
    subscribeToActiveRound,
    subscribeToProducts,
    subscribeToMasterFruits,
    subscribeToOrders,
    unsubscribeOpenRounds,
    unsubscribeAllRounds,
    unsubscribeProducts,
    unsubscribeMasterFruits,
    unsubscribeOrders,
    unsubscribeAll,
    cleanupStore,
    selectActiveRound,
    createRound,
    updateRound,
    getRoundById,
    getProductsByRoundId,
    getOrderByOrderId,
    searchOrderAcrossRounds,
    toggleRoundStatus,
    saveMasterFruit,
    toggleMasterFruitActive,
    deleteMasterFruit,
    uploadFruitImage,
    submitOrder,
    updateWeighedFruit,
    updateOrderStatus,
    cancelOrder,
    revertOrderCancellation,
    extractSearchCandidates,
    uploadPaymentProof,
    seedMasterData
  };
});

// Default 7 Master Fruits Template for initial database seed
export const DEFAULT_MASTER_FRUITS: MasterFruit[] = [
  {
    id: 'ngo',
    fruitKey: 'ngo',
    name: 'เงาะโรงเรียน',
    productType: 'FIXED_WEIGHT',
    defaultPricePerKg: 35,
    defaultCostPerKg: 20,
    defaultTotalQuotaKg: 200,
    imageUrl: '/mascots/mascot_ngo.png',
    avatarType: 'PREDEFINED',
    bundles: [
      { qtyKg: 3, price: 100, label: 'ชุด 3 กก. (100 บาท)' },
      { qtyKg: 6, price: 200, label: 'ชุด 6 กก. (200 บาท)' },
      { qtyKg: 9, price: 300, label: 'ชุด 9 กก. (300 บาท)' }
    ],
    isActive: true,
    sortOrder: 1,
    createdAt: 1725580800000
  },
  {
    id: 'thurian',
    fruitKey: 'thurian',
    name: 'ทุเรียนหมอนทอง',
    productType: 'VARIABLE_WHOLE_FRUIT',
    defaultPricePerKg: 160,
    defaultCostPerKg: 110,
    defaultTotalQuotaKg: 150,
    imageUrl: '/mascots/mascot_thurian.png',
    avatarType: 'PREDEFINED',
    sizeTiers: [
      {
        tierId: 'TIER-SMALL',
        label: 'ลูกเล็ก (1.8 - 2.0 กก.)',
        minKg: 1.8,
        maxKg: 2.0,
        estimatedPriceMin: 288,
        estimatedPriceMax: 320,
        reserveWeightKg: 1.9
      },
      {
        tierId: 'TIER-MEDIUM',
        label: 'ลูกกลาง (2.1 - 3.0 กก.)',
        minKg: 2.1,
        maxKg: 3.0,
        estimatedPriceMin: 336,
        estimatedPriceMax: 480,
        reserveWeightKg: 2.5
      },
      {
        tierId: 'TIER-LARGE',
        label: 'ลูกใหญ่ (3.1 - 4.0 กก.)',
        minKg: 3.1,
        maxKg: 4.0,
        estimatedPriceMin: 496,
        estimatedPriceMax: 640,
        reserveWeightKg: 3.5
      }
    ],
    isActive: true,
    sortOrder: 2,
    createdAt: 1725580800000
  },
  {
    id: 'mangkut',
    fruitKey: 'mangkut',
    name: 'มังคุด',
    productType: 'FIXED_WEIGHT',
    defaultPricePerKg: 50,
    defaultCostPerKg: 30,
    defaultTotalQuotaKg: 100,
    imageUrl: '/mascots/mascot_mangkut.png',
    avatarType: 'PREDEFINED',
    bundles: [
      { qtyKg: 3, price: 150, label: 'ชุด 3 กก. (150 บาท)' },
      { qtyKg: 5, price: 240, label: 'ชุด 5 กก. (240 บาท)' }
    ],
    isActive: true,
    sortOrder: 3,
    createdAt: 1725580800000
  },
  {
    id: 'longkong',
    fruitKey: 'longkong',
    name: 'ลองกอง',
    productType: 'FIXED_WEIGHT',
    defaultPricePerKg: 45,
    defaultCostPerKg: 25,
    defaultTotalQuotaKg: 80,
    imageUrl: '/mascots/mascot_longkong.png',
    avatarType: 'PREDEFINED',
    bundles: [
      { qtyKg: 3, price: 130, label: 'ชุด 3 กก. (130 บาท)' }
    ],
    isActive: true,
    sortOrder: 4,
    createdAt: 1725580800000
  },
  {
    id: 'langsat',
    fruitKey: 'langsat',
    name: 'ลางสาด',
    productType: 'FIXED_WEIGHT',
    defaultPricePerKg: 40,
    defaultCostPerKg: 20,
    defaultTotalQuotaKg: 60,
    imageUrl: '/mascots/mascot_langsat.png',
    avatarType: 'PREDEFINED',
    isActive: true,
    sortOrder: 5,
    createdAt: 1725580800000
  },
  {
    id: 'som',
    fruitKey: 'som',
    name: 'ส้มสายน้ำผึ้ง',
    productType: 'FIXED_WEIGHT',
    defaultPricePerKg: 60,
    defaultCostPerKg: 35,
    defaultTotalQuotaKg: 80,
    imageUrl: '/mascots/mascot_som.png',
    avatarType: 'PREDEFINED',
    isActive: true,
    sortOrder: 6,
    createdAt: 1725580800000
  },
  {
    id: 'mamuang',
    fruitKey: 'mamuang',
    name: 'มะม่วงน้ำดอกไม้',
    productType: 'FIXED_WEIGHT',
    defaultPricePerKg: 50,
    defaultCostPerKg: 30,
    defaultTotalQuotaKg: 80,
    imageUrl: '/mascots/mascot_mamuang.png',
    avatarType: 'PREDEFINED',
    isActive: true,
    sortOrder: 7,
    createdAt: 1725580800000
  }
];


