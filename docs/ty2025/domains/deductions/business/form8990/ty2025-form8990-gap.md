# TY2025 Form 8990 coverage boundary

Sources: [2025 Form 8990](https://www.irs.gov/pub/irs-prior/f8990--2025.pdf),
[2025 instructions](https://www.irs.gov/pub/irs-prior/i8990--2025.pdf), and
checked-in TY2025 v5.4 `Shared/IRS8990/IRS8990.xsd`.

Status: Form 8990 filing is deliberately blocked. No test, local XSD,
filled-PDF, IRS business-rule, or ATS validation has been run for it.

## Complete traced-proceeds source for bounded Schedule C debt (written, unrun)

The one-business two-pass calculation now requires each interest payment to
identify its debt account and a structured proceeds trace. The trace states the
debt disbursement date and gross proceeds, plus dated, document-referenced uses
whose amounts account for every dollar of those proceeds in the same Schedule C
business. The uses cannot precede the disbursement, fall after 2025, duplicate
an expenditure reference, or change between payments on one debt account.
Distinct accounts cannot claim one tracing record or the same expenditure
document. The debtor SSN, lender EIN,
business ID, payment amounts, and aggregate Schedule C line 16b reconciliation
remain required. A mixed-use loan cannot enter this wholly business-allocated
slice. Positive two-expenditure and changed amount, date, business, account,
and document-reference fixtures are authored for the deferred validation batch.

The [2025 Schedule C instructions](https://www.irs.gov/instructions/i1040sc)
require interest to be allocated to its proper use; the [2025 Form 8990
instructions](https://www.irs.gov/instructions/i8990) apply the section 163(j)
limit to business interest expense. These entered loan and expenditure
references do not authenticate bank or vendor documents. The active return
remains unfileable pending the accepted-filing carryforward contract and the
full validation gates below.

The first source-backed staging step now parses actual Schedule C input for
exactly one identified business before Schedule C profit is calculated. It
derives current-year interest expense from that business's lines 16a and 16b,
rejects unlinked top-level interest, and preserves lines 12 and 13 depletion and
depreciation as _ATI candidates_, not an allowed Form 8990 line 11 add-back. It
also calculates a tentative Schedule C at-risk net profit with all interest
otherwise allowed, using the same home-office, employment-credit, and at-risk
helpers as the ordinary Schedule C node. That is a business-level
counterfactual, not return-wide Form 8990 line 6. The strict two-pass path uses
this extractor; both native export builders now require a source-recalculated
bounded attachment. This stage does not establish a filable nonexempt path or
change the ordinary small-business-exemption gate.

The now-removed asserted-ATI source could make interest appear fully allowed
without reconciling tentative taxable income, NOL/QBI, depreciation, business
interest income, and other ATI components to the filed return. Both the tax node
and native MeF builder now reject that source before producing Form 8990. The
legacy public input and calculator were removed. The v5.4 tag map now projects
only the strict return-reconciled bounded record, but the return is not yet
filing-ready.

Positive Schedule C interest now requires an explicit small-business-exemption
source: all three prior-year gross-receipts amounts for a business existing all
three years, including required aggregation, affirmative non-tax-shelter
verification, and average gross receipts no higher than the TY2025 $31 million
threshold. The optional `subject_to_163j` flag no longer establishes eligibility
and is rejected. Nonexempt and unknown-status Schedule C interest fail during
ordinary one-pass execution; only the strict Form 8990 two-pass computation
context can calculate them before SE tax and QBI. Unlinked upstream Form 1098
interest also fails.

## Still blocked

### Source-graph check for the proposed one-Schedule-C slice

The [2025 IRS form](https://www.irs.gov/pub/irs-prior/f8990--2025.pdf) makes
line 6 taxable income before the limitation, then adds business interest,
section 172 NOL, section 199A QBI, and depreciation/amortization/depletion on
lines 8–11 and removes business interest income on line 18. The bounded two-pass
route calculates those applicable lines from a real provisional return and
classified receipt ledger; it rejects additional income/deduction sources,
pass-through items, and a nonzero prior interest carryforward. Schedule C
supplies identified line-16b interest and lines 12/13 depletion/depreciation;
the strict one-business path does not attempt other interest classes or
businesses. Its prior-year filed Schedule C line-3 lower bound is distinct from
the ordinary small-business-exemption verification shape.

In ordinary execution, `schedule_c.compute` calls
`assertScheduleCInterestExempt` before net profit, SE tax, and QBI. The Form
8990-local opaque context now permits only the exact staged source in a
provisional and finalized pass, recomputing Schedule C before downstream nodes.
No raw allowance can bypass the ordinary gate. Focused node and MeF cases are
written but unrun.

- A positive line 31 changes deductible Schedule C interest, SE tax, and QBI.
  The bounded two-pass calculation recomputes these items, but still does not
  authorize Form 8990 export.
- The strict path reconciles its applicable ATI components and final-return
  lines; additional income/deduction, multiple-business, and pass-through routes
  remain unsupported rather than inferred.
- Prior-year interest carryforwards, partner/S-corporation excess items,
  floor-plan financing, rental interest, CFC groups, and multiple businesses
  need separate source models and Schedule A/B rows.
- The registered PDF descriptor has canonical Part I positions and projects only
  the bounded calculated record. Manually supplied line values fail
  source-and-return recalculation. Native XML and filled PDF have not passed the
  single agreed full/XSD/visual batch or the IRS ATS gate.

## Dependency order for an actual filing route

1. Classify every interest item as business, investment, personal, or excepted
   trade or business interest before using Schedule C lines 16a/16b. Resolve
   section 163(j) small-business status from the complete aggregated receipts
   workpaper and tax-shelter test. The existing exemption route covers a
   three-year Schedule C source; it is not an active Form 8990 filing route.
2. For a nonexempt taxpayer, establish return-wide tentative taxable income
   before the section 163(j) limitation, plus sourced NOL, QBI,
   depreciation/amortization/depletion, business interest income, and every
   trade-or-business/nonbusiness exclusion. Reconcile those amounts to the final
   Form 1040 and its supporting forms, rather than accepting the direct input's
   assertions.
3. Compute the 30% ATI limit and allowed/disallowed interest. Feed allowed
   interest back into Schedule C lines 16a/16b **before** Schedule C net profit,
   self-employment tax, QBI, AGI, and income tax are finalized. Persist any
   disallowed amount with its year and business identity.
4. Only then produce complete Form 8990 MeF and PDF outputs from the same
   reconciled calculation and validate the TY2025 XSD, filled PDF, and IRS
   business rules. Ordinary Schedule C execution remains guarded; the strict
   two-pass path calculates but is not authorized for export.

The staged Schedule C interest amount resolves only the first input on Form 8990
line 1. It does **not** establish 2025 line 6 tentative taxable income: Form
1040 line 15 is finalized downstream of Schedule C profit, AGI, deductions, and
QBI, and the IRS line 6 must be computed as if section 163(j) did not apply
after other applicable limitations. It also does not prove which depreciation
was actually deducted in that counterfactual, business interest income or
nonbusiness exclusions, and cannot feed an allowed amount back to Schedule C.
The source-stage cases and older fail-closed node/MeF/PDF cases are written but
unrun under the build-first hold.

### DAG and two-stage calculation requirement

The executor runs each node exactly once in a topological order. Schedule C is
upstream of Schedule SE, the AGI aggregator, Form 8995, and final Form 1040;
Form 8990 is currently downstream of Schedule C and has no output edge. Adding
an ordinary Form 8990 → Schedule C edge would form a cycle, not a valid feedback
route. Nor is final Form 1040 line 15 a substitute for line 6: line 15 is
nonnegative and reflects deductions (including QBI) based on the already chosen
Schedule C deduction, while Form 8990 requires a possibly signed counterfactual
before section 163(j) and after other limitations.

A correct route needs a first-class provisional return calculation that admits
nonexempt interest _solely as an all-interest-otherwise-allowed counterfactual_,
retains signed tentative taxable income, and tags every source contribution to
ATI, NOL/QBI, depreciation/amortization/depletion, business interest income, and
nonbusiness/excepted-business exclusions. The limit must then be computed from
those reconciled facts. A second, finalized pass must apply the allowed interest
to the identified Schedule C lines before Schedule C, SE, QBI, AGI, and Form
1040 are computed, and compare the resulting return with the first pass and
Form 8990. The ordinary one-pass route and asserted direct Form 8990 source
provide no such two-stage contract. The local workpaper below now computes a
bounded two-pass result, but it is not a positive filing path.

The Form 8990-local `ProvisionalScheduleCInterestPass` and
`FinalizedScheduleCInterestPass` now encode a bounded second-pass calculation
for one identified Schedule C with whole-dollar line 16b interest only. The
provisional record retains the parsed original source, source-derived interest,
and all-interest-otherwise-allowed at-risk profit. The pure transformation
accepts an allowed amount no greater than that source interest, changes only the
identified business's line 16b, and recomputes its at-risk profit using the same
Schedule C helper. It rejects line 16a/mixed interest and any top-level economic
injection not modeled in this slice. The internal two-pass workpaper below
supplies its allowance from the local ATI/limit calculation; these records
remain calculation staging only. Ordinary Schedule C execution still applies its
exemption gate and no export is enabled.

`calculateBoundedProvisionalATI` is the next Form 8990-local stage. It accepts
only a provisional executor result for a single filer with exactly `general` and
`schedule_c` raw inputs and a simple, materially participating Schedule C whose
line 16b interest and lines 12/13 DAD are explicit. An itemized receipt ledger
must cover the entire Schedule C line 1 gross-receipts amount and classify each
item as sale or business interest income; an absent ledger is not treated as
zero business interest income. The stage checks the original and executed
Schedule C source, error-free provisional execution, Schedule C profit, Schedule
SE/AGI and Schedule 1 half-SE-tax deduction, QBI, and final Form 1040 totals. It
constructs signed Form 8990 line 6 from reconciled AGI, standard deduction, and
QBI and cross-checks the signed Form 6251 input generated by the existing
standard-deduction node. In this positive-taxable- income-only slice, the
standard deduction is line 7 (nonbusiness deduction), line 8 is sourced business
interest, line 10 is provisional QBI, and line 11 is the Schedule C DAD actually
taken; business interest income in the ledger is removed on line 18 and also
supplies line 23. Any missing component, additional return source, unexpected
Schedule C expense, age-based deduction, nonpositive signed line 6, or
reconciliation mismatch rejects. It receives a provisional result only through
the opaque Form 8990-local computation context described below; it does not
authorize filing.

The required computation design is not a new edge in the existing DAG. The Form
8990-local workpaper now invokes the existing `execute` engine twice with an
opaque Schedule C computation-mode contract: first pass computes a signed,
source-tagged provisional return with all interest otherwise allowed; then the
Form 8990 calculation produces a verified allowance; second pass gives only that
internally calculated allowance to Schedule C before it emits SE/QBI/AGI inputs.
The normal Schedule C node accepts the opaque internal pass only for its exact
staged source, and local ATI construction preserves signed tentative taxable
income before the Form 1040 line-15 zero floor. The generic
`core/runtime/executor.ts` has not changed; putting an optional raw allowance
into the public Schedule C input would be an unsafe asserted bypass.

No compatibility layer, fallback serializer, or temporary add-back is included.

### Bounded internal two-pass workpaper (not yet a filing route)

`runBoundedForm8990TwoPass` now invokes the existing Form 1040 executor twice
with an opaque, Form 8990-local Schedule C computation context. Its first pass
computes the all-interest-otherwise-allowed return; the local ATI/limit
calculator derives the applicable Form 8990 Part I amounts through line 31 in
the one-business positive-income case; and its second pass changes only the
identified Schedule C line 16b to the calculated allowance and checks final
Schedule C profit and Form 1040 line 9. The normal execution path still applies
the upstream interest exemption guard. The TY2025 Form 1040 definition now
accepts one strict public `form8990` source-record shape: classified
current-year receipts, reviewed 2022–2024 filed Schedule C lines 1–3, and a
reviewed filed-2024 Form 8990 line 31. The public Schedule C input remains the
existing array of business items; the two-pass runner derives the node-level
`schedule_cs` source from that array, then sends the internally calculated
allowed-interest array back through the ordinary start node for finalization. It
invokes the two-pass runner for that shape; other returns still use one
execution through the same required definition entrypoint. CLI export,
validation, and return views call that entrypoint. The active result carries
calculated Form 8990 pending fields **and an error diagnostic** stating that
native attachment/carryforward export is unfileable. Neither ordinary nor
`--force` finalized export can silently omit the attachment; draft MeF/PDF
builders retain their source-recalculation guards. Source-document
authentication, carryforward persistence, native export validation, and the held
validation batch remain open.

The nonexempt proof was tightened after checking the
[2025 IRS instructions](https://www.irs.gov/pub/irs-prior/i8990--2025.pdf):
§448(c) gross receipts must be reduced by returns and allowances; predecessor
receipts, short-period annualization, and applicable aggregated receipts also
matter. The internal route now requires three distinct _filed, full
calendar-year_ 2022–2024 Schedule C references for the same business. Each
reference carries lines 1, 2, and 3, and the proof rejects unless line 3 equals
line 1 less line 2. It uses only the three line-3 amounts as a **lower bound**,
requiring their average to exceed the TY2025 $31 million threshold. Other
eligible receipts, predecessors, and controlled-group amounts can raise that
lower bound, but are not guessed from these Schedule Cs; a case that depends on
any of them to cross the threshold remains closed. Short prior periods likewise
remain closed pending sourced annualization. This corrects the earlier invalid
line-1-only proof, which could declare a taxpayer nonexempt despite returns and
allowances bringing net receipts below the threshold. Focused cases for the
corrected proof and two-pass reconciliation are written but unrun under the
build-first hold.

### Exact export blockers after static inspection

The internal workpaper cannot yet be treated as a filed Form 8990. Its
calculated limit now projects a typed `form8990` pending node payload after
final-return reconciliation, while the ordinary node rejects active one-pass
sources. MeF and PDF now accept only a source-and-calculation record whose
bounded two-pass run reproduces every finalized document, calculated line, and
carryforward workpaper. Source-calculated line 7 has its native XSD sequence
entry, `LossDeductionNotAllocableAmt`, between `TaxableIncomeAmt` (line 6) and
`BusInterestExpnsNotPassThruAmt` (line 8). That mapping change does not activate
filing.

The PDF descriptor's old positions `f1_4`, `f1_5`, and `f1_9` incorrectly
treated foreign-entity header fields and printed line 4 as lines 1, 2, and 6.
The Rev. December 2025 canonical AcroForm `/Fields` tree and page `/Widget`
positions now establish this complete _Part I position map_ (all names below are
under `topmostSubform[0]`, with `[0]` on each field):

| Printed line | Page and canonical field | Printed line | Page and canonical field |
| ------------ | ------------------------ | ------------ | ------------------------ |
| 1            | `Page1[0].f1_6[0]`       | 17           | `Page1[0].f1_22[0]`      |
| 2            | `Page1[0].f1_7[0]`       | 18           | `Page1[0].f1_23[0]`      |
| 3            | `Page1[0].f1_8[0]`       | 19           | `Page1[0].f1_24[0]`      |
| 4            | `Page1[0].f1_9[0]`       | 20           | `Page1[0].f1_25[0]`      |
| 5            | `Page1[0].f1_10[0]`      | 21           | `Page1[0].f1_26[0]`      |
| 6            | `Page1[0].f1_11[0]`      | 22           | `Page1[0].f1_27[0]`      |
| 7            | `Page1[0].f1_12[0]`      | 23           | `Page2[0].f2_1[0]`       |
| 8            | `Page1[0].f1_13[0]`      | 24           | `Page2[0].f2_2[0]`       |
| 9            | `Page1[0].f1_14[0]`      | 25           | `Page2[0].f2_3[0]`       |
| 10           | `Page1[0].f1_15[0]`      | 26           | `Page2[0].f2_4[0]`       |
| 11           | `Page1[0].f1_16[0]`      | 27           | `Page2[0].f2_5[0]`       |
| 12           | `Page1[0].f1_17[0]`      | 28           | `Page2[0].f2_6[0]`       |
| 13           | `Page1[0].f1_18[0]`      | 29           | `Page2[0].f2_7[0]`       |
| 14           | `Page1[0].f1_19[0]`      | 30           | `Page2[0].f2_8[0]`       |
| 15           | `Page1[0].f1_20[0]`      | 31           | `Page2[0].f2_9[0]`       |
| 16           | `Page1[0].f1_21[0]`      |              |                          |

The descriptor projects Part I values from the finalized record, including line
27 from line 25 and line 28 from line 4, and maps the name and SSN header.
Identity and amount/blank conventions still need the held visual review. Parts
II/III are not applicable to this one direct Schedule C taxpayer, but other
taxpayer paths remain unsupported. This was read-only PDF/AcroForm inspection;
no filled PDF was rendered. Map and rejection cases are written but unrun.

Finally, the second-pass check currently reconciles the identified Schedule C
profit, Schedule 1 income/adjustments, Schedule SE tax and half-tax deduction,
Schedule 2, QBI, AGI, Form 1040 income/deduction/tax totals, and zero
credits/payments under the narrow input assumptions. It rejects diagnostic
errors, unmodeled Schedule 2 taxes, and unrelated carryforwards. A branded
post-finalization Form 8990 node output is then assembled from the calculated
Part I lines, with line 30 matching the internally applied Schedule C allowance
and line 31 matching its disallowed amount. The local runner exposes this as
`internalProjectedPending`; the Form 1040 execution entrypoint now exposes those
calculated fields, source records, a typed 2025-to-2026 workpaper, and a numeric
`form8990_disallowed_2025` carryforward alongside an explicit unfileable
diagnostic until a filed, accepted carryforward ledger exists. The public source
records carry references, but no document-authenticity verification. Adding
either a public allowance override or a fallback to the old asserted direct
source would bypass the source proof; neither was added. MeF and PDF reject
missing or altered projection records. The held validation batch and accepted
carryforward storage remain open.

The [2025 IRS instructions](https://www.irs.gov/pub/irs-prior/i8990--2025.pdf)
direct a nonpartnership taxpayer to carry prior Form 8990 line 31 to current
line 2, and current line 31 to next year's line 2. The internal route now
requires a distinct reviewed _filed 2024 Form 8990_ reference with the same
taxpayer SSN and line 31 exactly zero; nonzero prior carryforwards remain
closed. It projects the calculated 2025 line 31 to a typed 2026 line-2
`unfiled-workpaper` record with tax year and business identity. A reference
string is not document-authenticity verification, and the execution workpaper is
not itself filed. An explicit calculated-only store operation now saves the same
typed record, but no accepted filing-state store writes it. Native MeF/PDF
projection is source-recalculated, but schema, visual PDF, business-rule, and
ATS verification have not run. The entrypoint error diagnostic keeps the return
unfileable. Focused source-to-projection and tampering cases are written but
unrun.

The [2025 instructions](https://www.irs.gov/pub/irs-prior/i8990--2025.pdf) also
require categorizing interest under the debt-proceeds tracing rules before
applying section 163(j). The bounded one-Schedule-C source now requires an
`interestExpenseRecords` ledger. Each payment names its interest statement,
debt-proceeds tracing workpaper, identified Schedule C business, the total
interest paid, and an affirmative nonexcepted-business allocation. This bounded
route requires the whole payment to be allocated to that business; mixed-use
debt needs a separate calculation and remains open. Payment references must be
unique, and the whole-dollar allocated amounts must sum exactly to Schedule C
line 16b before either execution pass. Missing, duplicated, unmatched, personal,
and excepted-business classifications reject. The calculated MeF/PDF projection
replays the same ledger, so editing it after finalization also rejects. These
document references are review leads, not verified source documents; actual
debt-tracing review and authenticity remain open. The related cases are written
but unrun under the build-first hold, and filing stays blocked.

Each traced payment now also requires the debtor's nine-digit SSN, lender EIN,
and debt-account reference. The debtor must match the current taxpayer, using
the same identity as the reviewed 2024 Form 8990. Multiple interest payments
may share a debt, but a lender/account pair must map to one debt-proceeds
workpaper and a workpaper may identify only one lender/account pair. The
calculated projection retains these fields, and native/PDF replay compares the
supplied projection with the finalized pending source so an account or lender
change after calculation rejects even if the amount is unchanged. Positive
two-payment, wrong-owner, and conflicting account/workpaper fixtures are
authored but unrun. This is a source-consistency prerequisite under the
[2025 Form 8990 interest categorization instructions](https://www.irs.gov/pub/irs-prior/i8990--2025.pdf),
not authentication of lender statements, debt tracing, or an accepted filing.

The three reviewed filed 2022–2024 Schedule C receipts records now each require
the current taxpayer's SSN. Their identities are compared with the filed 2024
Form 8990 taxpayer already checked against the current return, and each Schedule
C document reference must differ from that Form 8990 reference. The two-pass
calculation and native/PDF source replay reject a swapped taxpayer or reused
record. This ties the gross-receipts lower bound to the same taxpayer; the
references still do not authenticate actual filed documents. Focused positive
and owner-tampering fixtures are authored but unrun.

The CLI return store now has an explicit `persistCalculatedForm8990Workpaper`
operation. It writes a typed `calculated-unfiled` record inside that return's
existing `return.json`, not as a side effect of a preview or export. The record
contains the return ID, taxpayer SSN, a canonical SHA-256 digest of the source
records, Form 8990 line 31, and the typed 2025-to-2026 line-2 workpaper. The
write uses a synced staged file and rename. `readCalculatedForm8990Workpaper`
re-executes the bounded return and rejects a stale source digest, changed
line-31 amount, changed workpaper, wrong return identity, or any calculation
diagnostic beyond the deliberate unfileable gate. Serialization and rejection
cases are written but unrun under the build-first hold. A hash ties the record
to the entered records; it does **not** authenticate a 2024 filed Form 8990,
debt-tracing documents, or an IRS filing acknowledgment. Any normal append,
update, or delete of an input clears the calculated snapshot in that same atomic
`return.json` write. The read-time hash check still catches direct file edits or
other tampering outside those store operations.

This is not yet a filed-year ledger. `exportMefCommand` returns XML in memory,
`exportPdfCommand` writes only the PDF, and A2A evidence storage archives opaque
acknowledgment bytes without interpreting IRS acceptance. There is no contract
that binds one accepted IRS Submission ID and parsed, accepted acknowledgment to
the exact submitted Form 8990 XML, return ID, taxpayer SSN, source digest,
business reference, and line 31. There is also no 2026 importer that checks that
accepted ledger entry before putting 2025 line 31 on 2026 line 2. Until those
direct joins exist, the calculated record stays `unfiled`, the executor error
continues to block finalized TY2025 export, and no 2026 carryforward is treated
as filed. A reference string or locally written XML cannot clear this gate.

The outbound half of that contract now has a read-only prerequisite:
`readA2aArchivedSubmission` reopens the hash-checked Send record, the outer
container, and the unique Submission ZIP. It checks the Send body's Submission
IDs, the inner manifest's 2025/1040/IRS Submission ID and taxpayer TIN, and the
return XML's primary SSN against a caller-supplied expected identity and exact
prepared XML SHA-256. It returns container, inner archive, and manifest digests
for a future accepted ledger. Focused exact-byte and wrong-identity fixtures are
authored but unrun. The expected XML digest must itself come from a trusted
prepared return; this reader does not assert transmission, parse an IRS
acknowledgment, authenticate IRS status, or permit a Form 8990 export.

The accepted-year ledger must be an immutable entry written only after reading
the archived outbound Submission ZIP and a parsed IRS **accepted**
acknowledgment for its unique Submission ID. Its key must include return ID,
TY2025, taxpayer SSN, and business reference; its payload must bind the source
record digest, exact submitted Form 8990 XML digest, Submission ID and archive
digest, acknowledgment record ID and payload digest, and line 31. A TY2026
line-2 importer must re-read that accepted entry, verify those digests and
identities, and consume exactly its line-31 amount once. The current A2A archive
stores acknowledgment bytes as opaque payloads and has no trusted accepted
status parser, so it cannot create this entry or clear the TY2025 export gate.


### October 8, 08:13 UTC — retained NOL and Form8990 two-pass ordering

Isolated candidate commit `3a74c0ddf` composes the retained current NOL deduction with the existing one-Schedule-C Form8990 calculation. Its internal executor hook preserves the exact provisional/finalized ScheduleC permission context. The tentative return subtracts the retained NOL; Form8990 line9 restores it when calculating ATI, alongside QBI line10. Both passes separately require the same scalar nonnegative integer NOL on Schedule1 and the AGI aggregator and reconcile the resulting income/SE/QBI/Form1040 totals. Finalizer replay still compares all raw numbered lines exactly. Retained annual workpaper comparisons now use the established signed whole-dollar filing rule, since raw QBI/remaining taxable income can be fractional.

The source case uses200,000 gross receipts,100,000 traced interest,1,000 depletion and7,500 depreciation, plus reviewed prior filed-source facts and ordinary44,000 NOL derived from complete retained history. Compared with the actual pre-NOL two-pass return, ATI and the allowed/disallowed interest amounts are unchanged after NOL restoration, Form1040 AGI is44,000 lower, self-employment tax is unchanged, and QBI is refigured under the lowered income limit. The actual post-NOL finalizer reproduces the return. Changed current-review amounts, debtor-owner conflicts, and malformed/NaN/string/array/fractional/negative/mismatched NOL values reject in the relevant passes.

Primary [2025 Form8990 instructions](https://www.irs.gov/instructions/i8990), lines9/10, requires NOL and QBI additions for ATI. HTML/URL/digest/UTC are retained in private `form172-interest-composition-20261008-v1/primary-sources.json`. The synthetic reviewed source facts do not establish issuer authenticity or an accepted interest/NOL carry ledger. The public Form8990 route continues to emit its existing unfileable diagnostic; this internal workpaper returns filingReady=false, and NOL packet admission remains guarded. ScheduleJ/QEF composition, full return scope and authentic/legal/accepted-history/AMT settlement remain original open requirements.

The normal typechecked focused command adds all10 existing Form8990 test files to the retained NOL/AMT command. Final v3 ended `2026-10-08T08:12:21.106709+00:00`, actual tool exit0: **360 passed / 0 failed / 0 ignored**, log SHA256 `8a147640471c0bdb646e17c7e756429e60ebcca163c29c75bc040bad81816545`. Independent08:12:43 review verifies complete2,697 candidate and2,696 root runtime path sets and hashes unchanged. v1 is retained359/1 exit1: new workpaper fixture copied fractional raw QBI/TI into integer-only source fields. v2 is retained360/0; v3 adds typed malformed-value rejection checks. Candidate changes remain isolated while root full session48127 is confirmed live08:12; no second full run or candidate integration. Previous turn integrated verified runtime and launched serial full validation; this turn makes verified original-scope ordering implementation progress. Frozen main52 and complete future47 are unchanged; no broad checkoff or IRS acceptance claim.
