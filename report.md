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

## ~~Gap 1: MeF ReturnHeader — Missing Required Fields~~ ✓ RESOLVED

**Status: COMPLETE** (2026-03-31)

`FilerIdentity` expanded with all Pub 4164 required fields. `buildReturnHeader()` now emits:

| Required Element | Status |
|---|---|
| `ReturnType`, `TaxPeriodBeginDate`, `TaxPeriodEndDate` | ✓ (existing) |
| `Filer` (SSN, name, address, phone, email) | ✓ expanded |
| `SpouseSSN`, `SpouseNameControlTxt` | ✓ added |
| `FilingStatusCd` | ✓ (existing) |
| `SoftwareId` / `SoftwareVersionNum` | ✓ added |
| `OriginatorGrp` (EFIN, Type, PractitionerPIN) | ✓ added |
| `PINEnteredByCd` / `PrimaryPINEnteredByCd` | ✓ added |
| `OnlineFilerInformation` (IP, DeviceId) | ✓ added |
| `TaxpayerPIN` / `SpousePIN` | ✓ added |
| `PrimaryIPPIN` / `SpouseIPPIN` | ✓ added |
| `BankAccountGrp` (routing, account, type) | ✓ added |
| `Timestamp` | ✓ added |
| `AddressLine2Txt` | ✓ added |
| `ForeignAddress` support | ✓ added |

New interfaces: `SpouseIdentity`, `BankAccount`, `OriginatorInfo`, `OnlineFilerInfo`, `FilerAddress`.
Enums: `PINEnteredBy`, `AccountType`.

**Note:** `SoftwareId` and `EFIN` are runtime configuration values (IRS-assigned). The header builder accepts them; the application must supply them at export time.

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

## Gap 3: MeF Validation Layer — IN PROGRESS

**Severity: BLOCKER → PARTIALLY RESOLVED** (2026-03-31)

### Completed
1. ✓ **Validation engine** — `core/validation/` with types, context, predicates DSL, engine, report formatter
2. ✓ **Predicate DSL** — composable rule builders: `hasValue`, `ifThen`, `eqField`, `eqSum`, `formPresent`, `filingStatusIs`, `validSSN`, and 25+ more combinators
3. ✓ **ReturnContext** — read-only interface resolving MeF XML element names → pending dict via reverse field registry
4. ✓ **Field registry** — reverse mapping from all 47 FIELD_MAP arrays (XML element → pending dict location)
5. ✓ **All 1,916 active IRS rules parsed** — from `1040_Business_Rules_2025v3.0.csv` into 137 rule files organized by form prefix
6. ✓ **255 rules auto-implemented** via pattern matching on rule text (hasValue, ifThen, eqField, etc.)
7. ✓ **`tax return validate` CLI command** — `--returnId <id> [--format text|json]`
8. ✓ **Professional diagnostics report** — Drake/Lacerte-style text output + JSON format
9. ✓ **IRS XSD schemas present** — TY2025v3.0 package in `.research/docs/`

### Remaining
- **1,661 rule stubs** need manual implementation (check: null) — prioritized by form
- **Export gating** — block `return export` when reject rules fail
- **XSD validation** — validate generated XML against schemas before export
- **Soft warnings migration** — replace `softValidationWarnings()` with diagnostics engine

### Rule Coverage by Form
| Form | Total Rules | Implemented | Stubs |
|------|------------|-------------|-------|
| IND (return-level) | 201 | 56 | 145 |
| F1040 | 118 | 17 | 101 |
| F8962 (PTC) | 85 | 11 | 74 |
| F5695 (Energy) | 76 | 14 | 62 |
| R0000 (Header) | 62 | 10 | 52 |
| SA (Schedule A) | 61 | 5 | 56 |
| + 131 more groups | 1,313 | 142 | 1,171 |

---

## ~~Gap 4: Filer Identity & Direct Deposit Not Wired~~ ✓ RESOLVED

**Status: COMPLETE** (2026-03-31)

1. ✓ **Filer extraction wired** — `extractFilerIdentity()` in `forms/f1040/mef/filer.ts` extracts `FilerIdentity` from the computed f1040 pending dict. `exportMefCommand()` now passes it to `buildMefXml()`.
2. ✓ **Direct deposit fields added** — `bank_routing_number`, `bank_account_number`, `bank_account_type` in general input schema, passed through to f1040 pending dict.
3. ✓ **Spouse identity wired** — `extractFilerIdentity()` builds `SpouseIdentity` from spouse fields when SSN + last name present.
4. ✓ **Signature PINs wired** — `taxpayer_signature_pin` and `spouse_signature_pin` now pass through from general node to f1040 pending dict and into MeF header.

**Remaining:** Preparer/ERO info (PTIN, firm EIN) is accepted by the header builder but not yet captured as input. This is a configuration concern for professional returns.

---

## ~~Gap 5: Incomplete Form CRUD Operations~~ ✓ RESOLVED

**Status: COMPLETE** (2026-03-31)

All form CRUD operations implemented with schema validation and CLI registration:

| Command | Description |
|---|---|
| `form add` | ✓ (existing) — Add a form entry |
| `form list` | ✓ — List all entries, optional `--node_type` filter |
| `form get` | ✓ — Get entry by `--entryId` |
| `form update` | ✓ — Replace entry data (validates against schema) |
| `form delete` | ✓ — Remove entry by `--entryId` |

Store layer: `listInputs()`, `getInput()`, `updateInput()`, `deleteInput()` in `cli/store/store.ts`.
21 new tests covering all operations including error cases.

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

1. ~~**ReturnHeader expansion**~~ ✓ All Pub 4164 fields added
2. ~~**Wire filer identity to export**~~ ✓ extractFilerIdentity() → buildMefXml()
3. ~~**Add bank account / direct deposit fields**~~ ✓ In general node + passed through
4. **Build top-50 MeF business rules** — Start with most common IRS rejection codes
5. **XSD schema validation** — Download TY2025 schemas, validate before export
6. **Add `tax validate` command** — Surface Tier 1 blocks before export

### ~~High Priority (Common Returns)~~ ✓ RESOLVED

7. ~~**EITC MeF builder**~~ ✓
8. ~~**Schedule A MeF builder**~~ ✓
9. ~~**Missing MeF builders**~~ ✓ All 16 forms implemented
10. ~~**Form CRUD**~~ ✓ list, get, update, delete commands

### Medium Priority (Professional Use)

11. **PDF export** — AcroForm filling for paper/review copies
12. **Preparer/ERO info** — PTIN, firm details for professional returns (header accepts it; needs input capture)
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
