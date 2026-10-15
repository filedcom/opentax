# Current TY2026 development PDF bundle

Implemented October 15, 2026 in `forms/f1040/2026/pdf/bundle.ts`.
This replaces no 2025 builder and does not register `f1040:2026` as a filing
product. The historical prototype's `pdf/builder.ts` is not the current API.

## Contract

`buildDraftReturnPdf2026(sourceClaims)` accepts the strict current source
catalog, requires general filer facts, and runs `sourceRegistry2026` once.
Caller-supplied Form 1040 totals are rejected. Executor diagnostics or missing
settlement stop PDF generation. Each selected component recomputes its retained
validated source input and reconciles its destination amounts to that execution.
Information-return withholding also reconciles across investment, Form 8919
and SSA/RRB benefit sources before rendering. Form 1040 prints taxable benefits,
including zero, and the MFS full-year lived-apart indicator.

The result contains PDF `bytes`, the execution `calculation`, one-based
`attachments` with separate `formPages` and `statementPages`, `filingReady: false`,
and sorted `unfinishedReceivers`. Those receiver names identify deposited graph
inputs whose calculators are absent; they are not a completed eligibility review
or an exhaustive list of unsupported sources. Credits and activities still need
full source parity. Every PDF page states `INCOMPLETE 2026 IMPLEMENTATION`.

## Attachment selection and order

| Component | Selection | Official pages before statements |
| --- | --- | --- |
| Form 1040 | Completed settlement | 2 |
| Schedule 1 (01) | Retained `file_schedule1` | 2 |
| Schedule 1-A (1A) | Eligible activity, even after complete phaseout | 3 |
| Schedule 2 (02) | Retained `file_schedule2` | 2 |
| Schedule 3-A (3A) | Settlement emits schedule | 1 |
| Schedule A (07) | Selected itemized method | 2 |
| Schedule B (08) | Source workpaper requires attachment | 1 |
| Form 4137 (24) | Calculated owner forms | All owner/employer continuation copies |
| Form 6251 (32) | Retained filing condition | 2 |
| Form 8919 (61) | Calculated owner forms | All owner/employer continuation copies |
| Form 8959 (71) | Retained filing/withholding condition, including zero tax | 1 |
| Form 8960 (72) | Retained filing condition, including zero NIIT | 1 |
| Form 3903 (170) | At least one eligible move requires a form | All qualifying move pages |

Sequence numbers come from the pinned draft forms. Supplemental statements
follow all official forms, preserving their order within each component.
The [2026 draft Schedule B instructions](https://www.irs.gov/pub/irs-dft/i1040sb--dft.pdf),
General Instructions, explicitly place overflow statements at the end of the
return with filer name and SSN. Ordinary moving and foreign-storage-only cases
retain their distinct Form 3903/Schedule 1 selection rules.

Joint schedules use both names and the primary SSN. Forms 4137/8919 use each
owner's own name and SSN. IRS cover/instruction pages are excluded by the
component builders. The assembled artifact is static, with no page annotations
or catalog AcroForm tree. Form 1040 and its dependent statements also receive a
consistent draft footer when rendered independently.

## Verification and limits

Nine bundle integration tests cover form order, full payer statements, itemized
selection, zero-tax NIIT, withholding-only Medicare, PAB AMT, phased-out senior
activity, joint identity, moving/storage, tips, misclassified wages, and rejected
unregistered totals/invalid sources. All 303 current TY2026 tests passed.
A synthetic 15-page bundle was rendered and visually inspected: eleven official
form pages followed by four complete Schedule B statements. Reopened output has
no annotations or AcroForm fields.

Schedule 3-A remains component-tested; the current public source graph does not
yet supply the credits that would make it appear. Remaining 2025-supported
sources and forms, final form revisions, public catalog/CLI, complete MeF
serialization/validation, and ATS acceptance are still required. The source
scope reviews and existing guards remain in force; assembling a development
PDF does not clear any of those gates.
