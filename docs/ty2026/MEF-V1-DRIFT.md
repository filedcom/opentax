# TY2026 MeF v1 schema drift against the September draft 1040

The user-supplied May 28, 2026 `IMF_05-28-2026_Release-2.zip` is stored under
ignored `.state/research/docs/` and has the hash recorded in
[`SOURCES.md`](SOURCES.md). Its `1040x_Schema_2026v1.0.zip` is useful for
baseline research. It is not a valid target for the current draft 1040. The
[IRS September 24 v4 release memo](https://www.irs.gov/e-file-providers/release-memo-for-tax-year-2026-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-version-4-point-0)
says the current package is distributed through the registered e-Services
mailbox. Keep raw packages and extracted XSD/rules out of this public repo.
The [IRS version table](https://www.irs.gov/tax-professionals/tax-year-2026-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions)
was rechecked on 2026-09-27: 1040 v4.0 became available in SOR on 2026-09-24,
with ATS use beginning 2026-11-01; v3.0 starts ATS on 2026-10-13. The local
research directory still contains only the May v1 package. Obtain the current
SOR package before selecting XML field names or declaring ATS readiness.

Observed in the v1 `IRS1040.xsd` versus the pinned September draft
[`f1040.pdf`](corpus/draft/f1040.pdf):

| 2026 draft 1040 | May v1 XSD observation | Consequence |
| --- | --- | --- |
| 12f charitable deduction; 13a Schedule 1-A; 13b QBI | No 12f line; QBI still labeled 13a and Schedule 1-A labeled 13b | The old element order and line labels cannot define the 2026 serializer. |
| 24a total tax, 24b Form 1062, 24c tax including Form 1062 | One `TotalTaxAmt` labeled line 24; the package has a separate `IRS1062Payment` document | A v1 XML 1040 cannot represent the printed 24a–c topology. |
| 32a refundable credits, 32b Schedule 3-A, 32c net credits | One `RefundableCreditsAmt` labeled line 32; no Schedule 3-A schema in the package | The public-benefit offset and new attachment need the later schema. |
| Taxpayer/spouse citizenship, nationality, or work authorization answers | No corresponding 1040 elements found | Do not guess their XML names or omit the question. |
| 27b clergy, 27c EIC decline, 30 refundable adoption | Present in v1 | These are a baseline only; confirm their names and sequence in the selected release. |

## When the current package arrives

1. Record the ZIP filename, release date, SHA-256, and IRS memo. Extract into
   ignored `.state/research/docs/` and verify its internal 1040 schema/rule
   version.
2. Diff v1 to the selected version by XSD path, element order, type, required
   attribute, attachment reference, and active business-rule ID. Preserve the
   diff summary in this document; do not commit raw XSD or rules.
3. Map every TY2026 pending key in `forms/f1040/2026/nodes/f1040.ts` to an
   element in that selected schema. Resolve Schedule 3-A, Form 1062,
   dependents, and work-authorization groups before writing the 2026 builder.
4. Validate a complete wages-only and source-backed ATS XML return against
   the selected XSD, then extend the same checks to every retained form in
   [`mef-coverage.csv`](mef-coverage.csv). Keep version-specific reject-rule
   evidence beside those fixtures.

Until step 1, MeF XML can be prototyped as unverified code but cannot satisfy
the TY2026 end-to-end release gate. The calculation and draft-PDF work can
continue independently.

## What the public September 24 inventory already establishes

The pinned [accepted-forms workbook](corpus/mef/accepted-forms.xlsx) has a
stale worksheet tab name (`taxyear2025 processingyear2026`), but its rows
include the 2026-only Form 1062, Form 4562-B and Schedule 3-A, and its URL is
the IRS TY2026 accepted-forms resource. Treat its **rows** as the published
September 24 planning inventory; the tab label does not make it a 2025
schema. The companion [forms/attachments workbook](corpus/mef/forms-attachments.xlsx)
is dated September 24, 2026. These are form/attachment availability and
dependency references, **not** a substitute for XSD, business rules, or an
ATS acceptance test.

| Source plan | Accepted-forms workbook, 1040 column | Forms/attachments workbook | Current conclusion |
| --- | --- | --- | --- |
| [Form 3903](FORM3903-EDUCATOR-GRAPH.md) | `Form 3903`, maximum **2** (row 56) | `IRS3903` under Schedule 1 line 14 (row 383) | A structured form is listed for 1040, but its two-form count needs reconciliation with the IRS instruction to use a separate form for each qualifying move. Check actual XSD repeat cardinality and rejection rule. |
| [Form 172](FORM172-NOL-GRAPH.md) | `Form 172`, **unbounded** (row 43) | `IRS172` at form level (row 812); separate line-8a NOL statement (row 397) | A structured form and statement are listed, but the selected XSD must establish their document rules and per-origin-year repeat shape. |
| [Form 8938](FORM8938-GRAPH.md) | `Form 8938`, maximum **1** (row 199) | `IRS8938` at form level (row 293) | A structured attachment is listed. The one-form count does not describe how repeated Part V/VI asset records or supplemental page-2 data are represented. |
| [Form 4852](FORM4852-GRAPH.md) | No `Form 4852` row found | No `4852` entry found | Do not assume `IRS4852`, a binary attachment, or paper-only filing. Obtain the active 1040 XSD/rules and IRS filing guidance to decide the supported submission path. |
| [RRB source statements](RRB-1099-GRAPH.md) | `Form RRB1042S`, a nonresident-recipient statement, appears even in the 1040 column (row 228); no U.S. `RRB-1099`/`RRB-1099-R` row found | `IRSRRB1042S` appears; no U.S. statement entry found | Calculate U.S. source statements into the 1040 lines; verify whether the selected release requires a source document or only reconciled return amounts. Do not use the nonresident statement schema for U.S. statements. |

For every additional form in the [parity queue](PARITY-QUEUE.md), perform the
same accepted-count, dependency, XSD and business-rule reconciliation before
claiming MeF coverage. A zero/blank workbook cell or missing row is a
research finding, not a complete filing prohibition by itself.
The [public serializer crosswalk](MEF-PUBLIC-CROSSWALK.md) records the
published rows and attachment-name occurrences for every TY2025 MeF module.
