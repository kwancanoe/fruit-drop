// Pinia Store: Fruit Drop state management (Active Round, Products, Orders, and Admin Auth)
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  getDocs,
  query,
  where,
  orderBy,
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

export const useFruitStore = defineStore('fruit', () => {
  // State
  const openRounds = ref<PreorderRound[]>([]);
  const allRounds = ref<PreorderRound[]>([]);
  const activeRound = ref<PreorderRound | null>(null);
  const products = ref<ProductItem[]>([]);
  const orders = ref<Order[]>([]);
  const isLoading = ref<boolean>(false);
  const authUser = ref<User | null>(null);

  // Firestore listeners
  let unsubscribeOpenRounds: Unsubscribe | null = null;
  let unsubscribeAllRounds: Unsubscribe | null = null;
  let unsubscribeProducts: Unsubscribe | null = null;
  let unsubscribeOrders: Unsubscribe | null = null;

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
    await signOut(auth);
    authUser.value = null;
  }

  // Subscribe to Open Rounds (for Customer flow)
  function subscribeToOpenRounds() {
    if (unsubscribeOpenRounds) unsubscribeOpenRounds();

    const roundsRef = collection(db, 'rounds');
    // Note: Query isOpen without orderBy to avoid requiring a composite index in Firestore; sort in client memory
    const q = query(roundsRef, where('isOpen', '==', true));

    unsubscribeOpenRounds = onSnapshot(q, (snapshot) => {
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
    if (unsubscribeAllRounds) unsubscribeAllRounds();

    const roundsRef = collection(db, 'rounds');
    const q = query(roundsRef, orderBy('createdAt', 'desc'));

    unsubscribeAllRounds = onSnapshot(q, (snapshot) => {
      allRounds.value = snapshot.docs.map(docSnap => ({
        ...docSnap.data() as PreorderRound,
        id: docSnap.id
      }));
    }, (error) => {
      console.warn('Snapshot all rounds error:', error);
    });
  }

  // Select active round to view products and orders
  function selectActiveRound(round: PreorderRound) {
    activeRound.value = round;
    subscribeToProducts(round.roundId);
    subscribeToOrders(round.roundId);
  }

  // Subscribe to Products for a round
  function subscribeToProducts(roundId: string) {
    if (!roundId) {
      products.value = [];
      return;
    }
    if (unsubscribeProducts) unsubscribeProducts();

    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('roundId', '==', roundId));

    unsubscribeProducts = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        products.value = snapshot.docs.map(d => ({ ...d.data() as ProductItem, id: d.id }));
      } else {
        // Only provide fallback if it's default initial round
        if (roundId === 'ROUND-001') {
          products.value = getDefaultProducts(roundId);
        } else {
          products.value = [];
        }
      }
    }, (error) => {
      console.warn('Snapshot products error:', error);
      products.value = [];
    });
  }

  // Subscribe to Orders (Admin & Live Dashboard)
  function subscribeToOrders(roundId: string) {
    if (unsubscribeOrders) unsubscribeOrders();

    const ordersRef = collection(db, 'orders');
    // Note: Query roundId without orderBy to avoid requiring a composite index in Firestore; sort in client memory
    const q = query(ordersRef, where('roundId', '==', roundId));

    unsubscribeOrders = onSnapshot(q, (snapshot) => {
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

      const newOrder: Order = {
        orderId,
        roundId: payload.roundId,
        customer: payload.customer,
        items: payload.items,
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
      await setDoc(orderDocRef, newOrder);

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

  // Upload payment or cash handover photo proof to Firebase Storage
  async function uploadPaymentProof(orderId: string, imageBlob: Blob): Promise<string> {
    const filename = `payment_proofs/${orderId}_${Date.now()}.jpg`;
    const fileRef = sRef(storage, filename);
    await uploadBytes(fileRef, imageBlob, { contentType: 'image/jpeg' });
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  }

  // Admin: Update Order Status (Mark delivered, cash collected, etc.)
  async function updateOrderStatus(orderId: string, updates: Partial<Order>) {
    const targetOrder = orders.value.find(o => o.orderId === orderId);
    if (!targetOrder) return;

    // If order is transitioning to COMPLETED, record attribution audit trail
    if (updates.orderStatus === 'COMPLETED' && !updates.attribution) {
      const userStore = useUserStore();
      const fingerprint = await collectDeviceFingerprint();
      const attribution: OrderAttribution = {
        handledByUserId: authUser.value?.uid || userStore.currentAppUser?.uid || '',
        handledByEmail: authUser.value?.email || userStore.currentAppUser?.email || '',
        handledByName: userStore.currentAppUser?.displayName || authUser.value?.displayName || 'ผู้ช่วยขาย',
        handledByRole: userStore.currentUserRole || 'SELLER',
        deviceFingerprint: fingerprint,
        paymentModeAtHandover: updates.paymentMethod === 'PAY_AT_CAR' || targetOrder.paymentMethod === 'PAY_AT_CAR' ? 'CASH' : 'TRANSFER',
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

    if (targetOrder.id) {
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
      await updateDoc(doc(db, 'orders', targetOrder.id), firestoreUpdates);
    }
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
        const bundles = fruit.fruitKey === 'ngo' ? [
          { qtyKg: 3, price: 100, label: 'ชุด 3 กก. (100 บาท)' },
          { qtyKg: 6, price: 200, label: 'ชุด 6 กก. (200 บาท)' },
          { qtyKg: 9, price: 300, label: 'ชุด 9 กก. (300 บาท)' }
        ] : fruit.fruitKey === 'mangkut' ? [
          { qtyKg: 3, price: 150, label: 'ชุด 3 กก. (150 บาท)' },
          { qtyKg: 5, price: 240, label: 'ชุด 5 กก. (240 บาท)' }
        ] : fruit.fruitKey === 'longkong' ? [
          { qtyKg: 3, price: 130, label: 'ชุด 3 กก. (130 บาท)' }
        ] : undefined;

        const sizeTiers = fruit.fruitKey === 'thurian' ? [
          {
            tierId: 'TIER-SMALL',
            label: 'ลูกเล็ก (1.8 - 2.0 กก.)',
            minKg: 1.8,
            maxKg: 2.0,
            estimatedPriceMin: Math.round(1.8 * fruit.pricePerKg),
            estimatedPriceMax: Math.round(2.0 * fruit.pricePerKg),
            reserveWeightKg: 1.9
          },
          {
            tierId: 'TIER-MEDIUM',
            label: 'ลูกกลาง (2.1 - 3.0 กก.)',
            minKg: 2.1,
            maxKg: 3.0,
            estimatedPriceMin: Math.round(2.1 * fruit.pricePerKg),
            estimatedPriceMax: Math.round(3.0 * fruit.pricePerKg),
            reserveWeightKg: 2.5
          },
          {
            tierId: 'TIER-LARGE',
            label: 'ลูกใหญ่ (3.1 - 4.0 กก.)',
            minKg: 3.1,
            maxKg: 4.0,
            estimatedPriceMin: Math.round(3.1 * fruit.pricePerKg),
            estimatedPriceMax: Math.round(4.0 * fruit.pricePerKg),
            reserveWeightKg: 3.5
          }
        ] : undefined;

        const prodItem: ProductItem = {
          id: prodId,
          roundId,
          name: fruit.name,
          mascotKey: fruit.fruitKey,
          imageUrl: `/mascots/mascot_${fruit.fruitKey}.png`,
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
          const bundles = fruit.fruitKey === 'ngo' ? [
            { qtyKg: 3, price: 100, label: 'ชุด 3 กก. (100 บาท)' },
            { qtyKg: 6, price: 200, label: 'ชุด 6 กก. (200 บาท)' },
            { qtyKg: 9, price: 300, label: 'ชุด 9 กก. (300 บาท)' }
          ] : fruit.fruitKey === 'mangkut' ? [
            { qtyKg: 3, price: 150, label: 'ชุด 3 กก. (150 บาท)' },
            { qtyKg: 5, price: 240, label: 'ชุด 5 กก. (240 บาท)' }
          ] : fruit.fruitKey === 'longkong' ? [
            { qtyKg: 3, price: 130, label: 'ชุด 3 กก. (130 บาท)' }
          ] : undefined;

          const sizeTiers = fruit.fruitKey === 'thurian' ? [
            {
              tierId: 'TIER-SMALL',
              label: 'ลูกเล็ก (1.8 - 2.0 กก.)',
              minKg: 1.8,
              maxKg: 2.0,
              estimatedPriceMin: Math.round(1.8 * fruit.pricePerKg),
              estimatedPriceMax: Math.round(2.0 * fruit.pricePerKg),
              reserveWeightKg: 1.9
            },
            {
              tierId: 'TIER-MEDIUM',
              label: 'ลูกกลาง (2.1 - 3.0 กก.)',
              minKg: 2.1,
              maxKg: 3.0,
              estimatedPriceMin: Math.round(2.1 * fruit.pricePerKg),
              estimatedPriceMax: Math.round(3.0 * fruit.pricePerKg),
              reserveWeightKg: 2.5
            },
            {
              tierId: 'TIER-LARGE',
              label: 'ลูกใหญ่ (3.1 - 4.0 กก.)',
              minKg: 3.1,
              maxKg: 4.0,
              estimatedPriceMin: Math.round(3.1 * fruit.pricePerKg),
              estimatedPriceMax: Math.round(4.0 * fruit.pricePerKg),
              reserveWeightKg: 3.5
            }
          ] : undefined;

          const prodItem: ProductItem = {
            id: prodId,
            roundId,
            name: fruit.name,
            mascotKey: fruit.fruitKey,
            imageUrl: `/mascots/mascot_${fruit.fruitKey}.png`,
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

  // Fetch single order by human-readable orderId across memory & Firestore
  async function getOrderByOrderId(orderId: string): Promise<Order | null> {
    const cleanId = orderId.trim().toUpperCase();
    const inMemory = orders.value.find(o => o.orderId.toUpperCase() === cleanId);
    if (inMemory) return inMemory;

    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('orderId', '==', cleanId));
    const snap = await getDocs(q);
    const firstDoc = snap.docs[0];
    if (firstDoc && firstDoc.exists()) {
      return { ...firstDoc.data() as Order, id: firstDoc.id };
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

    const defaultItems = getDefaultProducts('ROUND-001');
    for (const item of defaultItems) {
      await setDoc(doc(db, 'products', item.id), item);
    }
  }

  return {
    openRounds,
    allRounds,
    activeRound,
    products,
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
    subscribeToOrders,
    selectActiveRound,
    createRound,
    updateRound,
    getRoundById,
    getProductsByRoundId,
    getOrderByOrderId,
    toggleRoundStatus,
    submitOrder,
    updateWeighedFruit,
    updateOrderStatus,
    uploadPaymentProof,
    seedMasterData
  };
});

// Default product catalog templates with transparent PNG mascots
function getDefaultProducts(roundId: string): ProductItem[] {
  return [
    {
      id: 'PROD-NGO',
      roundId,
      name: 'เงาะโรงเรียน',
      mascotKey: 'ngo',
      imageUrl: '/mascots/mascot_ngo.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 35,
      costPerKg: 20,
      totalQuotaKg: 200,
      currentReservedKg: 0,
      minKg: 1,
      stepKg: 1,
      bundles: [
        { qtyKg: 3, price: 100, label: 'ชุด 3 กก. (100 บาท)' },
        { qtyKg: 6, price: 200, label: 'ชุด 6 กก. (200 บาท)' },
        { qtyKg: 9, price: 300, label: 'ชุด 9 กก. (300 บาท)' }
      ]
    },
    {
      id: 'PROD-THURIAN',
      roundId,
      name: 'ทุเรียนหมอนทอง',
      mascotKey: 'thurian',
      imageUrl: '/mascots/mascot_thurian.png',
      productType: 'VARIABLE_WHOLE_FRUIT',
      pricePerKg: 160,
      costPerKg: 110,
      totalQuotaKg: 150,
      currentReservedKg: 0,
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
      ]
    },
    {
      id: 'PROD-MANGKUT',
      roundId,
      name: 'มังคุด',
      mascotKey: 'mangkut',
      imageUrl: '/mascots/mascot_mangkut.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 50,
      costPerKg: 30,
      totalQuotaKg: 100,
      currentReservedKg: 0,
      minKg: 1,
      stepKg: 1,
      bundles: [
        { qtyKg: 3, price: 150, label: 'ชุด 3 กก. (150 บาท)' },
        { qtyKg: 5, price: 240, label: 'ชุด 5 กก. (240 บาท)' }
      ]
    },
    {
      id: 'PROD-LONGKONG',
      roundId,
      name: 'ลองกอง',
      mascotKey: 'longkong',
      imageUrl: '/mascots/mascot_longkong.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 45,
      costPerKg: 25,
      totalQuotaKg: 80,
      currentReservedKg: 0,
      minKg: 1,
      stepKg: 1,
      bundles: [
        { qtyKg: 3, price: 130, label: 'ชุด 3 กก. (130 บาท)' }
      ]
    },
    {
      id: 'PROD-LANGSAT',
      roundId,
      name: 'ลางสาด',
      mascotKey: 'langsat',
      imageUrl: '/mascots/mascot_langsat.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 40,
      costPerKg: 20,
      totalQuotaKg: 60,
      currentReservedKg: 0,
      minKg: 1,
      stepKg: 1
    },
    {
      id: 'PROD-SOM',
      roundId,
      name: 'ส้มสายน้ำผึ้ง',
      mascotKey: 'som',
      imageUrl: '/mascots/mascot_som.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 60,
      costPerKg: 35,
      totalQuotaKg: 80,
      currentReservedKg: 0,
      minKg: 1,
      stepKg: 1
    },
    {
      id: 'PROD-MAMUANG',
      roundId,
      name: 'มะม่วงน้ำดอกไม้',
      mascotKey: 'mamuang',
      imageUrl: '/mascots/mascot_mamuang.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 50,
      costPerKg: 30,
      totalQuotaKg: 80,
      currentReservedKg: 0,
      minKg: 1,
      stepKg: 1
    }
  ];
}
