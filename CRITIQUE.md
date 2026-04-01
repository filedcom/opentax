# Production Readiness and IRS MeF Certification Assessment

> Generated: 2026-04-01 | Assessor: Claude (automated deep code review)
> Codebase: @filed/tax-engine v0.0.1 | Runtime: Deno + TypeScript | Tax Year: 2025
> Last updated: 2026-04-01 (commit 22e0e30 — P0/P2/P3 gaps closed)

---

## Recent Fixes (2026-04-01, commit 22e0e30)

The following gaps from the production readiness audit were resolved in a parallel agent run:

| Item | What was fixed |
|---|---|
| ✅ SEP/retirement AGI routing | `sep_retirement` and `f2106` now route to both `schedule1` and `agi_aggregator`. Deductions were previously written to the serialization sink only and silently dropped from AGI. |
| ✅ Student loan interest node | New `f1098e` node: captures 1098-E data, enforces $2,500 cap (IRC §221(b)(1)), routes to `schedule1.line19_student_loan_interest` + `agi_aggregator`. |
| ✅ Educator expenses node | New `educator_expenses` node: per-educator $300 cap ($600 MFJ), routes to `schedule1.line11_educator_expenses` + `agi_aggregator`. |
| ✅ Export gating on reject rules | `return export` now runs MeF business rule validation before building XML. Reject-severity failures block export. `--force` flag available to override. |
| ✅ F8812 Part II-B payroll method | Taxpayers with 3+ qualifying children or Puerto Rico residents now get ACTC = max(Part II-A, Part II-B). Previously only Part II-A was computed. |
| ✅ E2E scenarios 11-14 | New scenarios: itemized deductions ($33K Schedule A), AMT trigger ($100K PAB interest → AMT $11,580), EITC with 2 qualifying children (HOH $32K → $4,953), CTC+ACTC (MFJ 3 children). |
| ✅ Preparer/ERO input node | New `preparer` node: PTIN, EFIN, firm name/EIN/address, originator type. MeF header now emits `<PaidPreparerInfo>` or `<SelfPreparedReturnIndicator>`. EFIN was previously never populated. |
| ✅ 8 MeF business rules | F8835 date-conditional wind facility rules and F8379 cross-form amount equality rule. |

---

## Executive Summary

This is a well-architected, deeply type-safe tax calculation engine for Form 1040 (TY2025). The
core engine — a DAG of pure computation nodes, topological execution, and Zod schema-first
validation — is genuinely well-engineered. The W-2 node (`forms/f1040/nodes/inputs/w2/index.ts`)
alone handles 15 downstream output routes, per-employer SS tax caps, Box 12 code routing, and
retirement limit validation. The EITC node has real phase-in/phaseout math. The Schedule C node
covers 40+ expense lines with DOT meal rates and EBL thresholds. This is not toy-level work.

The "228/228 = 100% Drake parity" claim in `forms/f1040/1040_coverage_plan.md` requires context:
it means 228 Drake data-entry screens are mapped to corresponding nodes — it does not mean 100%
of every IRS form instruction is faithfully implemented. Most nodes have real logic. A significant
subset (especially exotic tax credits like Form 3800 general business credits — 180/185 rules are
`alwaysPass`) are schema-correct stubs with no downstream routing.

For IRS MeF certification, this codebase is roughly 18-24 months of work away from filing a real
return through the IRS Modernized e-File system. The XML generation layer exists and covers 48
forms, but it has never been validated against IRS XSDs programmatically, there is no SOAP/REST
transmission layer to the IRS A2A gateway, no acknowledgement processing (A-file/R-file), no
EFIN/ERO management, no Acceptance Testing System (ATS) test scenarios, and no state return support.
The product strategy document (`docs/product.md`) correctly identifies a "clearinghouse" path
(Option B) as the approach — that is the right call and reduces the certification burden substantially,
but even that path requires completing the XML validation gap and passing the clearinghouse's own
acceptance tests.

---

## 1. Architecture Assessment

### 1.1 Strengths

**Node abstraction is clean and consistent.** `core/types/tax-node.ts` defines `TaxNode<TSchema>` as
a generic abstract class with three properties: `nodeType`, `inputSchema`, `outputNodes`, and a
pure `compute()` method. Every node in the codebase follows this contract without exception.

**Schema-first with Zod, no type duplication.** The codebase follows CLAUDE.md conventions strictly:
schemas defined once, types inferred. The W-2 node's `w2ItemSchema` (`forms/f1040/nodes/inputs/w2/index.ts`,
line 74) has 18 typed fields including optional, nonnegative, array, and nested object schemas — all
inferred by consuming code with `z.infer<typeof w2ItemSchema>`.

**`OutputNodes` enforces compile-time routing safety.** `core/types/output-nodes.ts` makes it
impossible to route to a node not declared in `outputNodes` or pass a mis-typed input. This is a
non-trivial design win — mis-routed outputs are caught at compile time, not runtime.

**Execution engine is stateless and deterministic.** `core/runtime/executor.ts` (82 lines) runs
Kahn's topological sort followed by a pending-accumulation pass. The `mergePending` function handles
the multi-source accumulation pattern (multiple W-2s depositing wages as an array) correctly. No
global state, no class-level mutation.

**Real tax math.** Spot-checking confirms genuine IRS logic: simplified method annuity exclusion
tables (`f1099r/index.ts` lines 34-48), SE tax deduction at the correct 0.9235 multiplier (verified
in Scenario 7 of `e2e/scenarios.test.ts`), QCD limits and PSO exclusions in the 1099-R node, MFS
SALT cap splitting in Schedule A, and retirement plan limit lookups including the 2025 catch-up
contribution brackets (ages 50-59, 60-63, 64+).

**Tests are extensive and passing.** 56,396 tests pass in 1m32s with 0 failures. 2,217 test files
alongside 4,591 source files is a reasonable ratio for this type of domain.

### 1.2 Concerns

**The `mergePending` accumulation is invisible to individual nodes.** When two upstream nodes deposit
the same field key, the executor silently promotes it to an array (`executor.ts` lines 34-46). The
receiving node's Zod schema must accept `z.array(schema) | schema` or the parse silently fails and
the node is skipped. This creates a hidden contract between nodes that is not enforced by the type
system. A schema mismatch causes silent skip (line 68: `if (!parsed.success) { continue; }`), not a
thrown error. This is a correctness risk: if a bug causes the wrong type shape to flow into a node,
execution silently skips it.

**Single-form, single-year catalog.** `catalog.ts` contains exactly one entry: `"f1040:2025"`.
The product vision (docs/product.md) includes 1120, 1120S, 1065, and state returns, but the catalog
abstraction is a thin wrapper. Adding a new tax year requires duplicating the entire registry, start
node, and MeF builder. There is no mechanism to share nodes across years.

**Circular dependency workaround using stub nodes.** The `unrecaptured_1250_worksheet` node
(`nodes/intermediate/worksheets/unrecaptured_1250_worksheet/index.ts` lines 9-19) cannot import
`schedule_d` because `schedule_d → f1099div → unrecaptured_1250_worksheet` creates a cycle. The
workaround is a `ScheduleDStubNode extends UnimplementedTaxNode` that holds only the typed schema
fragment needed for the `OutputNodes` declaration. This works, but it means the static
`outputNodeTypes` metadata used for graph construction is partially inaccurate — the stub node
shows as `registered: false` in graph traversal, which could mislead any tooling that relies on the
graph for completeness checks.

**No error recovery in the executor.** If `node.compute()` throws (e.g., the W-2 node throws on
SS wage base violations — `w2/index.ts` line 128: `throw new Error(...)`), the entire execution
aborts with an unhandled exception. There is no per-node try/catch, no partial result, and no
diagnostic indicating which node failed. For a production filing system, executor-level error
isolation per node is necessary.

**No connection between MeF field mappings and computation nodes.** The MeF builder (`forms/f1040/2025/mef/`)
uses string-key FIELD_MAPs to map pending dict keys to XML element names. But the pending dict
keys are defined in node `inputSchema` objects spread across 180+ files. There is no compile-time
or test-time check that a pending dict key referenced in a FIELD_MAP actually exists as a field
in the corresponding computation node's schema.

### 1.3 Code Quality

Very consistent. The CLAUDE.md conventions are followed throughout: enum-gated domain codes,
no `as any`, no `Record<string, unknown>` in typed contexts, early returns, small pure helpers
composed in `compute()`. File sizes are appropriate — the W-2 node at 378 lines is the most
complex input node and the length is justified.

One known issue: `core/validation/predicates.ts` line 106 has a dead branch:
```ts
if (v.startsWith("9") && !v.startsWith("9")) return true; // unreachable
```
This is harmless but indicates the `validSSN` predicate does not actually validate ITINs as a
special case — it always returns `true` for any 9-digit SSN that is not all zeros or nines.

---

## 2. Form Coverage Analysis

### 2.1 Current State

The `1040_coverage_plan.md` file claims "228/228 computational screens covered → 100% parity."
This is correct by the definition used: 228 unique Drake data-entry screens each map to a node
type in the registry. The registry (`forms/f1040/2025/registry.ts`) contains 181 imported nodes
plus a start node and 2 output nodes — roughly 184 total. The "screen" count is higher than the
node count because multiple Drake screens can map to the same node type.

The registry is the authoritative list of what exists. Notable inclusions: Schedule C, Schedule E,
Schedule F, Schedule H, Schedule SE, K-1 for partnerships/S-corps/trusts, EITC, 1099-R with
simplified method, QBID (Form 8995/8995-A), Form 6251 AMT, Form 8962 ACA credits, Form 8949
capital gains with wash sale handling, Form 8606 Roth basis tracking, and Form 4797 asset
dispositions. This is a serious depth of coverage.

### 2.2 Implementation Depth

Sampled nodes show genuine depth:

- **W-2** (`w2/index.ts`): Full Box 12 code routing (all 26 codes handled), per-employer SS cap
  enforcement, retirement plan limit checks with 2025 age-based catch-up brackets, statutory employee
  routing to Schedule C, Box 13/14 handling for state taxes and SDI.

- **1099-R** (`f1099r/index.ts`): Simplified Method annuity exclusion (both single-life Table 1
  and joint-life Table 2), QCD annual limit enforcement, PSO exclusion for public safety officers,
  distribution code routing (zero-taxable codes, early distribution to Form 5329, lump-sum to
  Form 4972).

- **EITC** (`intermediate/forms/eitc/index.ts`): Real phase-in/phaseout math with separate rates
  by number of children, investment income cap, MFJ filing status threshold adjustments per IRC §32.

- **Schedule A** (`inputs/schedule_a/index.ts`): SALT cap at $40,000 (OBBBA 2025 figure), 7.5%
  AGI floor for medical, 60% AGI limit for cash charitable, $20,000 MFS SALT split.

- **Schedule C** (`inputs/schedule_c/index.ts`): 40+ expense lines including DOT meal rate (80%),
  home office simplified method ($5/sq ft, 300 sq ft max), EBL threshold routing to Form 461,
  business interest limitation flag for §163(j).

**Where depth is thinner:** Several input nodes that handle exotic forms (Form 8082 Notice of
Inconsistent Treatment, Form 5471 CFC reporting, Form 8843 closer-connection statement) are
schema-correct with no routing (`new OutputNodes([])`). They validate input but contribute nothing
to the computation graph. This is the correct behavior for disclosure-only forms, but it means they
do not reduce the user's actual tax liability even if applicable (e.g., Form 8843 exempts certain
days for substantial presence test purposes — the general node would need to incorporate this).

### 2.3 Critical Missing Forms

The following are required for MeF completeness but have limited or no implementation:

- **State returns**: Zero state return infrastructure. The validation rules include `state.ts`
  (16/15 `alwaysPass` — effectively all stubs), but there are no state calculation nodes, no state
  registry, and no state XML generation. This is a hard prerequisite for any commercial filing
  product; most 1040 filers have a state obligation.

- **Form 1040-X (Amended return)**: No amendment node, no amended return workflow, no MeF amended
  return XML builder. The `.research/docs` directory contains the 1040-X XSD, but there is no
  implementation.

- **Form 4868 (Extension)**: Not in registry. The `ext` node exists but appears to handle
  extension-related data entry without generating a separate 4868 XML payload.

- **General Business Credit (Form 3800)**: 180/185 business rules are `alwaysPass` stubs. The
  form exists in the MeF builder (`forms/index.ts` does not include Form 3800 — it is absent from
  `ALL_MEF_FORMS`). This affects all general business credits (R&D, WOTC, investment, etc.).

- **Form 2555 (Foreign Earned Income Exclusion)**: Node exists in registry and MeF builder, but
  the validation rule file `f2555.ts` shows 20/20 `alwaysPass` stubs. The computation may be
  partially wired.

- **Schedules K-2/K-3**: Rule files `schk2k3.ts` (15/14 stubs) and `schk3.ts` exist but are
  largely unimplemented. International pass-through reporting is absent.

- **Form 8621 (PFIC)**: Node registered (`f8621`), but routing to output nodes is likely minimal.

---

## 3. IRS MeF Certification Gap Analysis

### 3.1 What Exists

The MeF layer is located in two directories:
- `forms/f1040/mef/` — shared utilities: `xml.ts` (element/elements builders), `header.ts` (full
  return header with EFIN, PIN, bank account, address, spouse), `filer.ts` (extract identity from
  pending dict), `filer.test.ts`
- `forms/f1040/2025/mef/` — year-specific: `builder.ts` (assembles final XML), `pending.ts`
  (bridges pending dict to MeF types), `types.ts`, `form-descriptor.ts`, and `forms/` subdirectory

`ALL_MEF_FORMS` in `forms/f1040/2025/mef/forms/index.ts` contains 48 form builders, including
Form 1040, Schedules 1-3, A, B, D, F, H, SE, and a meaningful set of attached forms. The builders
use `FIELD_MAP` arrays to map pending keys to IRS XML element names. The XML output is well-formed
and would round-trip through an XML parser.

### 3.2 MeF XML Schema Compliance

The IRS XSD files for 2025v3.0 are present in `.research/docs/IMF_Series_2025v3.0/`. However, there
is no automated validation of generated XML against these XSDs anywhere in the codebase. The test
in `forms/f1040/2025/mef/forms/f8949.test.ts` (line 624) checks element ordering ("short-term groups
emitted before long-term groups in XSD order") — manually verified, but not run through the actual
XSD validator.

Critical compliance gaps discovered:
- ~~XML elements are emitted as plain numbers (`String(value)`) without rounding. IRS XSDs for
  monetary amounts use `USAmountType` which is `xs:integer` — floats like $11,303.64 fail XSD
  validation.~~ **FIXED (2026-04-01, commit 2213f60):** `element()` in `mef/xml.ts` now applies
  `Math.round()` before serialization. All dollar amounts emit as integers.
- The `<Return>` element sets `returnVersion="2025v3.0"` hardcoded in `builder.ts` (line 9) but
  README claims "2025v5.2". This discrepancy suggests the version string has not been validated
  against the actual IRS published schema version.
- ~~XML namespace declarations in `builder.ts` (line 27): `xmlns="http://www.irs.gov/efile"`. Rule
  X0000-008 requires both a default namespace and an `xmlns:efile` namespace declaration. The
  current builder only emits the default namespace — this would trigger `X0000-008 reject_and_stop`.~~
  **FIXED (2026-04-01, commit 2213f60):** `builder.ts` now emits both `xmlns` and `xmlns:efile`.

### 3.3 Transmission Protocol (COMPLETELY MISSING)

There is no transmission code anywhere in the codebase. The engine outputs XML to stdout
(`cli/commands/export.ts` line 30: `console.log(xml)`). The IRS MeF A2A (Application to
Application) gateway requires:
- SOAP envelope wrapping with specific headers
- Submission ZIP file containing manifest, XML return data, and binary attachments
- TLS 1.2+ mutual authentication with IRS-issued certificates
- Submission ID generation (UUID format specific to IRS)

The product strategy in `docs/product.md` correctly identifies this as "Option B: Export valid MeF
XML, clearinghouse handles transmission." This is the right choice — it avoids the IRS EFIN direct-
transmitter requirement. But it does require building the ZIP package format that clearinghouses
(Drake, TaxAct, Modernizing Medicine, etc.) accept, which is not the same as raw XML.

### 3.4 EFIN / ERO Requirements

The `FilerIdentity` interface in `forms/f1040/mef/header.ts` has an `originator` field with `efin`
and `originatorType` properties. The `OriginatorGrp` XML block is built by `buildOriginatorBlock()`.
So the data model for EFIN is present.

~~However, there is no validation that EFIN is a valid 6-digit number, no enforcement that it is
present when filing electronically, and no concept of ERO (Electronic Return Originator) obligations
such as Form 8879 (e-file authorization/signature).~~ **PARTIALLY FIXED (2026-04-01, commit 22e0e30):**
A new `preparer` input node captures PTIN (`/^P\d{8}$/`), EFIN (`/^\d{6}$/`), firm name/EIN,
originator type, and self-prepared indicator. The MeF header now emits `<PaidPreparerInfo>` or
`<SelfPreparedReturnIndicator>` based on this input. EFIN is now validated and populated. Form 8879
(e-file authorization) is still not implemented. The business rules in `fpymt.ts` (Form Payment
rules) are 12/13 stubs. The `PIN` entry screen is marked `not_applicable` in `screens.json` (row
for 8879/8878).

### 3.5 Acknowledgement Processing

There is no acknowledgement processing code. After a return is transmitted to the IRS (or to a
clearinghouse), the IRS returns:
- A-file: Accepted acknowledgement
- R-file: Rejected with specific business rule violations
- P-file: Pending (state processing)

None of these are handled. There is no store update path for "return was accepted/rejected," no
re-filing workflow, no R-file parser. This is not a code smell — it simply does not exist.

### 3.6 IRS Acceptance Testing System (ATS)

The IRS ATS requires a software vendor to test against approximately 35 specific test scenarios
before the system can go live. The e2e test file `forms/f1040/e2e/scenarios.test.ts` has 10
scenarios that test basic computation correctness. These are good development tests but are not
aligned with the IRS ATS test cases, which test specific error conditions, edge cases in form
calculations, and specific reject codes.

There is no reference to IRS ATS anywhere in the codebase, no test file named for IRS scenarios,
and no mechanism to compare output against IRS-published expected results for ATS scenarios.

### 3.7 Estimated Gap Size

| MeF Requirement | Current Status | Effort Estimate |
|---|---|---|
| Form 1040 XML generation | Partial — 48 forms mapped, no XSD validation | 2-4 weeks |
| XSD compliance (amount formatting, namespace) | Missing | 1-2 weeks |
| Transmission package (ZIP + manifest) | Missing | 2-3 weeks |
| Clearinghouse API integration | Missing | 4-8 weeks (per clearinghouse) |
| EFIN/ERO management | Data model only | 2 weeks |
| Form 8879 e-signature workflow | Missing | 2-3 weeks |
| Acknowledgement processing | Missing | 3-4 weeks |
| IRS ATS test scenarios | 0/35 | 4-6 weeks |
| State returns (e.g., California, New York) | Missing entirely | 16-32 weeks |
| Form 1040-X (amendment) | Missing | 4-6 weeks |
| Remaining alwaysPass rules (540 rules) | 540 stubs remaining | 12-24 weeks |
| ~~Decimal rounding (USAmountType)~~ | ~~Not enforced globally~~ | **FIXED 2026-04-01** |

---

## 4. Validation and Business Rules

### 4.1 Current Validation Engine

`core/validation/engine.ts` is clean: it evaluates a list of `RuleDef` objects against a
`ReturnContext`, skips server-side categories (`database`, `duplicate`), skips `null` stubs, and
returns a `DiagnosticsReport` with `canFile: rejected === 0`. The `ReturnContext` interface
(`core/validation/types.ts`) provides access to form fields by MeF XML name, filing status, SSN,
and form presence flags.

The `context.ts` implementation bridges the pending dict (keyed by node type and field name) to the
XML-name interface expected by rule predicates via `field-registry.ts`. This is non-trivial
plumbing and it is correct.

### 4.2 IRS Reject Code Coverage

Total rules: ~1,916 across 138 rule files. Current state:
- **Implemented**: ~1,163 rules (61%) with real predicate logic
- **Stubs** (`alwaysPass`): ~753 rules (39%)

The roadmap (`validation/ALWAYSPASS_ROADMAP.md`) categorizes the 540 remaining stubs (note: the
document predates additional predicate additions, accounting for the discrepancy with 753 total):

- 80 IRS e-File database lookups — require server-side infrastructure (prior-year AGI match,
  duplicate SSN detection, IP-PIN verification). These are inherently server-side and cannot be
  implemented client-side.
- 112 per-item repeating group iterations — the predicate DSL operates on flat XML fields, not
  arrays. Dependent child uniqueness checks, K-1 item cross-references.
- 63 TIN/EIN format and cross-reference validations.
- 57 conditional math rules.
- 29 binary attachment presence rules.

The most critical unimplemented rules are in the `X0000` series (XML structural validation — all
currently `alwaysPass` because the engine never validates its own XML output against the XSD).

### 4.3 Math Error Detection

Math error rules (`category: "math_error"`) are partially implemented. The predicate DSL in
`predicates.ts` provides `eqSum`, `eqDiff`, `eqProduct`, `eqMin`, `eqMax`, `eqDiffFloorZero`,
`eqMinNum`, `notLtSum`, `eqDiv`, `eqFieldProduct`, `decimalPlacesEq`. These cover the common
arithmetic verification cases (e.g., line totals must equal sum of components, credits cannot
exceed limits).

For Form 3800 (general business credit), 180/185 math error rules are stubs — any math error in
a general business credit computation would not be detected.

---

## 5. Test Coverage and Quality

### 5.1 Test Statistics

- **Test files**: 2,217
- **Source files**: 4,591
- **Test/source ratio**: ~0.48 (meaning roughly half of source files have corresponding test files)
- **Total tests**: 56,396
- **Passing**: 56,396 (100%)
- **Test runtime**: 1m32s

### 5.2 Test Depth Assessment

**W-2 tests** (`nodes/inputs/w2/index.test.ts`): Checking the pattern from the codebase, each
node has an `index.test.ts` that tests the happy path and key edge cases. The W-2 node tests
cover SS wage base cap, multi-employer excess SS, statutory employee routing, Box 12 code routing
for HSA/FSA/adoption benefits.

**E2E scenarios** (`e2e/scenarios.test.ts`): 10 scenarios covering Single, MFJ, MFS, HOH filing
statuses and combinations of W-2, 1099-INT, 1099-DIV, self-employment, and high-income scenarios.
Each test verifies specific computed line values against hand-calculated expected results. The math
in the scenario comments is correct and verifiable.

**Validation rule tests**: Each rule file in `validation/rules/` likely has corresponding tests
(given the 2,217 test file count), but rule-level tests were not individually inspected.

**MeF builder tests** (`forms/f1040/2025/mef/forms/*.test.ts`): Many builder files have test files
checking XML output structure. The Form 8949 test (`f8949.test.ts`) tests XSD element ordering.

### 5.3 E2E Testing

The 10 e2e scenarios in `scenarios.test.ts` are genuine integration tests — they run a full
return through the execution engine and assert specific F1040 line values. Scenario 7 (self-employed
Schedule C $80K) checks intermediate node outputs (`agi_aggregator`, `standard_deduction`,
`income_tax_calculation`) as well as final summary lines. This is a good pattern.

**Gaps in e2e coverage**: No scenario tests:
- ~~Itemized deductions vs. standard deduction comparison~~ **FIXED (2026-04-01, commit 22e0e30):** Scenario 11 covers $33K Schedule A vs. standard deduction.
- ~~AMT (Form 6251) triggering~~ **FIXED (2026-04-01, commit 22e0e30):** Scenario 12 covers $100K PAB interest triggering AMT $11,580.
- ~~EITC with qualifying children~~ **FIXED (2026-04-01, commit 22e0e30):** Scenario 13 covers HOH + 2 qualifying children → EITC $4,953.
- Capital gains (1099-B + Schedule D + QDCGT worksheet)
- Retirement distribution with early penalty
- Multi-state filing scenarios
- Return with a validation reject condition

### 5.4 Missing Test Categories

- **XSD compliance testing**: No test validates generated XML against the IRS XSD files in
  `.research/docs/`. The XSD files are present but unused in any test.
- **Rejection scenario tests**: No test verifies that a return with known invalid data correctly
  produces a `canFile: false` result from the validation engine.
- **Rounding/precision tests**: No systematic test verifies that all computed dollar amounts round
  to the nearest dollar (as required by IRS MeF) before XML emission.
- **Performance/stress tests**: No test with large numbers of W-2s, K-1s, or Schedule E properties.

---

## 6. CLI and User Experience

### 6.1 Current CLI Capabilities

The CLI (`cli/main.ts`) supports 12 commands in 5 groups:

| Command | Description |
|---|---|
| `return create --year N` | Create new return, returns UUID |
| `return get --returnId ID` | Execute and print all computed pending values |
| `return export --returnId ID --type mef` | Generate MeF XML to stdout |
| `return validate --returnId ID` | Run validation rules, text or JSON output |
| `form add --returnId ID --node_type TYPE 'JSON'` | Add an input form entry |
| `form list --returnId ID` | List all form entries |
| `form get --returnId ID --entryId ID` | Get a specific entry |
| `form update --returnId ID --entryId ID 'JSON'` | Update an entry |
| `form delete --returnId ID --entryId ID` | Delete an entry |
| `node list` | List all registered nodes |
| `node inspect --node_type TYPE` | Show a node's schema and output nodes |
| `node graph --node_type TYPE` | Mermaid or JSON dependency graph |

The persistence layer (`cli/store/store.ts`) stores returns as a `return.json` file in a UUID-named
directory under `./returns/`. This is file-based JSON with no encryption.

### 6.2 Missing for Tax Filing

A user cannot currently do the following without building a layer on top:

- **Interview/wizard flow**: The CLI requires knowing the exact JSON shape for each node. There is
  no guided data entry, no "tell me what forms you have" interview.
- **PDF generation**: There is no PDF renderer. The product plan mentions "IRS AcroForm PDF +
  branding/watermark overlay" but no code exists for it.
- **E-file submission**: Export generates XML; submitting it to any IRS-connected clearinghouse
  requires additional integration code.
- **Payment processing**: No support for direct debit via Form 9465 or EFTPS integration.
- **Taxpayer review interface**: The `return get` command dumps the raw pending dict as JSON —
  there is no formatted review, no line-by-line summary, no "here is your refund amount."
- **Amendment workflow**: No `form amend` or `return amend` command.
- **Prior-year AGI lookup/storage**: The field exists in `FilerIdentity.priorYearAgi` but there
  is no mechanism to store or retrieve it for the next filing year.

---

## 7. Security and Compliance

### 7.1 PII Handling

Taxpayer PII (SSN, name, address, income data) is stored as plaintext JSON in the `returns/`
directory. The `returns/` directory is present in the repository with sample test data (returns
`03185238-8646-4b06-8ba0-2d0d45b47050`, `4f72affa-7b47-47bb-ad5f-095171b27a65`, and two others).
The sample data uses synthetic values (`box1_wages: 95000`, `payer_name: "Ally Bank"`), so no real
PII is exposed in the repo. But this demonstrates that the directory structure has no `gitignore`
protection, no encryption, and no access control.

The only cryptographic use in the codebase is `crypto.randomUUID()` in `cli/store/store.ts`
(line 70) to generate the return ID. There is no at-rest encryption, no key management, no
encrypted fields.

### 7.2 Data Retention

There is no data retention policy, no expiration timestamp on returns, no deletion command at the
return level (only at the entry level via `form delete`). For a system handling SSNs and income
data, this would require GLBA/FTC Safeguards Rule compliance for any commercial deployment.

### 7.3 Audit Trail

No audit log. The `meta.createdAt` field records when a return was created, but there is no
`updatedAt` timestamp, no history of form entry changes, and no log of who accessed what.
IRS MeF compliance requires audit trail capability for ERO software.

### 7.4 IRS Security Requirements

MeF transmitters (direct and through clearinghouses) must comply with IRS Publication 3112 (MeF
Specifications) and IRS e-File application requirements. Key requirements not addressed:

- **TLS 1.2 minimum**: There is no HTTP client for IRS communication at all.
- **Transmission security**: The XML is output to stdout — no signing, no encryption in transit.
- **Software identification**: `FilerIdentity.softwareId` and `softwareVersionNum` fields exist but
  there is no IRS-registered software ID. This requires IRS registration.
- **5-year audit log**: IRS requires EROs to retain e-file records for 3 years minimum.

---

## 8. Realistic Path to IRS MeF Certification

### 8.1 Prerequisites Checklist

| Prerequisite | Current Status | Estimated Effort |
|---|---|---|
| Form 1040 computation (core) | Complete for common scenarios | Done |
| Form 1040 XML generation | Partial — 48 forms | 2-4 weeks |
| XSD validation of output | None | 1-2 weeks |
| ~~USAmountType integer rounding~~ | ~~Not enforced~~ | **FIXED 2026-04-01** |
| ~~XML namespace fix (X0000-008)~~ | ~~Missing efile prefix~~ | **FIXED 2026-04-01** |
| State return (at least CA/NY) | Zero | 16-24 weeks each |
| Form 1040-X amendment | Zero | 4-6 weeks |
| Submission ZIP package format | Zero | 2-3 weeks |
| Clearinghouse API (e.g., TaxAct, Drake) | Zero | 4-8 weeks |
| OR IRS direct transmitter EFIN | Requires IRS enrollment | 3-6 months admin |
| Form 8879 e-signature | Zero | 2-3 weeks |
| Acknowledgement processing | Zero | 3-4 weeks |
| IRS ATS test scenarios (35 scenarios) | 0/35 | 6-8 weeks |
| Remaining alwaysPass rules | 540 stubs | 12-20 weeks |
| PII encryption at rest | None | 2-3 weeks |
| Audit logging | None | 1-2 weeks |
| Software ID registration with IRS | Not started | 4-8 weeks admin |

### 8.2 Recommended Sequencing

1. ~~**Fix the XML namespace issue** (X0000-008): One day.~~ **DONE (2026-04-01)**
2. ~~**Enforce integer rounding for USAmountType**: One week.~~ **DONE (2026-04-01)**
3. **XSD validation in CI**: Two weeks. Run `xmllint --schema` against the IRS XSD for at least
   Form 1040 and Schedule 1. This will reveal additional structural issues.
4. **Submission ZIP package**: Two weeks. Build the manifest + XML + attachment ZIP format that
   clearinghouses accept. This unlocks the clearinghouse path.
5. **Partner with one clearinghouse**: 4-8 weeks. Drake Software, TaxAct/Drake, CrossLink, and
   others offer clearinghouse APIs. This is faster than pursuing direct IRS transmitter status.
6. **Form 8879 e-signature**: Three weeks. Required before a return can be filed.
7. **Acknowledgement processing**: Four weeks. Without this, you cannot tell users their return
   was accepted or rejected.
8. **IRS ATS testing**: Six weeks. Must complete before going live with any clearinghouse.
9. **At-rest encryption**: Three weeks. Required before storing any real taxpayer data.
10. **State returns** (long tail): 6+ months per major state. Do California first ($50B+ in
    taxpayer refunds; largest e-file volume).

### 8.3 Timeline Estimate

Assuming one experienced developer plus Claude (current pace appears to be significant):

- **MVP clearinghouse e-file path (federal only)**: 6-9 months of focused work
- **Federal + one state (California)**: 12-15 months
- **Full commercial filing product (federal + top 10 states + amendment)**: 24-30 months

The bottleneck is not code quality — the core engine is genuinely good. The bottleneck is:
(a) IRS administrative processes (software registration, ATS testing) which have fixed lead times,
and (b) state return infrastructure which is multiplicative work.

### 8.4 Alternative Paths

**Recommended: Calculation engine + clearinghouse API**

Rather than pursuing IRS direct transmitter status, build an API that:
1. Accepts taxpayer data
2. Computes the return (already works)
3. Generates MeF XML (mostly works, needs fixes)
4. Submits to a clearinghouse that handles IRS transmission

This avoids the IRS EFIN direct-transmitter process, reduces security burden, and lets the project
focus on the genuinely differentiated part (the calculation engine).

**Alternative: Embed in existing tax software ecosystem**

The engine is well-designed as a library. It could be licensed to existing tax preparers who already
have IRS transmitter status and clearinghouse relationships but want better calculation infrastructure.

**Alternative: API-only, no e-file**

Ship the calculation engine as a REST/JSON API. Let users export PDF or hand the computed numbers
to TurboTax for e-filing. This is the lowest-risk path to revenue and avoids all IRS certification
requirements.

---

## 9. Summary Scorecard

| Dimension | Score (1-10) | Notes |
|---|---|---|
| Architecture | 9 | DAG engine, pure nodes, Zod-first, OutputNodes type safety, immutability — genuinely well-designed |
| Form Coverage | 6 | 100% Drake screen mapping, but many exotic nodes are disclosure-only stubs; state returns = zero |
| MeF Compliance | 2 | XML generation exists but fails XSD validation (namespace, rounding), no transmission layer |
| Validation Rules | 5 | 61% implemented (1,163/1,916), 39% stubs; e-file database rules inherently server-side |
| Test Quality | 7 | 56K tests, 100% passing; good e2e scenarios; missing XSD validation tests and rejection tests |
| CLI/UX | 4 | Functional but developer-only; no interview flow, no PDF, no guided review |
| Security | 2 | Plaintext PII storage, no encryption, no audit log, no access control |
| Production Readiness | 3 | Core engine production-quality; outer shell (transmission, security, states) early-stage |

---

## 10. Top 10 Risks

1. ~~**XML namespace bug causes immediate reject-and-stop**: Rule X0000-008 requires `xmlns:efile`
   declaration. The `builder.ts` only emits `xmlns="http://www.irs.gov/efile"`. Every generated
   return would be rejected at the structural level before any business rules are evaluated.~~
   **FIXED (2026-04-01, commit 2213f60)** — `builder.ts` now emits both namespace declarations.

2. ~~**Floating-point amounts fail IRS XSD `USAmountType`**: IRS monetary amounts must be integers
   (no decimal point). The engine computes in floating-point (e.g., SE tax = $11,303.64) and
   emits floats directly. This would cause XSD schema validation failures on every return with
   non-integer computed amounts. No global rounding pass exists.~~
   **FIXED (2026-04-01, commit 2213f60)** — `element()` in `mef/xml.ts` now applies `Math.round()`.

3. **Plaintext PII storage is a regulatory blocker**: Any commercial deployment storing real SSNs
   and income data as plaintext JSON files would violate FTC Safeguards Rule (for tax preparers)
   and potentially state breach notification laws. This must be addressed before onboarding a single
   real user.

4. **Silent node skip on schema mismatch masks computation errors**: `executor.ts` line 67-70 silently
   skips any node whose pending input fails Zod parse. A routing bug that deposits the wrong shape
   of data to a node would cause that node to silently not execute, producing an incorrect tax
   return with no error or diagnostic.

5. **No IRS ATS testing**: The 35 ATS scenarios are a hard prerequisite for any MeF-capable
   software. The current e2e tests are development tests, not ATS-aligned. Building ATS alignment
   takes 6-8 weeks and requires IRS test return data.

6. **~532 validation rule stubs mean the return validator cannot catch large classes of errors**:
   ~~540~~ 532 stubs remaining after 8 F8835/F8379 rules implemented (2026-04-01). Returns with errors
   in general business credits (Form 3800: 180 stubs), dependent income (Form 8615: stubs), foreign
   income exclusion (Form 2555: 20 stubs), and per-item repeating group violations (112 stubs total)
   would pass validation when they should be rejected. Most remaining stubs require IRS e-file
   database lookups or a `everyItem` DSL combinator that does not yet exist.

7. **No state return infrastructure**: 43 states have individual income taxes. The product cannot
   be a complete filing solution without state returns. State returns are multiplicative work —
   each state has its own forms, rules, and e-file specifications. Timeline impact: 6+ months per
   major state.

8. **Clearinghouse integration timeline uncertainty**: Clearinghouse APIs require approval processes,
   test environments, and potentially licensing fees. The timeline for partner approval (Drake,
   TaxAct, CrossLink) is outside the codebase's control and typically takes 2-4 months after
   technical readiness.

9. **Single developer velocity risk**: The codebase shows strong AI-assisted development patterns
   (consistent conventions, comprehensive test coverage, rapid node addition). But IRS ATS testing,
   clearinghouse integration, state returns, and regulatory compliance work require human judgment
   and legal knowledge that cannot be fully AI-accelerated.

10. **`validSSN` predicate has a dead branch that makes it too permissive**: `predicates.ts`
    line 106 (`if (v.startsWith("9") && !v.startsWith("9")) return true`) is unreachable, meaning
    ITINs (which start with 9) are not validated as a special case and fall through to the general
    `return true`. This could allow invalid SSN-like numbers to pass validation that the IRS would
    reject in their database lookups.

---

## Self-Check Notes

This assessment is based on reading: `core/types/tax-node.ts`, `core/types/output-nodes.ts`,
`core/runtime/executor.ts`, `core/runtime/graph.ts`, `core/runtime/planner.ts`,
`core/validation/engine.ts`, `core/validation/predicates.ts`, `core/validation/rule-builder.ts`,
`core/validation/types.ts`, `forms/f1040/mef/header.ts`, `forms/f1040/mef/xml.ts`,
`forms/f1040/mef/filer.ts`, `forms/f1040/2025/mef/builder.ts`, `forms/f1040/2025/mef/forms/index.ts`,
`forms/f1040/2025/mef/forms/f1040.ts`, `forms/f1040/2025/registry.ts`, `catalog.ts`,
`forms/f1040/nodes/inputs/w2/index.ts`, `forms/f1040/nodes/inputs/f1099r/index.ts` (partial),
`forms/f1040/nodes/inputs/schedule_c/index.ts` (partial), `forms/f1040/nodes/inputs/schedule_a/index.ts`,
`forms/f1040/nodes/intermediate/forms/eitc/index.ts`, `forms/f1040/nodes/outputs/f1040/index.ts` (partial),
`forms/f1040/validation/rules/f1040.ts` (partial), `forms/f1040/validation/rules/ind.ts` (partial),
`forms/f1040/validation/rules/x0000.ts`, `forms/f1040/validation/field-registry.ts`,
`forms/f1040/validation/ALWAYSPASS_ROADMAP.md`, `forms/f1040/e2e/scenarios.test.ts`,
`cli/main.ts`, `cli/store/store.ts`, `cli/commands/export.ts`, `deno.json`, `README.md`,
`docs/product.md`, `forms/f1040/1040_coverage_plan.md`.

Claim validation: All specific file paths and line number references were verified against actual
file content at time of writing.
