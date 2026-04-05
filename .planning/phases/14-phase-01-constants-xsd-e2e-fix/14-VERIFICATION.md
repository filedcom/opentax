---
phase: 14-phase-01-constants-xsd-e2e-fix
verified: 2026-04-06T00:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 14: Phase 01 Constant Alignment + XSD e2e Fix Verification Report

**Phase Goal:** (1) Align ltc_premium and sep_retirement TY2025 constants with config/2025.ts (Rev Proc 2024-40). (2) Fix 2 failing XSD e2e scenarios — EarnedIncomeAmt ordering in EITC builder, TotalInterestAmt ordering in Schedule B builder.
**Verified:** 2026-04-06
**Status:** passed

---

## Goal Achievement

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ltc_premium uses constants matching config/2025.ts | VERIFIED | Imports `LTC_PREMIUM_LIMITS_2025`; brackets now 4770/5970 per Rev Proc 2024-40 §3.34 |
| 2 | sep_retirement uses constants matching config/2025.ts | VERIFIED | Imports `SEP_MAX_CONTRIBUTION_2025=70000`, `SEP_CONTRIBUTION_RATE_2025`; was hardcoded 69000 |
| 3 | XSD e2e: all 6 scenarios pass | VERIFIED | `deno test --allow-read --allow-write --allow-run=xmllint forms/f1040/e2e/xsd_validation.test.ts`: 6 passed, 0 failed |
| 4 | deno task test passes for affected files | VERIFIED | 70 tests pass for ltc_premium + sep_retirement; registry type-check clean |

**Score:** 4/4

---

## Root Cause Analysis

**LTC/SEP constants:** Both nodes had hardcoded values (4830/6020, 69000) disagreeing with `config/2025.ts` (4770/5970, 70000). Fixed by importing from config.

**EITC XSD failure:** `eitc.ts` MEF builder was emitting `EarnedIncomeAmt` which is not a valid element in `IRS1040ScheduleEIC`. The XSD only accepts `QualifyingChildInformation` repeating groups. Element is `minOccurs="0"` — builder now returns `""`.

**Schedule B XSD failure:** `TotalInterestAmt` does not exist in `IRS1040ScheduleB` XSD. Correct element is `TaxableInterestSubtotalAmt`. Also `ExcludibleSavingsBondIntAmt` → `ExcludableSavingsBondIntAmt`.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 70 constant tests pass | `deno test forms/f1040/nodes/inputs/ltc_premium/ forms/f1040/nodes/inputs/sep_retirement/` | 70 passed, 0 failed | PASS |
| 6 XSD e2e tests pass | `deno test --allow-read --allow-write --allow-run=xmllint forms/f1040/e2e/xsd_validation.test.ts` | 6 passed, 0 failed | PASS |
| Registry type-check | `deno check forms/f1040/2025/registry.ts` | Exit 0 | PASS |

---

_Verified: 2026-04-06_
_Verifier: Claude_
