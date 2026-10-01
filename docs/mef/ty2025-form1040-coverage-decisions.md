# TY2025 Form 1040 coverage disposition queue

Build-stage disposition queue updated 2026-10-01. This is the decision layer
over the [registered-descriptor audit](ty2025-form1040-form-audit.md) and the
[211-root schema census](ty2025-xsd-document-root-census.md); it does not
certify any filing route. The current descriptor and source-literal counts are
recorded in those inventories and the [product board](../../product_board.md).
They measure different things: some descriptors are statements, and a literal
is neither registration nor valid, complete output. The ordered
[unregistered-root reviews](ty2025-unregistered-root-applicability.md) cover
the historical 128-root review, including roots that have since gained literals.
These are static source counts from `ALL_MEF_FORMS`, `ALL_PDF_FORMS`, and exact
`IRS...` tokens in non-test MeF form source files. A source token can occur in
a staged, unregistered builder, as with `IRS9465`; these counts are not
execution or acceptance evidence.

The [external-evidence matrix](ty2025-external-evidence-standard-audit.md)
compares reviewed facts, submitted bytes, signed documents, prior accepted
returns, and ATS fixtures across complex routes. It records current gates and
inconsistencies without choosing a new evidence policy or changing export.

The descriptor counts in the linked inventories include each identifier entry
in `ALL_MEF_FORMS` and `ALL_PDF_FORMS`.
The literal count uses the 211 root names in the first table column of the
schema census, intersects them with unique `IRS[A-Za-z0-9]+` matches from
non-test MeF form source files, and subtracts the intersection from 211. It does
not count a staged source as registered.

Current static reconciliation (2026-10-02): `ALL_MEF_FORMS` has **145** entries
and `ALL_PDF_FORMS` has **115**. The 211-root census has **122** exact MeF form
source literals and **89** roots with no such literal. Of the 122, **116** have
a literal in a registered descriptor file and **six** have literals only in
unregistered files (`IRS2210`, `IRS8828`, `IRS8908`, `IRS8938`, `IRS8997`,
`IRS9465`). The 116 are a file-level measure, not 116 supported filing routes:
for example, the unregistered `IRS1116ScheduleC` projection is mentioned by a
registered parent file. There are **seven identifiable unregistered root
builders**: those six plus `IRS1116ScheduleC`. This staged-builder count is
separate from the 89 literal-free roots and does not establish that every
other literal root has a complete route. The number of **whole-form verified routes remains
zero established by this inventory**. No exact supported-route count can be
derived from registry or literal counts; the per-row trigger/source/output
review and final validation are still open.

The earlier registered-document matrix omitted Form 2106 and the six newly
registered Forms 8844, 8864, 8881, 8882, 8941 and 8994; its seven new rows
now account for 145/145 entries. The root census had ten stale `No` flags:
`IRS2210`, `IRS8828`, `IRS8844`, `IRS8864`, `IRS8881`, `IRS8882`,
`IRS8908`, `IRS8938`, `IRS8941`, `IRS8994`. Updating a literal flag does not
approve or activate an unregistered form. The conditional-schedule audit
still identifies four bounded Form 8995-A companions and one unregistered
Form 1116 Schedule C. The crosswalk retains historical rows for roots since
registered; its current introduction distinguishes those rows from the 89
literal-free roots.

The Form 3800 carryforward computation descriptor was registered on
2026-09-29. It passes a standalone schema check and a synthetic parent-link
check, but the production parent filing remains blocked; this does not change
any disposition below. The root list was captured 2026-09-28; its source-literal
statuses have since been reconciled with the current tree.

## What can be decided from current evidence

| Disposition                                 | Exact boundary                                                                                                                                                                                                                                                                                                                                                  | What remains                                                                                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agreed product exclusion                    | Standalone 1040-NR, 1040-SS, Form 4868, and dual-status 1040 e-file.                                                                                                                                                                                                                                                                                            | No other Form 1040-family route has been approved for exclusion.                                                                                                                                           |
| Registered, bounded route                   | The [form-by-form audit](ty2025-form1040-form-audit.md) identifies a source/calculation slice, serializer, PDF status, and known unsupported branches for each currently registered descriptor. | A bounded route is not whole-form support. The historical `11d5047d` snapshot passed 8,897/8,897; the later PR #59 bulk run had 174 failures. Per-row XSD, filled-PDF, IRS-rule, and ATS evidence is incomplete. |
| Registered, active claim blocked            | Form 8839 has a bounded reviewed one-child prepared-bundle route through programmatic and strict stored-input CLI entrypoints; sync XML/standalone PDF without attachment bytes remain blocked. Nonexempt Form 8990 interest has bounded projections but export remains blocked pending durable carryforward persistence. | Complete the other adoption and interest carryforward branches or retain explicit fail-closed behavior; registration alone cannot turn either into whole-form support. |
| Public source, positive filing route absent | The [root crosswalk](ty2025-unregistered-root-applicability.md) lists public-input and graph paths, including Forms 9465, 8997, 8958, 5471 and 172; Form 5471 has a bounded incomplete Category 5a packet, with positive export still closed. Schedule J has a bounded registered Schedule F-only election, while wider claims reject. Form 7203 has a bounded registered stock-only loss route, while other shareholder-basis situations remain blocked. | A guard or staged descriptor is a current safety boundary, not a permanent product exclusion. Each conditional filing trigger, source owner and required native document still needs a decision.           |
| Conditional companion incomplete            | Form 8995-A Schedules A, B, C and D have bounded registered native routes. Schedule B's route covers only one group of two sourced Schedule C businesses. Form 1116 Schedule C retains a positive trigger without a registered filing route; it has a staged source/XML projection only.                                                                        | The [conditional-schedule audit](ty2025-conditional-schedule-applicability.md) names trigger and guard status. Complete the remaining attachments or explicitly approve fail-closed unsupported scenarios. |
| Source-only or separate workflow candidate  | Some K-1, payment, entity and information roots may belong to another filer or workflow.                                                                                                                                                                                                                                                                        | The current return's attachment rule must be confirmed individually. Neither schema presence nor nonregistration proves an exclusion.                                                                      |

Static boundary review on 2026-10-01 found that the public `general` input
rejects an explicit `dual_status_return_2025` before calculation, the TY2025
MeF builder rejects a return type other than `1040` or a year other than 2025,
and both MeF and PDF export run the final-header dual-status guard. Existing
focused rejection fixtures cover the public input, prepared return, MeF, and
PDF paths. The separate 1040-NR, 1040-SS, and 4868 ATS scenario facts are
research records; they do not register those filing routes. This static review
does not replace the deferred bulk execution, so the board's release-boundary
verification remains open.

The eight headline gaps in the user-facing board are not one status. Forms 1116,
6251, 8283, 8889, 8582, 4952, 4972 and 8962 each have newly written bounded
slices, recorded in the [form audit](ty2025-form1040-form-audit.md) and their
linked gap documents. Their remaining branches stay unsupported or unverified.
In particular, Form 1116 Schedule C is source intake with an export block, not
an emitted schedule; Form 8582's versioned ledger is storage-ready, not an
accepted filed-year ledger; and Form 8283's unsigned preview cannot replace
signed attachment evidence.

Schedule LEP is no longer an absent optional attachment: a taxpayer or joint
spouse language request has a typed public input, native serializer, and
one-page-per-person PDF projection. A joint source return now passes local
TY2025 v5.4 full-return XSD with two distinct LEP documents, and all four
PDF pages were inspected for owner identity and separate language selections.
IRS business-rule and ATS gates remain open. This is not an exclusion decision.

### Evidence that code cannot infer

| Filing path still blocked                                                | External evidence needed before a positive route can be built                                                                                                                                                       | Current boundary                                                                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Form 1116 Schedule C redetermination                                     | Authenticated filed affected-year Forms 1116, Schedule 3 and Form 1040, foreign assessment/payment/refund records, later-year carryover review, and any required amended-return package.                            | Staged arithmetic only; export rejects.                                                                                                    |
| Form 8283 capital-gain-property carryover year                           | A completed previous-year Form 8283 copy for each carried gift and any appraisal copy required with that earlier filing, tied to original gift and donee facts.                                                     | A bounded reviewed Section A publicly traded securities route is wired and its one- and two-gift bundles pass local XSD. Other carryovers reject; the synthetic prior PDFs do not authenticate actual filed copies. |
| Form 8839 adoption claims beyond one reviewed domestic child | Issued decree and expense/reimbursement evidence, exclusion and Form 2555 facts, and final credit-order review. | One strict reviewed one-child source can reach native/PDF through a prepared bundle with exact attachment bytes, including the strict stored-input CLI path. Other claims and sync XML/standalone PDF without bytes reject; operational evidence review remains. |
| Form 8995-A Schedule B aggregation beyond the bounded two-business route | Ownership and operational-relationship proof, prior election/RPE statements, and each business's TIN, QBI, W-2 wages and UBIA.                                                                                      | The reviewed two-Schedule-C route is registered and has local tests; names-only or wider aggregation still rejects.                        |
| Form 4952 K-1 code B expense                                             | A source crosswalk tying the box 20 code B amount to the exact allowed K-1 deduction, expense character, and filed destination. The separate box 7 royalty and box 13 code I Schedule E route is written but unrun. | Informational box 20 code B alone cannot establish an allowed deduction; export rejects.                                                   |
| Form 8990 nonexcepted interest                                           | Authenticated debt-tracing and filed-year Form 8990 sources plus a durable accepted-filing carryforward ledger for line 31 into the next year.                                                                      | Bounded two-pass math and native/PDF projections are written, but export remains blocked; preview-only memory is not a filed carryforward. |
| Form 4972 combined NUA and death/estate allocations                      | Beneficiary and participant death records, exclusion allocation, and the estate administrator's tax-attributable statement, tied to the elected 1099-R and Schedule A/1040.                                         | NUA and estate-only bounded routes exist separately; their combination rejects rather than trusting direct asserted amounts.               |

These are missing source facts, not proposed silent exclusions. The user must
either provide a supported evidence path or explicitly approve a named release
boundary while retaining fail-closed behavior for entered unsupported claims.

## Exact proposed decisions for user review, not applied

For TY2025 current-return inputs, two additional named exclusions are under
review. The [Form 8873 instructions](https://www.irs.gov/instructions/i8873)
say its binding-contract exception was repealed for tax years beginning after
May 17, 2006. The [latest Form 8915-D instructions](https://www.irs.gov/instructions/i8915d)
cover 2024 repayments and amendments of affected 2021–2023 returns. The
previous `f8873` and `f8915d` nodes incorrectly deposited these asserted
amounts into Schedule 1 line 8z for a TY2025 return. Populated input now
rejects at calculation, and both exports already reject; this is a safety
boundary while the named product decisions remain open. If the user approves
these two specific exclusions, record that disposition and retain the
rejection. An affected-year amendment remains a separate workflow decision.
No exclusion is applied by this note.

The following are candidates to separate from the initial **current-year Form
1040 return preparation** workflow. They are **not excluded now**. A decision to
omit them must name the filing path, not merely the schema root, and must
preserve an explicit rejection for an entered in-scope claim.
The [separate-workflow matrix](ty2025-separate-workflow-decision-matrix.md)
lists the current code/schema facts, current-return consequence and concrete
choices for each root. Its schema observations use an ignored local IRS v5.4
cache, so reproducible provenance remains open.

1. Decide whether amended-return filing `IRS1040X` is a separate workflow. This
   does not remove the need to detect prior-year amendments triggered by Form
   1116 Schedule C redeterminations.
2. Decide whether payment-request roots `IRS1062Payment`, `IRS965Payment`,
   `IRSESPayment`, and `IRSPayment` are transmitted with the
   current-return package or handled by a separate payment workflow. Section 965
   liabilities still need tax and payment reconciliation regardless of that
   channel choice. `IRSFormT` is a conditional timber filing attachment and
   remains in the individual-versus-entity owner review, not this payment choice.
3. Decide whether payer-issued `IRSRRB1042S` and `IRSSSA1042S` are transmitted
   documents or source-only records for an individual recipient. Income and
   withholding must still reconcile to Form 1040.
4. Decide whether the optional current-return attachments `IRS4547` (child
   account election) and `IRS9000` (alternative-media preference) are offered
   through this product or assigned to their documented separate submission
   channels. These are two named workflow choices, not a waiver of an entered
   election or preference; neither currently has a public input.
5. For entity-associated roots, decide ownership per filing situation rather
   than as a family-wide exclusion. In particular, an individual can have a
   direct `IRS8858`/`IRS8858ScheduleM` or section 962 `IRS1118` obligation; an
   entity-issued K-1 or entity-owned document can instead be source evidence.
   The [root crosswalk](ty2025-unregistered-root-applicability.md) names each
   conditional trigger and missing source/attachment link.

The [focused entity-issued root audit](ty2025-entity-issued-root-disposition.md)
supports proposing `IRS1065ScheduleD` and `IRS8825` as other-filer documents
when the individual only receives a K-1. This needs explicit product approval,
not a blanket entity-root exclusion. It also finds that `IRS1041ScheduleK1` is
normally beneficiary source evidence but becomes a required Form 1040 attachment
for box 13 code B backup withholding. The current trust K-1 intake cannot
identify that code or supply the issued-copy attachment, so that exception
remains an in-scope build gap, not an exclusion.

Do **not** infer approval for those decisions from this document. It does not
propose excluding the known individual attachment candidates such as Schedule J,
Forms 7203, 5471, 8997, 8958, 172, 1116 Schedule C, or 8995-A Schedule B beyond
its bounded route or broader Schedule A/C/D routes. It also does not treat
entity-owned families as automatically out of scope: the
[root crosswalk](ty2025-unregistered-root-applicability.md) lists the category,
partner and owner questions that must be answered first.

## Release gate

For every retained supported scenario: resolve source provenance and required
attachments, run the agreed full batch once build decisions are complete, repair
failures, validate generated XML against a reproducibly sourced TY2025 IRS schema
(the current v5.4 copy is an ignored local research cache),
inspect actually filled PDFs, then obtain applicable IRS business-rule and ATS
acceptances. No ATS acceptance is recorded. Review, PR, merge and release follow
those gates, not the static inventory.
