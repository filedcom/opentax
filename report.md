# Gap Analysis: Inputs → Valid IRS MeF XML

> Generated: 2026-03-31
> Scope: What's blocking end-to-end tax preparation (data entry → IRS-accepted MeF e-file)

---

## What Works Today

The core computation engine is solid:

- **122 nodes** registered in the 2025 registry (73 input, 36 intermediate, 2 output, 6 worksheets, + aggregators)
- **Topological executor** — two-phase (plan + execute) with pending dict accumulation
- **Type-safe DAG** — OutputNodes enforces compile-time routing; Zod schemas validate all inputs
- **48 MeF XML builders** — IRS1040, Schedules 1/2/3/A/B/D/F/H/SE, and 39 supporting forms
- **CLI pipeline** — `return create` → `form add` → `return get` → `return export --type mef` works end-to-end for simple returns
- **E2E tests** — wage earner, self-employed, and capital gains scenarios verified

A single W-2 wage earner can go from `form add` to MeF XML output today. The gaps below are what prevents this from being a **complete, IRS-submittable** return.

---

## Gap 1: MeF ReturnHeader — Missing Required Fields

**Severity: BLOCKER**
**File:** `forms/f1040/mef/header.ts`

The IRS MeF schema (Publication 4164) requires these header elements that are completely absent:

| Required Element | Status | Notes |
|---|---|---|
| `ReturnType` | Done | "1040" |
| `TaxPeriodBeginDate` / `TaxPeriodEndDate` | Done | |
| `Filer` (SSN, name, address) | Done | Basic fields only |
| `FilingStatusCd` | Done | |
| `SoftwareId` | **Missing** | IRS-assigned ID for your software (applied for via e-Services) |
| `SoftwareVersionNum` | **Missing** | |
| `OriginatorGrp` (EFIN, Type) | **Missing** | Electronic Filing Identification Number of ERO |
| `PINEnteredByCd` | **Missing** | "Taxpayer" or "ERO" |
| `PrimaryPINEnteredByCd` | **Missing** | |
| `ReturnsAcceptedForElecFilingCd` | **Missing** | |
| `OnlineFilerInformation` | **Missing** | Required for self-filed returns |
| `TaxpayerPIN` / `SpousePIN` | **Missing** | 5-digit PIN captured in general node but not wired to header |
| `IPAddress` / `DeviceId` | **Missing** | Required for self-prepared returns |
| `Timestamp` | **Missing** | |

**FilerIdentity interface** also missing:
- Spouse SSN and name (for MFJ)
- Phone number
- Email address
- Address line 2

**What to do:** Expand `FilerIdentity` and `buildReturnHeader()` to include all Pub 4164 required elements. The `general` input node already captures some of this (ip_pin, signature PINs) — wire it through.

---

## ~~Gap 2: Missing MeF XML Builders for Intermediate Forms~~ ✓ RESOLVED

**Status: COMPLETE** (2026-03-31)

All 16 missing MeF XML builders have been implemented following the FIELD_MAP + MefNode pattern:

| Intermediate Node | MeF Builder | IRS XML Element |
|---|---|---|
| `eitc` (Earned Income Credit) | ✓ `eitc.ts` | `IRSEITC` |
| `form2555` (Foreign Earned Income) | ✓ `f2555.ts` | `IRS2555` |
| `form461` (Excess Business Loss) | ✓ `f461.ts` | `IRS461` |
| `form4684` (Casualties/Thefts) | ✓ `f4684.ts` | `IRS4684` |
| `form4952` (Investment Interest) | ✓ `f4952.ts` | `IRS4952` |
| `form5695` (Energy Credits) | ✓ `f5695.ts` | `IRS5695` |
| `form6198` (At-Risk) | ✓ `f6198.ts` | `IRS6198` |
| `form6252` (Installment Sale) | ✓ `f6252.ts` | `IRS6252` |
| `form6781` (§1256 Contracts) | ✓ `f6781.ts` | `IRS6781` |
| `form7206` (SE Health Insurance) | ✓ `f7206.ts` | `IRS7206` |
| `form8396` (Mortgage Interest Credit) | ✓ `f8396.ts` | `IRS8396` |
| `form8615` (Kiddie Tax) | ✓ `f8615.ts` | `IRS8615` |
| `form8815` (EE Bond Exclusion) | ✓ `f8815.ts` | `IRS8815` |
| `form8990` (Interest Limitation) | ✓ `f8990.ts` | `IRS8990` |
| `form982` (Debt Reduction) | ✓ `f982.ts` | `IRS982` |
| `schedule_h` (Household Employment) | ✓ `schedule_h.ts` | `IRS1040ScheduleH` |

All builders registered in `builder.ts`, types added to `types.ts`, extractions wired in `pending.ts`.

---

## Gap 3: No Validation Layer

**Severity: BLOCKER**
**Location:** Does not exist

The product.md spec calls for two-tier validation. None of it is implemented:

### Tier 1 — MeF Business Rules (HARD BLOCK)
The IRS publishes thousands of business rules that MeF XML must satisfy. Examples:
- If Schedule C is present, Schedule SE must be present
- If filing status is MFJ, spouse SSN is required
- If line 27a (EIC) > 0, Schedule EIC must be attached
- If dependent is claimed, dependent SSN must be provided

**Zero** of these are implemented. A return can export MeF XML that violates IRS rules.

### Tier 2 — Soft Warnings
- Suspiciously large deductions relative to income
- Missing forms that are usually filed together
- Data consistency checks

Also not implemented.

### XSD Schema Validation
No IRS XSD schemas are present in the repo. No validation of generated XML against the official schema.

**What to do:**
1. Download IRS MeF schema package for TY2025 (XSD files)
2. Build XML → XSD validation step in export pipeline
3. Implement top-priority business rules (start with the ~50 most common rejection reasons)
4. Add `tax validate` CLI command

---

## Gap 4: Filer Identity & Direct Deposit Not Wired

**Severity: BLOCKER**

The `general` input node captures taxpayer identity (SSN, name, DOB, filing status, dependents, signature PINs). But:

1. **Filer data doesn't flow to MeF header** — `exportMefCommand()` calls `buildMefXml(pending, filer?)` but `filer` is not extracted from the pending dict. It's passed as `undefined`.
2. **No direct deposit fields** — Refund routing number, account number, account type are not in any schema. Required for MeF `BankAccountGrp`.
3. **No spouse identity** — MFJ returns need both SSNs, both names, both PINs in the header.
4. **No preparer/ERO info** — Professional returns need PTIN, firm EIN, firm address.

**What to do:** 
- Add bank account fields to `general` input node
- Add preparer info as a new input or extension of `general`
- Wire `pending["general"]` → `FilerIdentity` → `buildReturnHeader()` in export pipeline

---

## Gap 5: Incomplete Form CRUD Operations

**Severity: MEDIUM**
**File:** `cli/commands/form.ts`, `cli/main.ts`

Only `form add` is implemented. Missing:
- `form replace` — edit an existing W-2 or 1099
- `form remove` — delete a form entry
- `form list` — list all entries for a return
- `form get` — retrieve a specific entry by ID

**Impact:** Tax professionals can't correct data entry errors without manually editing `inputs.json`. This is a usability blocker, not a technical one.

---

## Gap 6: PDF Export Not Implemented

**Severity: MEDIUM** (not required for MeF, but required for professional use)

The product.md describes AcroForm PDF filling with branding overlay. None of it exists:
- No PDF generation code
- No IRS AcroForm field mapping
- No `export --format pdf` command

**What to do:** Use pdf-lib to fill official IRS PDFs. The computed pending dict has all the values; need a FIELD_MAP from pending keys → PDF AcroForm field names.

---

## ~~Gap 7: Return Get Shows Minimal Data~~ ✓ RESOLVED

**Status: COMPLETE** (2026-03-31)

`return get` now returns a comprehensive result:
- **`summary`** — key 1040 lines: total wages, total income, AGI, taxable income, total tax, total payments, refund/amount owed
- **`forms`** — list of all computed form types in the return
- **`lines`** — full f1040 pending dict with all computed line items
- **`warnings`** — soft validation warnings (Tier 2 consistency checks)

---

## ~~Gap 8: No Schedule A (Itemized Deductions) MeF Builder~~ ✓ RESOLVED

**Status: COMPLETE** (2026-03-31)

Schedule A MeF builder implemented in `schedule_a.ts` with 15 field mappings covering all itemized deduction lines. Registered in `builder.ts` and wired through `types.ts`/`pending.ts`.

---

## ~~Gap 9: UnimplementedTaxNode — 1 Remaining~~ ✓ RESOLVED

**Status: ALREADY COMPLETE** (verified 2026-03-31)

The unrecaptured §1250 gain worksheet is fully implemented with comprehensive test coverage. It uses `UnimplementedTaxNode` only for a `ScheduleDStubNode` to avoid circular imports — the worksheet itself is a full `TaxNode` implementation. No remaining `UnimplementedTaxNode` instances exist as primary nodes.

---

## Priority Roadmap

### Must-Have for Valid MeF (Blockers)

1. **ReturnHeader expansion** — Add SoftwareId, EFIN, PINs, timestamps, spouse info
2. **Wire filer identity to export** — Extract from pending["general"] → FilerIdentity → header
3. **Add bank account / direct deposit fields** — New fields in general node
4. **Build top-50 MeF business rules** — Start with most common IRS rejection codes
5. **XSD schema validation** — Download TY2025 schemas, validate before export
6. **Add `tax validate` command** — Surface Tier 1 blocks before export

### ~~High Priority (Common Returns)~~ ✓ RESOLVED

7. ~~**EITC MeF builder**~~ ✓
8. ~~**Schedule A MeF builder**~~ ✓
9. ~~**Missing MeF builders**~~ ✓ All 16 forms implemented
10. **Form CRUD** — replace, remove, list, get commands (moved to Medium)

### Medium Priority (Professional Use)

11. **PDF export** — AcroForm filling for paper/review copies
12. **Preparer/ERO info** — PTIN, firm details for professional returns
13. ~~**Return get improvements**~~ ✓ Full summary, form list, all lines, and warnings

### ~~Lower Priority~~ ✓ RESOLVED

14. ~~**Soft validation warnings**~~ ✓ Tier 2 checks integrated into `return get` (8 rules: Schedule C/SE pairing, EITC consistency, itemized deduction ratio, charitable contribution limits, Schedule D/8949 pairing, refund ratio, HSA distribution checks, medical expense floor)
15. ~~**Unrecaptured §1250 worksheet**~~ ✓ Already implemented (was incorrectly listed as stub)
16. ~~**Schedule H MeF builder**~~ ✓ Built in Gap 2 resolution

---

## Architecture Assessment

The core architecture is sound and well-designed:
- The DAG model, pending dict accumulation, and topological execution are correct
- Type safety (Zod + OutputNodes) prevents most wiring errors at compile time
- The MeF builder pattern (FIELD_MAP + MefNode) is clean and extensible
- Adding new MeF builders is mechanical — ~30-50 lines each following the existing pattern

The gaps are primarily **completeness** (more builders, more fields, more rules) rather than **architectural** problems. The hardest remaining work is the business rule validation layer — it requires systematically encoding IRS rejection rules, which is a large but well-defined effort.
