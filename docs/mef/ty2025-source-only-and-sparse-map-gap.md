# TY2025 source-only documents and sparse-map triage

Status: route-by-route audit, 2026-09-29. The table records focused evidence
where available; it is not a current-source full-batch or ATS result. These
paths remain in the Form 1040 scope.

## Current registry and trigger reconciliation (2026-10-02)

| Audited group | Bounded native + PDF registrations | Staged, unregistered and blocked | Rows with open source/scope decisions | Whole-form verified by this audit |
| --- | ---: | ---: | ---: | ---: |
| Four originally source-only public paths | 3: Schedule R, Forms 7203 and 8888 | 1: Form 9465 | 4 | 0 |
| Six sparse or source-derived maps | 6: Forms 8880, 6198, 7217, 6252, 8862 and 8863 | 0 | 6 | 0 |
| Total rows in this audit | **9** | **1** | **10** | **0** |

These counts follow the public input entries in `forms/f1040/2025/inputs.ts`
and both `ALL_MEF_FORMS` and `ALL_PDF_FORMS`. They count coded bounded routes,
not validated complete forms. Form 9465's native/PDF projections exist only
outside the registries; its public `f9465` trigger remains blocked in both
exports. The other nine have registered serializers, but each row below names
source, return-join, or wider-trigger decisions that remain open. No missing
registration can safely be activated from this audit alone.

The actionable mismatches are source and ownership rather than descriptor
count: Form 8880 now has a finalized-return capacity join, while its
contribution, distribution, age, student, and dependency source evidence
remains open. Form 6198's aggregate public payload cannot represent the per-activity C/F
filing path; Form 7217 needs issuer K-1 and basis history; Form 8862 needs
authenticated disallowance/ban evidence and overflow statements; and Form
9465 needs filing authorization and signature handling. The current guards
reject those unsupported positive branches instead of implying that an empty
`FIELD_MAP` or a staged builder is a filed document. Final source-to-return,
XSD, filled-PDF, IRS-rule and ATS decisions remain open for all ten rows.

## 2026-10-01 implementation reconciliation (unrun)

The Form 7203 source path now combines one reviewed cash capital contribution
with a separate newly funded formal shareholder note, allocating one K-1 box-1
loss to stock basis before debt basis and replaying Schedule E, Form 1040,
native MeF, and PDF. The route still needs authenticated source bytes and wider
basis, repayment, and carryover cases.

Form 7217's bounded multi-property liquidating distribution now checks each
property's section 732(c) basis increase against a named allocation workpaper
and property class rather than checking only the Part II total. Other property
classes, basis decreases, and accepted source bytes remain open. A 2025 Form
6252 final-payment path now also requires a reviewed 2024 Form 6252 line record
and reconciles the prior sale and recognized-gain figures; acceptance and
current payment principal/interest evidence remain open.

The staged attached Form 9465 request now requires a sourced ten-digit home
phone and call-time entry, projected to its native and PDF fields. Its
electronic authorization and linked filing review remain unresolved, so both
positive exporters still reject. These new source/native/PDF fixtures are
authored for the agreed later bulk pass and have not changed the earlier local
XSD, filled-PDF, or ATS evidence reported below.

## Four public paths originally flagged as source-only

| Path       | Source and tax effect                                                                                                                                          | Remaining source or attachment gap                                                 | Current export boundary                                                                                                                                                                                                                                                                  | Work still required                                                                                                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schedule R | Public `schedule_r` facts can calculate `schedule3.line6d_elderly_disabled_credit`, flowing to Form 1040 line 20. | Authenticated age, dependent/support and benefit evidence, broader cross-form combinations, current-source full batch and ATS. | An earlier sourced single-filer age-65 case passed local TY2025 v5.4 XSD and filled two-page PDF review; a dependent/interest case passed full-return XSD and six-page filled-PDF review. The age-only status and disability routes now pass 16 focused native/PDF tests, including three local XSD cases. See the [age-only route](ty2025-schedule-r-age-only.md); historical artifact: `.state/research/ty2025-schedule-r-filled-review.pdf`. | Verify actual dependent/support and income source records, complete source-authenticated full-return packets for each status, then run the current-source full batch and obtain ATS acceptance before claiming broad filing support. |
| Form 7203  | An identified K-1 current box-1 loss requires one strict per-corporation `form7203_stock_loss_ledger`, including material-participation workpaper evidence; the loose numeric basis field is not a loss-source alternative. | Other basis/loss paths, authenticated source bytes, current-source full batch, business rules, and ATS. | Registered bounded `IRS7203` and Schedule E Part II MeF/PDF descriptors reconcile Form 7203, Schedule E line 41, Schedule 1 line 5/10, and Form 1040 line 8. Other shapes still reject. The bounded XML passes local TY2025 v5.4 XSD and ten focused native/PDF cases pass. A synthetic reviewed K-1 and general taxpayer source yielded a full-return XSD-valid XML and seven-page PDF packet; the $3,000 allowed loss appears on Form 7203, Schedule E, Schedule 1 and Form 1040. Retain `.state/research/ty2025-form7203-full-return.xml` and `.state/research/ty2025-form7203-full-return.pdf`. | Complete other loss categories, multiple K-1s, prior carryovers, distributions, dispositions, and debt; verify authenticated sources and other business-rule combinations, then current-source full batch and ATS acceptance. |
| Form 8888  | Public `f8888` requires two or three complete, distinct accounts; obsolete savings-bond fields reject. It has no tax outputs. | Current-source full batch, other business-rule combinations, ATS, and bank/source verification. | Native `IRS8888` MeF and canonical Dec 2025 PDF descriptors reconcile exact Form 1040 line 35a allocation, account-owner names, no simultaneous Form 1040 single-account instruction, and no injured-spouse split. A spouse-only deposit account now passes ownership only for a joint return; Single and MFS returns reject even if spouse identity is present. Focused native/PDF tests cover both sides, including a joint positive. Two- and three-account native cases pass local TY2025 v5.4 XSD. A synthetic W-2 and general taxpayer source produced a full-return XSD-valid XML and three-page PDF packet. Form 1040 line 35a and Form 8888 line 5 each print $1,525; account lines print $300 and $1,225. Visual review caught and repaired the omitted Form 1040 line 35a attachment checkbox. Retain `.state/research/ty2025-form8888-full-return.xml` and `.state/research/ty2025-form8888-full-return.pdf`. | Verify bank/source evidence and other business-rule combinations, run the current-source full batch, then obtain ATS acceptance before claiming filing support. |
| Form 9465  | Public `f9465` now requires a reviewed, bounded attached-1040 balance and manual-payment source; it has no tax outputs. | Registered native/PDF descriptors and resolved signature handling. | A nonempty request still rejects at both exports. Native XML and canonical page-1 PDF projections are staged, unregistered, and unrun. | Resolve attached authorization/signature treatment, inspect a filled PDF, validate linked native/PDF/1040 amounts, then consider registration and guard change; see the [filing boundary](ty2025-form9465-filing-boundary.md). |

The single age-65 descriptor case is not yet a positive filing route. In the
real TY2025 graph, a $10,000 W-2 source gives $10,000 AGI, a $17,750 age-65
standard deduction, $0 Form 1040 line 18 tax, and a tentative $562.50
Schedule R credit. Form 1040 finalization now rejects that credit under the
[IRS Schedule R line 21 worksheet](https://www.irs.gov/instructions/i1040sr),
and the source-only export test confirms that no completed return or MeF
packet is produced. For an ordinary single age-65 filer taking the standard
deduction, the [IRS 2025 income limit](https://www.irs.gov/instructions/i1040sr)
ends the tentative credit at $17,500 AGI, below the
[IRS $17,750 age-65 deduction](https://www.irs.gov/publications/p501).
The later synthetic case uses a taxpayer who can be claimed as a dependent,
$9,500 of synthetic Form 1099-INT interest, and the $3,350 dependent age-65 standard deduction.
Its full return XML passes local TY2025 v5.4 `Return1040.xsd`; the six-page
packet prints Form 1040 line 18 $618, Schedule R/Schedule 3 $600, and line 22
$18. Form 1040 page 2 prints both the dependent and age-65 boxes after the
AcroForm mapping repair. Retain `.state/research/ty2025-schedule-r-dependent-positive.xml`
and `.state/research/ty2025-schedule-r-dependent-positive.pdf`. This proves
the bounded graph and PDF path structurally, while actual support/dependency
facts, payer-issued records, and IRS business-rule acceptance remain open.
General input now rejects malformed or future DOBs and explicit age-65 answers
that conflict with a supplied DOB. The bounded Schedule R path also requires
its age-65 claim to match the finalized Form 1040 indicator; a contradictory
synthetic return fails both graph finalization and native export. These checks
reconcile entered facts; they do not authenticate the age or dependency source.

The `start` node deposits supplied singleton inputs into executor pending slots.
The executor does not remove the slot when an input node emits no tax outputs,
and `buildPending` preserves it as serializer context. This is why Forms 8888
and 9465 can be identified at export. The remaining unsupported-path guards **throw** before XML or
PDF is built; they do not skip or fabricate a form. Schedule R has a narrow native and PDF route with focused and synthetic
full-return XSD and filled-PDF evidence. Actual dependent eligibility and source
records remain unverified. This is an incomplete-support boundary, not a
broad filing-coverage claim. Source-to-pending rejection cases are written in
`forms/f1040/e2e/source_only_export.test.ts`.

## Six registered descriptors with sparse or source-derived maps

The Form 7217 Part II gate also requires an explicit property treatment for each
row: section 732 property or a section 731(c) marketable security treated as
money with an explicit zero section 731(c) reduction. Securities rows must
reconcile their FMV to line 5b and must accompany another section 732 property;
a money-and-securities-only distribution is not a Form 7217 filing. Nonzero
reductions remain unsupported. This keeps the ATS sample's `CASH` row from
becoming filing-positive merely by changing its basis total, without excluding
valid securities reported in Part II.

`FIELD_MAP` size alone is not a completeness measure. Several serializers build
structured native XML from source calculators even when `FIELD_MAP` is empty.
This is a static source-to-document crosswalk, not a filing-support claim. The
official attachment rules are linked below; local cases are written evidence
only until the deferred full batch runs.

| Form and attachment trigger                                                                                                                                                                      | Local source/calculation and MeF evidence                                                                                                                                                                                                                                                                                                                                         | PDF and case evidence                                                                                                                                                                                                                                                                                  | Open disposition                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [8880](https://www.irs.gov/pub/irs-pdf/f8880.pdf): attach for a positive retirement-savings contributions credit reported on Schedule 3 line 4.                                                  | `form8880` calculates from IRA, elective-deferral, distribution, AGI and status inputs. Its positive Schedule 3 output now requires a sourced tax-liability limit, and the MeF descriptor consumes the same self-emitted `print_line*` values that the PDF uses. The old manual-key MeF shape is rejected.                                                                        | `pdf/forms/f8880.ts` maps those print lines. Calculator and MeF descriptor cases include missing-cap and node-to-builder rejection/attachment cases; 66 focused Form 8880/PDF-builder tests pass. One source-backed four-page packet passed visual review, source replay, local XSD, and artifact checks after the instructions page was removed.                                                                                                                                | The finalized-return tax-capacity worksheet is implemented; independent contribution, age/dependent/student, and distribution source reconciliation remain open. See [Form 8880 gap](ty2025-form8880-gap.md).                                    |
| [6198](https://www.irs.gov/instructions/i6198): attach an at-risk computation for each activity with a loss subject to the limit, including applicable Schedule C/E/F and pass-through activity. | `mef/forms/f6198.ts` builds a simplified native document from `pending.schedule_c` and `pending.schedule_f`; a nonempty aggregate `form6198` payload rejects. The older `form6198` node calculates aggregate limits but is not the native MeF source. MeF cases cover C/F and aggregate rejection.                                                                                | `pdf/forms/f6198.ts` now projects those C/F sources into separate PDF copies with the 2025 line 1, 5, 6–10b, 20, and 21 fields. A two-activity Schedule C packet passed 16-page visual/source/XML review and local XSD; other activity and source branches remain unverified.                                                                                                  | [Form 6198 PDF gap](ty2025-form6198-pdf-gap.md): Form 4835, Schedule E, partnership/S-corporation, detailed basis, carryforwards, downstream loss reconciliation, and validation remain open. This is still `GAP-MAP`, not an exclusion. |
| [7217](https://www.irs.gov/instructions/i7217): attach a form for each date a partner receives property in a distribution, subject to the instructions.                                          | Public `f7217` source records partner/partnership identity, date, basis and property detail. Node, MeF, and PDF source/projection suites pass 25/25, including real 2025 dates, one aggregate record per partnership/date, section 732(c) basis allocations, section 731 gain/Form 8949 routing, security FMV reconciliation, and rejection of unsupported shapes. One partial ATS Scenario 12 slice passes TY2025 v5.4 XSD. | `pdf/forms/f7217.ts` maps the canonical December 2024 revision for TY2025, with source-gated per-date instances and at most 30 Part II rows. Mapping/rejection tests pass; a bounded four-page nonliquidating packet was visually reviewed. Other property/gain variants and filled appearance remain unverified. | Cross-check authenticated partnership K-1 identity and basis history, cover section 751(b), implement continuation rows, add a full-return XSD case for the recognized-gain route, and validate broader rules/ATS. |
| [6252](https://www.irs.gov/pub/irs-prior/f6252--2025.pdf): file for reportable installment-sale income, including applicable subsequent-year payments.                                           | `form6252` derives gain/payment lines from sale inputs. `mef/forms/f6252.ts` builds detailed XML and validates Schedule D/Form 4797 destinations, while rejecting several unsourced depreciation, recapture and related-party paths. Calculator and MeF cases cover bounded routes.                                                                                               | `pdf/forms/f6252.ts` maps filer identity, property/dates, yes/no boxes and all Part I/II lines 5–26 from the same validated source and calculator. Canonical 2025 AcroForm field positions were inspected. Focused mapping/negative cases and two full-return XSD/PDF packets pass; the five- and nine-page packets were visually inspected. See the [filled review](ty2025-form6252-filled-review.md). | Audit later-year payments, recapture, interest, related-party and wider business-property routes; verify source records, business rules and ATS.                                                                                          |
| [8862](https://www.irs.gov/instructions/i8862): conditionally attach after a prior EITC, CTC/ODC or AOTC disallowance when claiming the affected credit again.                                   | Public `f8862` input flags route to EITC, Form 8812 and Form 8863 paths. `mef/forms/f8862.ts` builds nested claimant detail and rejects incomplete assertions; descriptor and XSD cases exist.                                                                                                                                                                                    | `pdf/forms/f8862.ts` now maps all three December 2025 pages, reconciling active claims to finalized credit lines and AOTC student names. It rejects overflow rows needing an additional statement. Focused source/graph, rejection, native, PDF and XSD-gate tests passed 40/40 on 2026-10-05; see the detailed boundary below. These tests do not produce a positive CTC/ODC/AOTC Form 8862 export because executor-owned authentication of prior IRS notice issuance and contents is absent.                     | Source and reconcile prior IRS disallowance/ban facts and affected credit claim, support overflow statements, and verify any paper-only condition before claiming support.                                                               |
| [8863](https://www.irs.gov/instructions/i8863): attach when claiming AOTC or lifetime-learning credit.                                                                                           | Public `f8863` inputs provide student/expense facts and calculate credit subject to local limits. `mef/forms/f8863.ts` builds nested student XML; calculator and XSD cases exist.                                                                                                                                                                                                 | The canonical 2025 PDF descriptor maps one summary and one Part III page per student. A five-page source-backed LLC/scholarship packet passed visual review, source/XML replay, local XSD, and artifact checks; other variants remain open.                                                                                                                                        | Verify 1098-T or an allowed exception, student and expense substantiation, prior AOTC/disallowance facts, final credit limits, and filled-PDF parity.                                                                                    |

### Exact currently mapped filing surface

| Form | Source and lines actually serialized                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Missing lines or source conditions; export disposition                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8880 | `form8880` emits print lines 1a–6b and 7–12; both MeF and PDF consume those values. The PDF also maps filer name and SSN. The 2025 line 11 limit is derived from finalized Form 1040 line 18 less Schedule 3 lines 1–3, 6d, and 6l; both exporters replay the source calculation and limit. | IRA/deferral/distribution source and age, student, and dependent eligibility remain unverified. A raw manually asserted tax capacity or missing finalized line 18 cannot establish a positive credit. Broader source and filled-PDF branches, IRS rules, and ATS evidence remain open. |
| 6198 | Negative Schedule C line 32b or Schedule F line 36b activity with simplified at-risk facts produces one native/PDF form per activity. MeF has activity description, ordinary/current loss, adjusted basis, increases, decreases, amount at risk, and deductible loss. PDF prints lines 1, 5, 6–10b, 20, and 21.                                                                                                                                                                        | Form 4835, Schedule E, partnership and S-corporation activities; detailed Part II/III basis, carryforwards, and downstream loss reconciliation are absent. Aggregate `form6198` source is rejected; only the C/F simplified route is supported. Two bounded Schedule C Form 6198 copies passed filled-page review; other activity and field combinations still need verification.                                                                                                                                                                                                  |
| 7217 | `f7217.form7217s` supplies partnership name/EIN, distribution date, outside basis, cash/securities, property rows, and section 732 basis. MeF derives Part I lines 3–10 and Part II property totals and emits one IRS7217 per distinct partnership/date; duplicate dates within a partnership and incomplete or unequal Part II basis now reject. The PDF maps the same validated source to the December 2024 IRS form, including identity, Part I, 30 Part II rows and line B totals. | The [IRS per-date rule](https://www.irs.gov/instructions/i7217) requires aggregate date reporting. The published ATS Scenario 12 Part II row totals 4,000 against its line 10 of 6,000; the exact sample is retained as a rejection case. Section 751(b) needs an attached gain/loss statement; section 737/outside-basis adjustments and K-1 reconciliation are not established. A 31st property row blocks PDF export until continuation support exists. One four-page nonliquidating packet passed visual/source/XML review on 2026-10-04; other branches remain unreviewed. |
| 6252 | `form6252.f6252s` sale facts drive MeF property/date and lines 5–26, including basis, gross-profit ratio, prior/current payments, and installment income; capital/business destination checks are present. The PDF descriptor now uses the same filing validator and all 22 computed lines, renders line 19 as a five-decimal ratio, and maps one page per sale with verified identity/date/box fields.                                                                                | MeF/PDF reject unsourced recapture/depreciated-property, related-party and short-term business routes and require prior-year payment history for a later-year sale. Two focused full-return cases pass local TY2025 v5.4 XSD, and five- and nine-page filled packets were visually checked. The three-sale packet exposed and corrected Form 4797 line 4/7 PDF placement. Additional source and downstream audit remains open; see the [filled review](ty2025-form6252-filled-review.md).                                                                                                                             |
| 8862 | `f8862` source flags EITC, CTC/ODC or AOTC re-claiming. MeF serializes claim indicators and nested Part II qualifying-child/no-child, Part III dependent, and Part IV student details after required eligibility answers. The PDF maps the same source to all three December 2025 pages for at most four CTC children, four ODC dependents, and three AOTC students.                                                                                                                   | Prior IRS notice references and ban status are reviewed but issuer bytes are not authenticated. Standalone one-ODC and one-student AOTC source/return/native/PDF replay fixtures are authored but unrun; larger Part III/IV claims require an additional statement and reject PDF export. The bounded CTC filled PDF was inspected earlier, while the new ODC/AOTC filled output remains unverified. See the [IRS filing conditions](https://www.irs.gov/instructions/i8862).                                                                                                                                                             |
| 8863 | `f8863.f8863s` provides student eligibility, expenses, institution filing detail and credit-limit worksheet. MeF serializes Parts I–II lines 1–19 and Part III student/institution rows, including AOTC lines 27–30, when a refundable or nonrefundable credit survives. The PDF projects the summary and one Part III page per student in a bounded source-reconciled route.                                                                                                          | Receipt of Form 1098-T or an allowed exception, prior AOTC years/disallowance, student expenses and finalized-return tax capacity need external verification. Foreign institutions, more than two institutions per student, and ambiguous prior-year 1098-T facts reject PDF export; one sourced AOC and one LLC/scholarship full return passed local XSD and filled-PDF review; other variants remain unverified. See the [IRS filing conditions](https://www.irs.gov/instructions/i8863).                                                                                                   |

Form 8862 now reaches a bounded PDF descriptor. Active claims without the
required source, finalized credit, or on-form row capacity stop there rather
than silently omitting a filing. Form 8863 also has a bounded descriptor.
The one-child CTC reinstatement fixture passed a current full-return local
TY2025 v5.4 XSD check on 2026-10-01. Its seven-page packet was rendered and
inspected: Form 1040 identifies the same child and reports $2,200 on line 19;
Schedule 8812 line 14 reports $2,200; Form 8862 names the child, checks CTC,
and answers its four Part III eligibility questions yes. The retained PDF is
`.state/research/ty2025-filled-pdf-review/2026-10-01-form8862-ctc-reinstatement/filled-return.pdf`
(SHA-256 `6d0a15c1249ae2ea5095d129eb2185e951cb55742b4cf9036bfde48ced4c321c`).
This does not authenticate the prior IRS disallowance notice or establish
EITC and wider CTC/ODC/AOTC variants, overflow statements, business rules, or
ATS. On 2026-10-05, the focused standalone ODC, standalone AOTC, combined
ODC/AOTC, CTC, Form 8862 native, PDF, attachment, and XSD-gate tests passed
(40 passed, 0 failed). The synthetic source/graph cases execute Form 8812 or
Form 8863, Schedule 3 when applicable, and finalized Form 1040 calculations;
they verify dependent/student identity joins and reject tampered notice
references or exact credit amounts at export. They do not demonstrate a
successful ODC/AOTC Form 8862 native/XML or filled-PDF replay: both exporters
require executor-owned authentication of prior IRS notice issuance and
contents, which synthetic review fields and notice references do not provide.
Do not infer notice facts or bypass this guard. The earlier CTC filled-PDF
artifact predates this authentication boundary and is not evidence for the
current positive CTC/ODC/AOTC export path. Actual source verification,
executor support for that evidence, and a positive native/PDF replay remain
open; larger Part III/IV claims also need a supported additional statement
route.
The public Form 8863 student array can now be paired with one
`f8863_credit_limit_worksheet` object. This supplies the tax-capacity figures
that its calculator and native/PDF exporters already required, without changing
the student source shape. A sourced $4,000 AOC fixture produces $1,000 on Form
1040 line 29 and $1,500 on Schedule 3 line 3/1040 line 20. Its five-page packet
and native return passed a local TY2025 v5.4 XSD check on 2026-10-01. Filled
Form 1040 page 2, Schedule 3, and both Form 8863 pages were rendered and
inspected. The retained PDF is
`.state/research/ty2025-filled-pdf-review/2026-10-01-form8863-aoc/filled-return.pdf`
(SHA-256 `42abaf9d9d2919ddcd121debc00b9ce0f87cefaa703c0c6f031dbe543e09a2c9`).
Issued 1098-T and payment bytes, prior AOC years, other students and LLC
combinations, business rules, and ATS remain open.

The [IRS Form 8862 instructions](https://www.irs.gov/instructions/i8862) also
say a return claiming a credit during a 2- or 10-year disallowance ban to appeal
that ban must be mailed; the IRS rejects e-file for that situation. Form 8862
now carries an explicit active-ban status. A credit claim with unknown status
blocks both exports, while a claim during an active ban blocks MeF and can
continue to the paper PDF route. The status still needs independent IRS-notice
source verification, and the filled PDF remains unreviewed.

This crosswalk cannot close `INV-01` or `GAP-MAP`. Every registered form still
needs source, calculation, XML, attachment, PDF, negative-case, business-rule
and ATS dispositions. No unsupported path is excluded by this inventory. The
separate 211-root XSD census identifies unregistered schema roots; it is not a
support matrix.

The Form 1099-MISC box 10 source route now requires a reviewed allocation of
gross proceeds between attorney fees retained and client funds, with a source
reference and named cash-basis Schedule C business. Only retained fees can be included in
that business's reported gross receipts; a missing business, understated
receipts, or wrong proprietor TIN stops calculation or export. The synthetic
$15,000 gross/$5,000 fee case reaches $5,000 of Form 1040 additional income
and a native Schedule C with $5,000 of gross receipts; a filled PDF packet also
builds. This corrects the old
automatic Schedule 1 line 8z gross-income treatment. It does not prove the
allocation from payer-issued bytes or a trust ledger, detect duplicate fees
reported on another information return, or validate every business-rule/PDF
case. The [2025 information-return instructions](https://www.irs.gov/pub/irs-prior/i1099mec--2025.pdf)
identify box 10 as gross proceeds paid to an attorney, distinct from fees for
the attorney's services.

Other Schedule C-directed Form 1099-MISC receipts now carry one typed source
row per positive box 1, 2, 5, 6, or 11 amount, linked to a named cash-basis
business. The graph and both export paths require that business's reported
line 1 gross receipts to include the sum of its sourced rows and match the
recipient to its proprietor. The old top-level receipt number is rejected
instead of being silently ignored. A two-payer $3,000/$2,000 box 6 case
reaches one $5,000 Schedule C and Form 1040 line 8, with native XML that
passes local TY2025 v5.4 XSD and a filled PDF packet that builds. Actual payer records, receipt timing,
duplicate reporting across Forms 1099, visual review, business rules, and
ATS remain open.

Form 1099-NEC box 1 now requires an explicit income route. A Schedule C route
also requires the payer identity, recipient TIN, and a reference to one
reviewed cash-basis business. Payer rows are included in the same line 1 and
proprietor checks as Form 1099-MISC receipts; no business is generated from
the payer name or a placeholder business code. Two $3,000/$2,000 payer rows
reach one $5,000 Schedule C and Form 1040 line 8, and the native return passes
local TY2025 v5.4 XSD while the filled PDF packet builds. The
[2025 recipient form](https://www.irs.gov/pub/irs-prior/f1099nec--2025.pdf)
distinguishes self-employment income from other income, and the
[2025 Schedule C instructions](https://www.irs.gov/pub/irs-prior/i1040sc--2025.pdf)
say to include applicable box 1 amounts on line 1. Payer-issued bytes,
duplicate 1099 reports, accrual timing, visual PDF review, business rules,
and ATS remain open.

For a classified nonbusiness activity, Form 1099-NEC box 1 now supplies
payer, recipient, amount, and reviewed activity-description rows to Schedule 1
line 8j rather than a generic line 8z scalar. Its amount combines once with
Form 1099-K hobby income when present and reaches AGI and Form 1040 line 8.
The two-payer $5,000 case validates against local TY2025 v5.4 XSD and builds
a filled PDF. The 2025 [Schedule C instructions](https://www.irs.gov/pub/irs-prior/i1040sc--2025.pdf)
put not-for-profit activity on line 8j, while the
[2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
require type-and-amount detail for line 8z. Actual profit motive, payer
bytes, duplicate reporting, filled-page review, business rules, and ATS
remain open.

Form 1099-MISC box 3 trade or business income can now be classified to a
named Schedule C business or Schedule F farm, as the
[2025 recipient instructions](https://www.irs.gov/pub/irs-prior/f1099msc--2025.pdf)
direct. Schedule C uses a payer/recipient receipt row checked against cash
line 1 and the proprietor; Schedule F uses a payer/recipient farm source
checked against cash line 8 or accrual line 43. A combined $3,000 business and
$2,000 farm case reaches $5,000 of Form 1040 line 8, validates against local
TY2025 v5.4 XSD, and builds a filled PDF. For this box 3 route and the
Form 1099-NEC farm route, Schedule F now records a taxpayer/spouse proprietor;
the graph requires that owner and final native/PDF export matches the source
recipient TIN to that owner. Payer bytes, tax-character evidence, other farm
source ownership, accrual timing, duplicate source reports, full packet review,
business rules, and ATS remain open. The Schedule F PDF now expands one copy
per farm, prints the named proprietor and verified Part I/III income fields,
and prints Part II expenses and net profit. A spouse-owned cash farm's filled
page and an accrual farm's Part III page were visually checked against their
sources. The accrual page prints lines 37, 43–50 and reconciles its $10,700
gross income to Part I line 9. Linked Form 5884 line 2 wage
reductions now reconcile to the named farm before the PDF prints labor,
expenses, and net profit. When more than six line 32 expenses are present,
the PDF prints five directly, carries the remaining total on line 32f as
"SEE ATTACHED," and appends a proprietor-identified statement of each amount.
An eight-expense filled packet was inspected against line 33 and line 34;
the 85-expense pagination case passes. Other Schedule F PDF scenarios need
separate review.

Positive Form 1099-G box 7 farm payments and box 9 CCC market gain now require
an identified payer, recipient, issued-copy reference, and named farm. A
reviewed box 7 classification distinguishes agricultural program payments on
Schedule F line 4a from current-year-taxable crop disaster payments on cash
lines 6a/6b or accrual line 41, following the [2025 Schedule F
instructions](https://www.irs.gov/instructions/i1040sf). The graph carries the
source identity into the farm row; final native and PDF export compares each
row back to the retained 1099-G and matches its recipient to the farm
proprietor. A cash-method fixture with $3,500 of taxable crop-disaster
payments, $7,500 of crop insurance, and $600 of CCC market gain reaches
Schedule F lines 6a/6b $11,000, Schedule 1 line 6 and Form 1040 line 8
$16,100, matching the native XML while the full PDF packet builds. Missing
identity, changed payer/farm rows, and a coordinated wrong owner reject in
focused graph/export tests. Deferral of a source explicitly reviewed as
current-year taxable also rejects. The reviewed classification does not
authenticate the USDA award or issued payer bytes. Other disaster-payment
purposes, a valid crop-disaster deferral, prior-year crop-income timing and
election history, source copies, filled-PDF visual review, IRS
business rules, and ATS remain open.

Positive Form 1099-MISC box 9 crop insurance and Form 1099-PATR farm
distributions now carry the issued payer, recipient, source reference, and
named farm into Schedule F. Final native and PDF preflight compares each farm
row to the retained payer copy and the recipient to the farm proprietor. A
changed source copy and coordinated wrong-owner row reject for each form in
focused full-return cases; a $500 cooperative distribution with $400 verified
taxable reaches Schedule F, Schedule 1 line 6, and Form 1040 line 8. The
current-year-taxable 1099-G crop-disaster full return also passes the local
TY2025 v5.4 XSD in its focused e2e fixture. These synthetic tests do not
authenticate issued copies, taxability workpapers, filled-PDF appearance, IRS
business rules, or ATS acceptance.

The 1099-PATR intake now rejects positive box 6 or box 7 without the box 13
specified-cooperative mark, and rejects a box 6 deduction above 9% of box 7
qualified payments. These are the issuer-box constraints in the
[2025 IRS instructions](https://www.irs.gov/instructions/i1099ptr). Focused
graph and native/PDF exporter checks pass. The written section 199A(g) notice,
issued-copy authenticity, and wider QBI/source review remain open.
