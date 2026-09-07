# E2E Test Infra: Fruit Drop

## Test Philosophy
- Requirement-driven, opaque-box testing independent of internal implementation details.
- Comprehensive multi-tier methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinations + Real-World Workload Testing.
- Dual testing framework:
  1. **Programmatic Verification Suite**: High-speed, zero-dependency Node test harness (`node:test` + `node:assert/strict`) located at `tests/unit/pricing_and_state.test.mjs`.
  2. **Automated Headless Browser Testing**: Chrome DevTools Protocol (CDP) automated script at `scripts/test_e2e_cdp.mjs` verifying live customer storefront and admin tailgate operations.

## Feature Inventory & Test Coverage Mapping
| # | Feature | Requirement Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (E2E Workflow) |
|---|---|---|:---:|:---:|:---:|:---:|
| 1 | Fixed-Weight Bundle Pricing | R2, Survey 2 §1.1 | 5 cases | 5 cases | ✓ | ✓ |
| 2 | Durian Scale & Tare Math | R2, Survey 2 §1.1 | 5 cases | 5 cases | ✓ | ✓ |
| 3 | Order Total & Item Subtotals | R2, Survey 2 §1.1 | 5 cases | 5 cases | ✓ | ✓ |
| 4 | Order State Transitions | R2, Survey 2 §1.2 | 5 cases | 5 cases | ✓ | ✓ |
| 5 | Handover Payment Attribution | R2, Survey 1 §1.4, Survey 2 §1.2 | 5 cases | 5 cases | ✓ | ✓ |
| 6 | Cross-Round Order Lookup | R2, Survey 2 §1.4 | 5 cases | 5 cases | ✓ | ✓ |
| 7 | Time Slot Generation & Overnight | R1, Survey 1 §1.7 | 5 cases | 5 cases | ✓ | ✓ |

## Test Architecture
- **Test Runner**:
  - Programmatic unit suite: `node --test tests/unit/pricing_and_state.test.mjs`
  - Headless browser suite: `node scripts/test_e2e_cdp.mjs`
- **Pass/Fail Semantics**: All test assertions must pass with exit code 0.
- **Directory Layout**:
  - `tests/unit/`: Standalone unit tests for math, pricing, state machine, and parsing logic.
  - `scripts/`: CDP browser automation scripts and screenshots.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|---|---|---|
| 1 | Full Customer Pre-order to Pickup | Fixed bundles + Durian tier estimate + Pickup slot + Order pass QR | High |
| 2 | Tailgate Scale Weighing & PromptPay Delivery | Unweighed durian gating -> Digital scale input -> QR render -> Transfer handover -> Attribution verification | High |
| 3 | Tailgate Cash Collection & Attribution | Fixed weight fruit handover -> Cash collection -> Attribution recorded as CASH -> cashInHandTotal updated | Medium |
| 4 | Order Cancellation Flow | Pre-order placed -> Customer no-show -> Seller cancels order -> Status CANCELLED -> Quota released | Medium |
| 5 | Cross-Round Customer Search | Customer searches order with `#` prefix and with formatted phone number across non-active rounds | Medium |

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (Happy-path isolation)
- Tier 2: ≥5 test cases per feature (Boundaries, 0kg, extremes, malformed strings, nulls)
- Tier 3: Pairwise combinations of fruit types, payment modes, and order statuses
- Tier 4: ≥5 realistic end-to-end customer and seller user journeys
