# Gap Analysis: Inputs → Valid IRS MeF XML

> Generated: 2026-03-31
> Scope: What's blocking end-to-end tax preparation (data entry → IRS-accepted MeF e-file)

---

## What Works Today

The core computation engine is solid:

- **122 nodes** registered in the 2025 registry (73 input, 36 intermediate, 2 output, 6 worksheets, + aggregators)
- **Topological executor** — two-phase (plan + execute) with pending dict accumulation
- **Type-safe DAG** — OutputNodes enforces compile-time routing; Zod schemas validate all inputs
- **31 MeF XML builders** — IRS1040, Schedules 1/2/3/B/D/F/SE, and 22 supporting forms
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

## Gap 2: Missing MeF XML Builders for Intermediate Forms

**Severity: HIGH**
**Location:** `forms/f1040/2025/mef/forms/`

The engine computes results for these forms but **cannot serialize them to MeF XML** because no builder exists:

| Intermediate Node | MeF Builder? | IRS XML Element |
|---|---|---|
| `eitc` (Earned Income Credit) | No | `IRS_EITC` |
| `form2555` (Foreign Earned Income) | No | `IRS2555` |
| `form461` (Excess Business Loss) | No | `IRS461` |
| `form4684` (Casualties/Thefts) | No | `IRS4684` |
| `form4952` (Investment Interest) | No | `IRS4952` |
| `form5695` (Energy Credits) | No | `IRS5695` |
| `form6198` (At-Risk) | No | `IRS6198` |
| `form6252` (Installment Sale) | No | `IRS6252` |
| `form6781` (§1256 Contracts) | No | `IRS6781` |
| `form7206` (SE Health Insurance) | No | `IRS7206` |
| `form8396` (Mortgage Interest Credit) | No | `IRS8396` |
| `form8615` (Kiddie Tax) | No | `IRS8615` |
| `form8815` (EE Bond Exclusion) | No | `IRS8815` |
| `form8990` (Interest Limitation) | No | `IRS8990` |
| `form982` (Debt Reduction) | No | `IRS982` |
| `schedule_h` (Household Employment) | No | `IRS_SCH_H` |

**Impact:** Any return that triggers these forms will compute correct numbers but produce MeF XML that silently **omits** the form — the IRS will reject it.

**What to do:** Build MeF nodes following the existing pattern (FIELD_MAP + MefNode subclass). Each is ~30-50 lines. The EITC builder is the highest priority (most common credit).

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

## Gap 7: Return Get Shows Minimal Data

**Severity: LOW**
**File:** `cli/commands/return.ts`

`return get` only returns `{ returnId, year, lines: { line_1a } }`. Should return the full pending dict or a summary of all computed lines, tax owed/refund, and form list.

---

## Gap 8: No Schedule A (Itemized Deductions) MeF Builder

**Severity: HIGH**

Schedule A is one of the most common forms. The input node exists, the computation flows through to f1040 line 12, but there's no MeF XML builder for Schedule A itself. Itemizers will have incomplete MeF output.

---

## Gap 9: UnimplementedTaxNode — 1 Remaining

**Severity: LOW**
**File:** `forms/f1040/nodes/intermediate/worksheets/unrecaptured_1250_worksheet/index.ts`

The unrecaptured §1250 gain worksheet is the only node still using `UnimplementedTaxNode`. Only affects returns with depreciation recapture on real estate sales.

---

## Priority Roadmap

### Must-Have for Valid MeF (Blockers)

1. **ReturnHeader expansion** — Add SoftwareId, EFIN, PINs, timestamps, spouse info
2. **Wire filer identity to export** — Extract from pending["general"] → FilerIdentity → header
3. **Add bank account / direct deposit fields** — New fields in general node
4. **Build top-50 MeF business rules** — Start with most common IRS rejection codes
5. **XSD schema validation** — Download TY2025 schemas, validate before export
6. **Add `tax validate` command** — Surface Tier 1 blocks before export

### High Priority (Common Returns)

7. **EITC MeF builder** — Most claimed credit in the US
8. **Schedule A MeF builder** — Required for itemizers
9. **Missing MeF builders** — 14 more forms (form5695, form6251 already done, etc.)
10. **Form CRUD** — replace, remove, list, get commands

### Medium Priority (Professional Use)

11. **PDF export** — AcroForm filling for paper/review copies
12. **Preparer/ERO info** — PTIN, firm details for professional returns
13. **Return get improvements** — Full computed summary output

### Lower Priority

14. **Soft validation warnings** — Tier 2 data consistency checks
15. **Unrecaptured §1250 worksheet** — Implement the one remaining stub node
16. **Schedule H MeF builder** — Household employment (uncommon)

---

## Architecture Assessment

The core architecture is sound and well-designed:
- The DAG model, pending dict accumulation, and topological execution are correct
- Type safety (Zod + OutputNodes) prevents most wiring errors at compile time
- The MeF builder pattern (FIELD_MAP + MefNode) is clean and extensible
- Adding new MeF builders is mechanical — ~30-50 lines each following the existing pattern

The gaps are primarily **completeness** (more builders, more fields, more rules) rather than **architectural** problems. The hardest remaining work is the business rule validation layer — it requires systematically encoding IRS rejection rules, which is a large but well-defined effort.
