# TY2025 Form 8959 native source-to-print contract

Build status: the original September 28 implementation is verified by the
October 10 checkpoint below. Broader filled-PDF, upstream-source, business-rule
and ATS requirements remain open.

The [2025 IRS Form 8959 instructions](https://www.irs.gov/instructions/i8959)
separate Medicare wages, self-employment income, RRTA compensation and
additional withholding. They also require a Form 8959 for the single-employer
W-2 threshold even when the joint-return tax is zero. The
[2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi) permit
whole-dollar returns: add cents-bearing source amounts first and round the
amount entered on each line once.

The checked-in TY2025 v5.4 `Common/IRS8959/IRS8959.xsd` is the native field
authority. Its `USAmountType` and `USAmountNNType` in `Common/efileTypes.xsd`
are respectively `xsd:integer` and `xsd:nonNegativeInteger`, each capped at 15
digits. The native sequence is:

| Native group                               | Printed lines represented                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `AdditionalTaxGrp/FilingStatusThresholdCd` | One code for printed lines 5, 9 and 15; only `125000`, `200000` or `250000`           |
| `AdditionalMedicareTaxGrp`                 | Lines 1, 2, 3, 4, 6 and 7                                                             |
| `AddnlSelfEmploymentTaxGrp`                | Lines 8, 11, 12 and 13; line 10 reuses line 4 and has no separate native element      |
| `AddnlRailroadRetirementTaxGrp`            | Lines 14, 16 and 17                                                                   |
| `AdditionalTaxGrp/TotalAMRRTTaxAmt`        | Line 18, the sum of printed lines 7, 13 and 17                                        |
| Top-level withholding elements             | Lines 19, 21, 22, 23 and 24; line 20 reuses line 1 and has no separate native element |

`forms/f1040/nodes/intermediate/forms/taxes/employment/form8959/index.ts` now computes and prints only
whole-dollar amounts. W-2, Form 4852, household and CT-2 source rows retain
cents while their respective line sums are formed, then each printed line is
rounded. The displayed line 18 is exactly the sum of rounded lines 7, 13 and 17
and is deposited in Schedule 2 line 11. The displayed line 24 is exactly line 22
plus line 23 and is deposited in Form 1040 line 25c. The complete 24-line print
schema is strict and exported for the native descriptor.

`forms/f1040/2025/mef/forms/taxes/employment/f8959.ts` no longer calculates a second approximate Form 8959 from
sparse summary fields. It requires that complete node record, validates its
summary-to-line equality, threshold against the filed return header, line
arithmetic, filing trigger and final Schedule 2/Form 1040 deposits. It then
projects those exact print values in the XSD sequence. A sparse legacy-shaped
record, unrecognized field, fractional printed amount or inconsistent
cross-return amount now rejects; there is no fallback serializer. A zero-tax
Schedule 2 can be absent because the graph emits no Schedule 2 deposit in that
case. The final Form 1040 context is still required.

Focused cases are written for all three tax parts and withholding, a zero-tax
joint-return W-2 filing trigger, zero-tax excess withholding, cents-bearing
source aggregation, and rejection of changed print lines, source summaries,
missing header and final-return joins. Older builder smoke fixtures were updated
to supply a complete print record instead of the former sparse object. The
remaining checks are the single full test batch, TY2025 XSD, visually filled
Form 8959, source-document reconciliation, business rules and ATS.

## Upstream-source reconciliation

The executor retains the Form 8959 input deposits beside its self-output print
fields. Before either MeF or PDF exports a printed Form 8959, the shared check
re-sums the W-2, Form 4852 and household Medicare wages into line 1; Form 4137
tips into line 2; Form 8919 wages into line 3; Schedule SE income into line 8;
W-2 and CT-2 RRTA compensation into line 14; the three Medicare withholding
deposits into line 19; and W-2/CT-2 RRTA additional withholding into line 23. It
also checks the single-W-2 filing trigger. Each line sum is rounded once,
matching the graph node. A source-only pending record is strict-parsed and
recomputed with the same graph node; it is omitted only when that node proves
there is no filing trigger **in those deposits**. A missing required form or
partial print record relative to the deposits is rejected. An empty pending slot
is also checked against identified original W-2 and Form 4852 records. The
omission check compares those original records to their deposits, including the
single-employer threshold. A missing wage, withholding, RRTA, or trigger deposit
rejects. A matched below-threshold W-2 can still omit Form 8959 when the graph
node finds no tax or excess withholding.

Where complete original records are present, the check also compares W-2, Form
4852 W-2-substitute, household-wage and CT-2 quarterly items to their
corresponding graph deposits before printing. The checkpoint below also
replays retained Form 4137 and Form 8919 owner calculations before comparing
their Medicare deposits. Schedule SE's multi-source line 6 is still not
independently re-derived here: its finalized deposit is checked against the
printed line, which does not prove the upstream calculation. This remains a
verification gap, not an approved exclusion. Focused rejection cases for changed deposits and changed
Form 4852/household records pass in the October 10 grouped gate.

## October 10 public wage, spouse and threshold checkpoint

The existing calculation, native-contract and end-to-end modules pass **50
checks**. Seven new public-source cases pass typed tests and full TY2025 v5.4
Return1040 XSD, for **57 distinct passes, zero failures, zero ignored**. These
cases execute ordinary identified W-2 sources through the actual return graph,
not staged Form 8959 totals. The [2025 instructions](https://www.irs.gov/instructions/i8959)
were checked on October 10 for the threshold, single-employer filing trigger,
combined spouse wages and additional-withholding treatment.

| Case | Medicare wages | Additional tax | Additional withholding | Final total tax |
| --- | ---: | ---: | ---: | ---: |
| Single employer | 220,000 | 180 | 180 | 42,603 |
| Joint two earners | 325,000 | 675 | 0 | 56,809 |
| Joint single-employer trigger | 220,000 | 0 | 180 | 31,298 |
| Separate filer | 200,000 | 675 | 0 | 37,742 |
| Box 5 exceeds Box 1 (190,000) | 220,000 | 180 | 180 | 34,847 |
| Joint spouse-only wages | 220,000 | 0 | 180 | 31,298 |
| Joint wages, neither employer above 200,000 | 300,000 | 450 | 0 | 50,584 |

Each test verifies Form 8959 lines 18/24, Schedule 2 line 11, Form 1040
additional withholding and final tax/payment deposits, plus the PDF descriptor's
projected values. All seven native documents remain present, including the two
zero-tax joint cases. Altering the retained wage deposit rejects in both native
export and PDF projection: **seven native and seven projection rejections**.
These are synthetic source cases; no employer-issued-copy authenticity is claimed.

Private source/pending/filer/projection JSON, original emitted XML, command logs
and SHA-256 provenance are retained in
`.state/research/form8959-route-audit-2026-10-10/`. Run the new module with
`-- --evidence-dir=<directory>` to retain equivalent evidence; without that
argument it writes no evidence files. The seven XSD tests explicitly skip when
the local IRS schema is absent; none skipped in this recorded run.

At the initial native checkpoint, no filled PDFs or visual pages were counted. The PDF descriptor
projection check does not prove printed output, identity or page placement.
The 50-test group covers CT-2, substitute and household deposits, but those are
not seven additional full-return XSD cases. Source payment authenticity,
original Form 4137/8919 and multi-source Schedule SE derivation, business rules
and IRS acceptance remain open. No production calculation changed.

## October 10 complete packet review

The same seven retained public-source cases were replayed through the actual
`buildMefBundle` and `buildPdfBytes` path at `d0b47928d`; their pending graphs
match the saved native checkpoint exactly. All seven accompanying bundle XML
files pass full Return1040 XSD again. Seven static filing PDFs contain **35
pages**, all rendered and inspected: Box-5 difference 5; spouse-only 3; joint
threshold 6; joint two-earner 6; joint zero-tax trigger 3; separate filer 6;
single withholding 6. The two 3-page joint packets have identical PDF bytes,
consistent with the same joint totals despite different wage ownership.

An independent Decimal calculation starts from Box 1/5/6 and filing status,
recomputes ordinary bracket tax, additional Medicare tax and withholding,
and matches final tax, payments, refund or amount owed in every return. The
exact printed Form 8959 name/SSN and ordered amount sequences match the
projected fields; all packets are flattened with no remaining AcroForm fields
or widget annotations. Owner names, filing-status/digital-asset boxes, page
order, applicable parts and legibility were inspected on all pages. The four
zero-NIIT Form 8960 pages are included in the review count.

The two zero-tax joint Form 8959 copies on page 3 leave lines 6, 7 and 18 blank,
although their native elements contain zero. Line 6 explicitly says to enter
zero. This repeats deferred item 76; it was appended there and **not repaired**.
Line 24 correctly prints the 180 additional withholding, and final amount owed
is 1,118 in each case. Thus the review is qualified, not a clean parity approval.

Evidence in the same private directory now includes original/rendered XML,
seven PDFs, 35 page images, nine contact sheets, `packet-verification.json`,
`visual-review.json` and an updated SHA-256 manifest. This adds packet evidence,
not new unique cases or additional test counts: **57 tests / seven returns**
remain the scope. No production code changed; broader source, payment, mixed
SE/tip/reclassification and IRS acceptance requirements remain open.

## October 10 retained employment-source reconciliation

Both Form 8959 exporters now recalculate retained Form 4137 and Form 8919
owner copies before accepting their deposits. Form 4137 uses Medicare tips
after the below-$20 monthly exclusions, rather than total taxable tip income.
Form 8919 uses full line 6 wages, rather than the Social Security-capped amount.
The existing calculators retain their owner, employer, reason-code and source
validation; this is a reconciliation guard, not a new tax formula or proof of
source authenticity.

The grouped gate passes **101 distinct typed tests, zero failures and zero
ignored**: 91 in the six Form 8959/4137/8919 calculator and return modules, plus
10 in the four existing income and Schedule 2 replay modules. The final
11-test native descriptor rerun and six-test income replay rerun overlap this
count and are not additional tests. Formatting, lint and diff checks pass.

The new owner cases verify both taxpayers' tips (5,985 after a $15 exclusion)
and full reclassified wages (230,000), rejecting six coordinated substitutions
in both native and PDF projections. Final native and actual PDF exporters also
reject each of two one-cent deposit changes whose printed dollars remain
unchanged. Existing positive replays still pass full Return1040 XSD and actual
PDF generation: two executed income returns and two prepared Schedule 2
returns. No new visual review or page count is claimed.

An entirely empty Form 8959 slot with retained employment records is checked
against the combined filing trigger and retained Form 1040 filing status.
Below-threshold cases remain valid; 230,000 of reclassified wages may omit the
form for a joint return but not a single return. Tips plus wages that each
fall below the joint threshold still require the form when their sum exceeds
250,000. A missing filing status cannot establish a valid omission. Existing
W-2, substitute, household and railroad deposit checks remain in force.

Private command logs are retained under
`.state/research/form8959-upstream-2026-10-10/`: `tests-omission.log`,
`public-replays-final.log`, `combined-omission.log` and `deposit-rejections.log`.
The seven previously reviewed wage/spouse packets remain 35 qualified pages;
their seven full-XSD regressions pass within the 91-test group. Multi-source
Schedule SE, payment authenticity, wider filing combinations and IRS
acceptance remain open. Deferred Schedule SE rounding33 and presentation76
were not changed; no broad board task is closed by this checkpoint.

## October 10 complete joint employment-source packets

Three additional public-entry cases now execute both spouses' employment
records through Form 4137, Form 8919, Form 8959, Schedule 2, Form 1040, full
Return1040 XSD validation and actual PDF generation. The three typed tests pass
with no ignored cases, adding to the preceding 101 distinct passing tests.
The new owner-document assertions verify exactly one native copy per spouse
for each applicable employment form. Four one-cent deposit mutations reject
in each final exporter (four native and four actual-PDF rejections).

| Complete return | Tip income / Medicare tips | Reclassified wages | Tip / reclassified tax | Additional Medicare | Income tax | Final tax | Paid / owed | Pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Joint tips | 6,000 / 5,985 | 0 | 458 / 0 | 54 | 39,574 | 40,086 | 40,000 / 86 | 8 |
| Joint reclassified | 0 / 0 | 230,000 | 0 / 13,013 | 720 | 57,334 | 71,067 | 40,000 / 31,067 | 8 |
| Joint mixed | 6,000 / 5,985 | 50,000 | 458 / 3,825 | 54 | 39,574 | 43,911 | 40,000 / 3,911 | 10 |

The mixed case verifies that each owner's Form 4137 Social Security tips join
Form 8919's wage-base calculation while full Medicare amounts join Form 8959.
The larger reclassified case reaches the primary owner's Social Security cap
without capping the 200,000 Medicare wage amount. The $15 below-monthly-limit
tip amount remains taxable income but is excluded from Medicare tips.
Independent Decimal calculations using the public inputs and the
[IRS 2025 tax-rate schedule](https://www.irs.gov/irb/2024-45_IRB) agree with
employment taxes, ordinary tax, final tax and amounts owed. Every populated
Form 4137/8919/8959 amount sequence and owner identity was also checked in
extracted PDF text; flattened packets have no surviving widgets or field tree.

All **26 pages** were visually reviewed (25 unique RGB pages across seven
contact sheets, plus a full Form 8919 page). Four owner pages repeat deferred
item17: Form 8919 names and SSNs overlap the identity-row border in joint-mixed
pages7–8 and joint-reclassified pages5–6. Their identities and amounts reconcile,
but this is qualified review, not clean visual approval; no deferred repair.
The three zero-investment-income Form 8960 pages are included in the page
count, not counted as additional filing scenarios.

The Form 8959 wage/employment packet series now has **10 full-XSD returns and
61 reviewed pages**, combining the prior seven/35 with these three/26; existing
zero qualification76 and current owner-placement17 remain. Synthetic SS-8
references are not authenticated filings. RRTA combinations, original
multi-source Schedule SE, wider source coverage and IRS acceptance remain
open; no broad board task is closed.

Reproduce with
`deno test -A forms/f1040/e2e/taxes/employment/form8959/form8959_employment_sources.test.ts`.
The local IRS schema and `xmllint` are required; these tests do not silently
skip. Add `-- --evidence-dir=<directory>` to retain the three source/pending
JSON records, XML returns and generated PDFs. Private artifacts, both passing
logs, independent verification, page inventory, visual findings and hashes are
under `.state/research/form8959-joint-employment-2026-10-10/`.
