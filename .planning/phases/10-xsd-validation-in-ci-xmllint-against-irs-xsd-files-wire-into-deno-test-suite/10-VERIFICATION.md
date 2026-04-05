---
phase: 10-xsd-validation-in-ci-xmllint-against-irs-xsd-files-wire-into-deno-test-suite
verified: 2026-04-06T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 10: XSD Validation in CI Verification Report

**Phase Goal:** Add programmatic MeF XML validation against IRS XSD files to the Deno test suite. Wire `xmllint --schema` into a dedicated test file that generates MeF XML for at least 3 e2e scenarios and asserts XSD compliance. Add a `deno task validate:mef` task alias.
**Verified:** 2026-04-06
**Status:** passed
**Re-verification:** No — retroactive verification (phase completed 2026-04-05, VERIFICATION.md not written at time)

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                            | Status   | Evidence                                                                                                  |
|----|--------------------------------------------------------------------------------------------------|----------|-----------------------------------------------------------------------------------------------------------|
| 1  | MeF XML for a single W-2 return validates against Return1040.xsd with 0 errors                  | VERIFIED | `xsd-validation.test.ts` test "XSD: Single W-2 $75K validates against Return1040.xsd" — PASS             |
| 2  | MeF XML for a self-employed Schedule C return validates against Return1040.xsd with 0 errors     | VERIFIED | `xsd-validation.test.ts` test "XSD: Self-employed Schedule C $80K validates against Return1040.xsd" — PASS |
| 3  | MeF XML for an itemized deductions Schedule A return validates against Return1040.xsd with 0 errors | VERIFIED | `xsd-validation.test.ts` test "XSD: Itemized deductions Schedule A validates against Return1040.xsd" — PASS |
| 4  | returnVersion in generated XML matches 2025v3.0 from the XSD                                    | VERIFIED | `xsd-validation.test.ts` test "XSD: returnVersion matches 2025v3.0" — PASS                               |
| 5  | deno task validate:mef runs the XSD validation tests                                             | VERIFIED | `deno.json`: `"validate:mef": "deno test --allow-read --allow-write --allow-run=xmllint forms/f1040/2025/mef/xsd-validation.test.ts"` |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact                                           | Expected                                    | Status   | Details                                            |
|----------------------------------------------------|---------------------------------------------|----------|----------------------------------------------------|
| `forms/f1040/2025/mef/xsd-validation.test.ts`     | XSD validation test harness (3+ scenarios)  | VERIFIED | Exists; 4 tests covering W-2, Sch-C, Sch-A, version |
| `deno.json`                                         | validate:mef task alias                     | VERIFIED | `validate:mef` key present, runs xmllint tests     |

---

### Key Link Verification

| From                               | To                            | Via                   | Status   | Details                                             |
|------------------------------------|-------------------------------|-----------------------|----------|-----------------------------------------------------|
| `xsd-validation.test.ts`           | `builder.ts`                  | import buildMefXml    | VERIFIED | Imports buildMefXml from builder                    |
| `xsd-validation.test.ts`           | `/usr/bin/xmllint`            | Deno.Command subprocess| VERIFIED | `new Deno.Command("xmllint", ...)` confirmed        |
| `xsd-validation.test.ts`           | `Return1040.xsd`              | --schema flag         | VERIFIED | XSD path passed to xmllint --schema                 |

---

### Behavioral Spot-Checks

| Behavior                    | Command                                                                                             | Result              | Status |
|-----------------------------|-----------------------------------------------------------------------------------------------------|---------------------|--------|
| 4 XSD validation tests pass | `deno test --allow-read --allow-write --allow-run=xmllint forms/f1040/2025/mef/xsd-validation.test.ts` | 4 passed, 0 failed  | PASS   |
| validate:mef task alias     | `grep "validate:mef" deno.json`                                                                     | Key found           | PASS   |

**Note:** Tests require `--allow-read --allow-write --allow-run` flags (for temp file creation and xmllint subprocess). The `deno task validate:mef` alias includes these flags automatically.

---

### Requirements Coverage

| Requirement    | Description                                                         | Status    | Evidence                                                    |
|----------------|---------------------------------------------------------------------|-----------|-------------------------------------------------------------|
| REQ-XSD-VERIFY | Phase 10 VERIFICATION.md exists with test gate evidence             | SATISFIED | This document — 4 XSD validation tests pass                 |

---

### Notable Decisions (from SUMMARY.md)

- `f8959` builder returns empty string: IRS8959.xsd requires nested `AdditionalTaxGrp > AdditionalMedicareTaxGrp` structure that cannot be expressed with the current flat FIELD_MAP pattern — tagged TODO for future plan
- IRS1040 always emits required fields: `IndividualReturnFilingStatusCd`, `VirtualCurAcquiredDurTYInd`, `RefundProductCd` are required by XSD regardless of income data
- Placeholder Filer block when no filer provided: `ReturnHeader1040x.xsd` requires Filer element; emit SSN=000000000 placeholder so test/preview XML is always well-formed

---

### Human Verification Required

None. All success criteria are verifiable programmatically (test pass/fail + file existence).

---

### Gaps Summary

No gaps. All 5 must-have truths verified, all artifacts exist, all key links confirmed, behavioral spot-checks pass (4/4 XSD validation tests pass with xmllint).

---

_Verified: 2026-04-06_
_Verifier: Claude (retroactive — phase completed 2026-04-05)_
