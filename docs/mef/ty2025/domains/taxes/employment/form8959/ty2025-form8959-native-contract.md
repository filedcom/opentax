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
corresponding graph deposits before printing. The remaining original-record
joins are not yet independently re-derived here: Form 4137's
source/allocated-tip calculation, Form 8919's reason-code and wage-base
calculation, and Schedule SE's multi-source line 6. Their finalized graph
deposits are checked against the printed lines, but that does not independently
prove those upstream calculations. These are explicit verification gaps, not
approved exclusions. Focused rejection cases for changed deposits and changed
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

No actual filled PDFs or new visual pages are counted here. The PDF descriptor
projection check does not prove printed output, identity or page placement.
The 50-test group covers CT-2, substitute and household deposits, but those are
not seven additional full-return XSD cases. Source payment authenticity,
original Form 4137/8919 and multi-source Schedule SE derivation, business rules
and IRS acceptance remain open. No production calculation changed.
