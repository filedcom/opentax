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
including zero, the selected lump-sum election, and the MFS full-year lived-apart
indicator. Historical benefit worksheets remain in calculation records.

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
| Schedule 3 (03) | Positive finalized credits/payments | 1 |
| Schedule 3-A (3A) | Settlement emits schedule | 1 |
| Schedule A (07) | Selected itemized method | 2 |
| Schedule B (08) | Source workpaper requires attachment | 1 |
| Schedule C (09) | Reviewed business source claim | Two pages per activity |
| Schedule D (12) | Source dispositions or usable prior loss carryovers | 2 |
| Form 8949 (12A) | Sales requiring detail | One category per page, eleven rows each |
| Schedule SE (17) | Regular SE owner requires form | One page per owner |
| Form 4137 (24) | Calculated owner forms | All owner/employer continuation copies |
| Form 6251 (32) | Retained filing condition | 2 |
| Form 8615 (33) | Reviewed child-tax eligibility, including line 3/5 stops | 1 |
| Schedule EIC (43) | Positive supported child-based EIC | 1 |
| Schedule 8812 (47) | Positive source-derived CTC/ODC or ACTC | 2 |
| Form 8863 (50) | Positive supported AOTC or LLC | Totals plus student/school pages |
| Form 8995 (55) | Reviewed business QBI calculation | One page plus business continuation |
| Form 8919 (61) | Calculated owner forms | All owner/employer continuation copies |
| Form 461 (64) | Reviewed business-loss filing trigger, including zero addback | 1 |
| Form 8959 (71) | Retained filing/withholding condition, including zero tax | 1 |
| Form 8960 (72) | Retained filing condition, including zero NIIT | 1 |
| Form 5695 (75) | Reviewed positive prior carryforward, including zero current credit | 1 |
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

Business attachments replay the complete business and deduction sources and
match Schedule 1 lines 3/15, Schedule 2 line 4 and Form 1040 deduction destinations.
Schedule C/SE use each proprietor's identity. Part V preserves source cents in
statements; Form 8995 continues after five businesses without duplicating totals.
See [current business coverage](../graphs/BUSINESS-CURRENT.md).

## Verification and limits

Nine bundle integration tests cover form order, full payer statements, itemized
selection, zero-tax NIIT, withholding-only Medicare, PAB AMT, phased-out senior
activity, joint identity, moving/storage, tips, misclassified wages, and rejected
unregistered totals/invalid sources. All 303 current TY2026 tests passed.
A synthetic 15-page bundle was rendered and visually inspected: eleven official
form pages followed by four complete Schedule B statements. Reopened output has
no annotations or AcroForm fields.

Schedule 3 now replays original W-2 sources before attaching excess Social
Security credit and routes it into ACTC. Its component supports complete 6z/13z
continuations; broader source owners remain unregistered. Schedule 3-A now also
has connected EIC/ACTC bundle coverage. Schedule EIC
reconciles the credit, AGI and elected combat pay and excludes its cover/instructions.
Schedule 8812 prints the supported ordinary W-2 payroll method. Nine additional
synthetic credit QA pages were rendered and inspected with no fields or annotations. Remaining 2025-supported
sources and forms, final form revisions, public catalog/CLI, complete MeF
serialization/validation, and ATS acceptance are still required. The source
scope reviews and existing guards remain in force; assembling a development
PDF does not clear any of those gates.

## Dependent care update

Form 2441 now occupies sequence 21 after Schedule B and before Form 4137.
Its ordinary-W-2/child-care source route reconciles benefits, AGI and credit;
Schedule 3 line 2 also reduces Schedule 8812's tax limit. Credit-only cases use
one printed page, benefits use two, and provider/person continuations follow
all forms. See [current scope](../graphs/FORM2441-CURRENT.md) for source gates.

## Education update

Form 8863 now occupies sequence 50. Its source-ledger calculation follows
Form 2441 and precedes Schedule 8812 credit limits. The builder replays retained
sources and reconciles both credit destinations before generating student and
school pages. See [the current mapping](PDF-FORM8863-MAP.md). This adds draft
coverage; it does not clear the source, final-authority or filing gates above.

## Capital sales update

Capital sales now occupy attachment 12/12A before Form 2441. The current
source route reconciles ordinary securities/digital assets, distributions and
losses through AGI, regular tax, AMT and NIIT. Direct sales appear only on
Schedule D; remaining transactions retain their twelve categories and page
totals on Form 8949. Information-return withholding includes the capital source
once. See [the current source and output contract](../graphs/CAPITAL-CURRENT.md).

Form 8615 now replays child and cross-return family sources before printing the
selected parent, complete lines/worksheet indicators, and the sibling allocation
ratio. Its seven bundle cases include both required stop forms, preferential
tax, AMT and a ratio rounded to one. See
[the current child-tax contract](../graphs/FORM8615-CURRENT.md).

## Household employment

The bundle now includes Schedule H at sequence 44 when its payroll calculation
requires filing. It replays the employer source, matches the return owner and
reconciles tax to Schedule 2 line 17a. Both official pages are retained, including
blank skipped sections. See [the household contract](../graphs/SCHEDULEH-CURRENT.md)
for the four draft cases and remaining Section B/payroll/MeF limits.

Energy carryforward now resolves jointly with the child credit before final
Schedule 3. The bundle consumes `schedule3_final`, replays the retained energy
sources, and attaches the one-page Form 5695 even when all credit carries to
2027. See [the energy contract](../graphs/FORM5695-CREDIT-GRAPH.md).


Reviewed Schedule C loss returns now attach Form 461 after Form 8995/8919 and
before Form 8959. Schedule 1 line 8p, AGI and Form 8995 allowed losses are replayed
from the retained loss workpaper. A separate qualified suspended-loss origin is
kept in the calculation; it is not a second current QBI loss.

The shared Form 8995 renderer now serves both the existing Schedule C path and
the combined C/land source graph. The combined component replays
deduction selection, checks the receiving 1040 amounts, and includes business
continuations with retained TINs. Reviewed direct land sales now attach Form 4797
at sequence 27 and a single combined Form 8995 at 55, including land-only returns.
Capital, Schedule 1, NIIT and Form 461 destinations reconcile to the same finalized
sources; see [the current land contract](../graphs/FARMLAND-CURRENT.md).
