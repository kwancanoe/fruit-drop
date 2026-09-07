# Project: Fruit Drop Forensic Audit, Zero-Regression Remediation & E2E Testing

## Architecture
- **Framework**: Quasar v2 + Vue 3 (Composition API, `<script setup lang="ts">`) + Vite + Pinia
- **Target**: PWA (`quasar build -m pwa`, `dist/pwa`)
- **Backend**: Firebase Firestore, Firebase Storage, Firebase Auth
- **Design System**: Material Design 3 Expressive 2026 (16px cards, 12px nested containers, 9999px pill buttons, strict Quasar utility classes, banned `q-gutter`)
- **Authentication & RBAC**: 3-tier role model (`SYSTEM_ADMIN`, `SHOP_OWNER`, `SELLER`)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Handover Attribution Fix | Fix PromptPay transfer handover recorded as CASH in audit trail and cashInHandTotal | M1 | Survey 1 §1.4, Survey 2 §1.2 |
| 2 | Order Cancellation State Machine | Implement `CANCELLED` transition & UI confirmation dialog in OrderDetailPage | M1 | Survey 2 §1.2 |
| 3 | Firestore Security Rules Hardening | Patch privilege escalation in `firestore.rules` (restrict self-update to telemetry) | M1 | Survey 2 §1.5 |
| 4 | Admin Route Navigation Guards | Add router `beforeEach` guard to prevent unauthorized navigation to admin pages | M1 | Survey 2 §1.5 |
| 5 | Cross-Round Search Robustness | Strip `#` prefix, normalize phone formats, remove arbitrary 50-limit fallback | M1 | Survey 2 §1.4 |
| 6 | Mock & Stub Elimination | Delete `getDefaultProducts`, hardcoded bundle/tier fallbacks in fruitStore | M2 | Survey 1 §1.1-1.2 |
| 7 | Dead Code Purge | Remove unused `src/stores/example-store.ts` boilerplate store | M2 | Survey 1 §1.1, Survey 3 §1.3 |
| 8 | Pricing Engine Contract Refactoring | Replace regex bundle extraction with typed contracts; fix `0 || 1` zero-kg bug | M2 | Survey 1 §1.5, Survey 2 §1.1 |
| 9 | COGS Snapshot Isolation | Persist `costPerKg` in `OrderItem` at checkout; remove hardcoded cost map in Analytics | M2 | Survey 1 §1.8, Survey 2 §1.3 |
| 10 | Overnight Time Slot Support | Enhance `generateTimeSlots` to handle overnight windows without dummy fallback | M2 | Survey 1 §1.7 |
| 11 | Comprehensive Error Notifications | Wrap and notify on async operations (customer/admin OrderDetailPage, IndexPage) | M2 | Survey 1 §1.9 |
| 12 | Firestore Listener Lifecycle & Cleanup | Export `unsubscribeAll` in stores; register unmount hooks across components | M3 | Survey 3 §1.1 |
| 13 | Storefront Read Leak Prevention | Remove `subscribeToOrders` from customer `MainLayout.vue` | M3 | Survey 3 §1.1 |
| 14 | Tailgate Photo Compression Pipeline | Route payment proof photos through `compressImage` before storage upload | M3 | Survey 3 §1.2 |
| 15 | DRY Logic Deduplication | Centralize `orderHasUnweighedFruit`, reuse status badges, unify user role methods | M3 | Survey 3 §1.3 |
| 16 | Strict Quasar Purity & M3 Tokens | Replace inline hex colors with global SCSS tokens in dialogs, avatar, and scanner | M3 | Survey 3 §1.4 |
| 17 | Programmatic Test Suite | Native `node:test` harness covering pricing, bundles, tare weight, durian scale, slots | M4 | Survey 3 §5.1 |
| 18 | Automated Headless Browser CDP E2E | Chrome DevTools Protocol validating storefront ordering and admin tailgate desk | M4 | Survey 3 §5.2 |
| 19 | Build, Version Bump & Git Commit | Run `pnpm run typecheck` & `pnpm run build`, bump package.json, git commit | M4 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Core State Machine, Security & Attribution | Features 1, 2, 3, 4, 5 | none | DONE |
| M2 | Mock Purge, Data Contracts & Mathematical Precision | Features 6, 7, 8, 9, 10, 11 | M1 | DONE |
| M3 | Performance, Lifecycle Cleanup & Quasar/M3 Compliance | Features 12, 13, 14, 15, 16 | M2 | PLANNED |
| M4 | Comprehensive Automated Testing (Unit & CDP) & Final Gate | Features 17, 18, 19 | M3 | PLANNED |

## Interface Contracts

### Order Handover Attribution Contract (`src/types/fruit_app.ts` & `src/stores/fruitStore.ts`)
- `updateOrderStatus(orderId: string, updates: Partial<Order>)`:
  When transitioning to `orderStatus: 'COMPLETED'`:
  - If paid via PromptPay transfer: `updates.paymentMethod = 'PROMPTPAY_PREPAID'`, `attribution.paymentModeAtHandover = 'TRANSFER'`.
  - If paid via Cash: `updates.paymentMethod = 'PAY_AT_CAR'`, `attribution.paymentModeAtHandover = 'CASH'`.
  - `DispatchPage.vue`: `cashInHandTotal` calculates strictly from `order.attribution?.paymentModeAtHandover === 'CASH'` (or `paymentMethod === 'PAY_AT_CAR'`).

### Order Cancellation Contract
- `cancelOrder(orderId: string, reason?: string)`:
  - Transition `orderStatus` to `'CANCELLED'`.
  - Emit status change to Firestore.
  - UI in `OrderDetailPage.vue` displays confirmation dialog before execution.

### OrderItem Snapshot Contract
- `OrderItem` must snapshot:
  - `productId: string`
  - `productName: string`
  - `pricePerKg: number`
  - `costPerKg: number` (newly required for COGS snapshot isolation)
  - `orderedKg: number`
  - `orderedBundle?: string`
  - `bundleQtyKg?: number`
  - `bundlePrice?: number`
  - `actualWeighedKg?: number`
  - `itemFinalPrice?: number`

### Store Lifecycle Contract
- `fruitStore.ts` & `userStore.ts`:
  - Must export `unsubscribeAll()` / `cleanupStore()` closing all active `onSnapshot` listeners.
  - Components mounting subscriptions must call unsubscription on `onBeforeUnmount`.

## Code Layout
- `src/boot/`: Firebase initialization & app setup
- `src/stores/fruitStore.ts`: Primary store for catalog, rounds, orders, and pricing calculations
- `src/stores/userStore.ts`: RBAC user management and telemetry
- `src/pages/IndexPage.vue`: Customer pre-order storefront
- `src/pages/customer/OrderDetailPage.vue`: Customer order ticket pass
- `src/pages/admin/DispatchPage.vue`: Tailgate dispatch desk
- `src/pages/admin/OrderDetailPage.vue`: Tailgate order fulfillment dossier & durian scale
- `src/pages/admin/RoundsPage.vue`: Pre-order rounds management
- `src/pages/admin/RoundEditPage.vue`: Round creation and pricing configuration
- `src/pages/admin/FruitsPage.vue`: Master fruit catalog
- `src/pages/admin/UsersPage.vue`: Staff management
- `src/pages/admin/AnalyticsPage.vue`: Round and order-level profit & loss analytics
- `src/utils/pricing.ts`: Mathematical pricing engine
- `src/utils/timeSlots.ts`: Single-time interval calculation
- `src/utils/imageCompressor.ts`: Canvas image compression
- `tests/unit/`: Programmatic unit test harness
- `scripts/`: Headless browser testing & migration scripts
