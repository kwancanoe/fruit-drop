# Test Readiness Document: Fruit Drop (Milestone 4)

## Test Runners & Commands

### 1. Milestone 4 Comprehensive Verification Suite
Executes the full 4-tier programmatic verification suite covering Features 1 through 7 across Happy-Path (Tier 1), Boundary (Tier 2), Pairwise (Tier 3), and Real-World Scenarios (Tier 4).
```bash
node --test tests/unit/pricing_and_state.test.mjs
```

### 2. Zero-Dependency Headless Browser CDP E2E Automation
Launches headless Chrome/Edge via Chrome DevTools Protocol (CDP), serves `dist/pwa` over a local HTTP server, and verifies storefront brand purity, page title, meta tags, order lookup modal interaction, admin gate navigation, and zero console/runtime exceptions.
```bash
node scripts/test_e2e_cdp.mjs
```

### 3. Full Project Unit Test Suite (All Milestones M1-M4)
Runs all unit test suites in the repository, including security rules, router guards, image compression, lifecycle cleanup, empirical time slots, and pricing stress tests.
```bash
node --test tests/unit/*.test.mjs
```

### 4. TypeScript Typecheck & PWA Build Verification
```bash
pnpm run typecheck
pnpm run build
```

---

## Coverage Summary

| Test Tier | Scope & Methodology | Minimum Required | Actual Tests | Status |
|---|---|:---:|:---:|:---:|
| **Tier 1** | Happy-path isolation across Features 1-7 | ≥35 (5/feat) | 35 | PASS (100%) |
| **Tier 2** | Boundary value analysis, zero-guards, negative weights, nulls | ≥35 (5/feat) | 35 | PASS (100%) |
| **Tier 3** | Pairwise combinations (Payment x Fruit Type x Order Status) | ≥12 | 18 | PASS (100%) |
| **Tier 4** | Real-world customer and tailgate seller end-to-end user journeys | ≥5 | 5 | PASS (100%) |
| **Total M4 Suite** | `tests/unit/pricing_and_state.test.mjs` | **≥87** | **93** | **PASS (100%)** |
| **Headless CDP E2E** | `scripts/test_e2e_cdp.mjs` live browser verification | 1 suite | 4 steps verified | **PASS (100%)** |
| **Full Project Harness** | `tests/unit/*.test.mjs` (All 9 test suites) | - | **272** | **PASS (100%)** |

---

## Feature Checklist Matrix

| # | Feature | Tier 1 (Happy-Path) | Tier 2 (Boundary & Guards) | Tier 3 (Pairwise) | Tier 4 (E2E Journey) | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **F1** | **Fixed-Weight Bundle Pricing** | 5 cases (1kg, 3kg, 5kg, multi-item, label match) | 5 cases (0kg guard, -1kg/-5kg, 2.5kg fractional, unbundled 4kg, exceeding 6kg) | Included in 18 combinations | Journey 1 & 3 | **VERIFIED** |
| **F2** | **Durian Scale & Tare Math** | 5 cases (net deduction, single scale, multi-scale, variant scale, zero-tare) | 5 cases (0kg unweighed, negative gross, tare > gross, gram precision, gating) | Included in 18 combinations | Journey 1 & 2 | **VERIFIED** |
| **F3** | **Order Total & Item Subtotals** | 5 cases (single, mixed bundle/scale, bundle vs non-bundle, final price override, multi-durian) | 5 cases (empty cart, all 0kg, 500kg bulk, float rounding, invalid item handling) | Included in 18 combinations | Journey 1, 2, 3 | **VERIFIED** |
| **F4** | **Order State Transitions** | 5 cases (WAITING -> COMPLETED (cash/transfer), WAITING -> CANCELLED, revert, WEIGHING transition) | 5 cases (reject COMPLETED->CANCELLED, reject COMPLETED->WAITING, invalid status rejection, reason preservation, timestamp cleanup) | Included in 18 combinations | Journey 2, 3, 4 | **VERIFIED** |
| **F5** | **Handover Payment Attribution** | 5 cases (CASH attribution, TRANSFER attribution, staff identity, timestamp, device fingerprint) | 5 cases (disjoint sets, legacy cash fallback, legacy transfer fallback, CANCELLED exclusion, WAITING exclusion) | Included in 18 combinations | Journey 2, 3, 4 | **VERIFIED** |
| **F6** | **Cross-Round Order Lookup** | 5 cases (exact `FD-1082`, `#FD-1082`, `1082`, formatted phone `081-234-5678`, raw phone) | 5 cases (empty string, whitespace, short digits < 4, `№` symbol, case-insensitive) | Included in search tests | Journey 5 | **VERIFIED** |
| **F7** | **Time Slot Generation & Overnight** | 5 cases (daytime 30m, 15m, 60m, format normalize, single slot) | 5 cases (overnight 22:00->02:00 wrap, 23:30->00:30, 00:00 midnight, invalid string fallback, non-positive step) | Included in slot selection | Journey 1 | **VERIFIED** |

---

## Headless Browser CDP Verification Summary

- **Target Executable**: Chrome / Edge (`--headless=new`, `--remote-debugging-port`)
- **Transport**: Native Node.js `WebSocket` + `fetch` HTTP API (Zero external npm dependencies)
- **Verified Domains**: `Page`, `Runtime`, `Console`, `DOM`
- **Storefront Checks**:
  - Page title matches exactly: `"Fruit Drop - สั่งจองผลไม้สด"`
  - Meta tags: `og:title`, `og:description` match brand identity
  - White-label validation: Zero references to "Quasar App" or "สวนบ้านเรา"
  - Interactive test: Customer Order Lookup modal button triggers and renders `#order-lookup-modal` dialog in DOM, closes cleanly
- **Admin Desk Checks**:
  - Navigation to `/#/admin` loads Admin Layout and displays `ระบบแอดมิน Fruit Drop` login gate
  - Zero unhandled promise rejections or permission crashes
- **Exception Invariant**: 0 runtime exceptions and 0 critical console errors observed.
