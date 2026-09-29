# TY2025 Form 1040 coverage disposition queue

Static build-stage checkpoint, 2026-09-28. This is the decision layer over the
[123 registered-descriptor audit](ty2025-form1040-form-audit.md) and the
[211-root schema census](ty2025-xsd-document-root-census.md). It does not
certify any filing route. The MeF registry contains 123 descriptors and the PDF
registry contains 87. The schema census has 97 roots with a source literal and
114 without one. Those are different measures: some descriptors are statements,
and a literal is neither registration nor valid, complete output. The ordered
[unregistered-root reviews](ty2025-unregistered-root-applicability.md) cover the
historical 128-root review, including fourteen roots that gained literals. These
are static source counts: list entries in `ALL_MEF_FORMS` and `ALL_PDF_FORMS`
were counted, and the 211 XSD-root names were intersected with exact `IRS...`
tokens in non-test `.ts` files under `forms/f1040/2025/mef/forms/`. A source
token can occur in a staged, unregistered builder, as with `IRS9465`; these
counts are not execution or acceptance evidence.

The descriptor counts include each identifier entry between the respective
`ALL_MEF_FORMS = [` / `] as const` and `ALL_PDF_FORMS = [` / `];` delimiters.
The literal count uses the 211 root names in the first table column of the
schema census, intersects them with unique `IRS[A-Za-z0-9]+` matches from
non-test MeF form source files, and subtracts the intersection from 211. It does
not count a staged source as registered.

## What can be decided from current evidence

| Disposition                                 | Exact boundary                                                                                                                                                                                                                                                                                                                                                  | What remains                                                                                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agreed product exclusion                    | Standalone 1040-NR, 1040-SS, Form 4868, and dual-status 1040 e-file.                                                                                                                                                                                                                                                                                            | No other Form 1040-family route has been approved for exclusion.                                                                                                                                           |
| Registered, bounded route                   | The [form-by-form audit](ty2025-form1040-form-audit.md) identifies a source/calculation slice, serializer, PDF status, and known unsupported branches for each of 123 descriptors.                                                                                                                                                                              | A bounded route is not whole-form support. Current full-batch, local XSD, filled-PDF, IRS-rule, and ATS evidence is absent for every row.                                                                  |
| Registered, active claim blocked            | Positive Form 8839 adoption credit and nonexempt Form 8990 interest do not have a complete source-to-filed-return route.                                                                                                                                                                                                                                        | Complete their sources, calculations and native/PDF output or retain explicit fail-closed behavior; registration alone cannot turn either into support.                                                    |
| Public source, positive filing route absent | The [root crosswalk](ty2025-unregistered-root-applicability.md) lists public-input and graph paths, including Forms 9465, 8997, 8958, 5471 and 172. Schedule J has a bounded registered Schedule F-only election, while wider claims reject. Form 7203 has a bounded registered stock-only loss route, while other shareholder-basis situations remain blocked. | A guard or staged descriptor is a current safety boundary, not a permanent product exclusion. Each conditional filing trigger, source owner and required native document still needs a decision.           |
| Conditional companion incomplete            | Form 8995-A Schedules A, B, C and D have bounded registered native routes. Schedule B's route covers only one group of two sourced Schedule C businesses. Form 1116 Schedule C retains a positive trigger without a registered filing route; it has a staged source/XML projection only.                                                                        | The [conditional-schedule audit](ty2025-conditional-schedule-applicability.md) names trigger and guard status. Complete the remaining attachments or explicitly approve fail-closed unsupported scenarios. |
| Source-only or separate workflow candidate  | Some K-1, payment, entity and information roots may belong to another filer or workflow.                                                                                                                                                                                                                                                                        | The current return's attachment rule must be confirmed individually. Neither schema presence nor nonregistration proves an exclusion.                                                                      |

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
one-page-per-person PDF projection. It remains build-only until the full XSD,
filled-PDF, IRS-rule, and ATS gates run. This is not an exclusion decision.

### Evidence that code cannot infer

| Filing path still blocked                                                | External evidence needed before a positive route can be built                                                                                                                                                       | Current boundary                                                                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Form 1116 Schedule C redetermination                                     | Authenticated filed affected-year Forms 1116, Schedule 3 and Form 1040, foreign assessment/payment/refund records, later-year carryover review, and any required amended-return package.                            | Staged arithmetic only; export rejects.                                                                                                    |
| Form 8283 capital-gain-property carryover year                           | A completed previous-year Form 8283 copy for each carried gift and any appraisal copy required with that earlier filing, tied to original gift and donee facts.                                                     | Amount-only Schedule A ledger cannot produce the required attachment; export rejects.                                                      |
| Form 8839 positive adoption credit                                       | Reviewed adoption decree, expense/reimbursement records, applicable exclusion facts, finalized Form 2555 and final-return credit priority.                                                                          | Pure calculator may compute, but node, MeF and PDF positive filing reject.                                                                 |
| Form 8995-A Schedule B aggregation beyond the bounded two-business route | Ownership and operational-relationship proof, prior election/RPE statements, and each business's TIN, QBI, W-2 wages and UBIA.                                                                                      | The reviewed two-Schedule-C route is registered and has local tests; names-only or wider aggregation still rejects.                        |
| Form 4952 K-1 code B expense                                             | A source crosswalk tying the box 20 code B amount to the exact allowed K-1 deduction, expense character, and filed destination. The separate box 7 royalty and box 13 code I Schedule E route is written but unrun. | Informational box 20 code B alone cannot establish an allowed deduction; export rejects.                                                   |
| Form 8990 nonexcepted interest                                           | Authenticated debt-tracing and filed-year Form 8990 sources plus a durable accepted-filing carryforward ledger for line 31 into the next year.                                                                      | Bounded two-pass math and native/PDF projections are written, but export remains blocked; preview-only memory is not a filed carryforward. |
| Form 4972 combined NUA and death/estate allocations                      | Beneficiary and participant death records, exclusion allocation, and the estate administrator's tax-attributable statement, tied to the elected 1099-R and Schedule A/1040.                                         | NUA and estate-only bounded routes exist separately; their combination rejects rather than trusting direct asserted amounts.               |

These are missing source facts, not proposed silent exclusions. The user must
either provide a supported evidence path or explicitly approve a named release
boundary while retaining fail-closed behavior for entered unsupported claims.

## Exact proposed decisions for user review, not applied

The following are candidates to separate from the initial **current-year Form
1040 return preparation** workflow. They are **not excluded now**. A decision to
omit them must name the filing path, not merely the schema root, and must
preserve an explicit rejection for an entered in-scope claim.

1. Decide whether amended-return filing `IRS1040X` is a separate workflow. This
   does not remove the need to detect prior-year amendments triggered by Form
   1116 Schedule C redeterminations.
2. Decide whether payment/account roots `IRS1062Payment`, `IRS965Payment`,
   `IRSESPayment`, `IRSFormT`, and `IRSPayment` are transmitted with the
   current-return package or handled by a separate payment workflow. Section 965
   liabilities still need tax and payment reconciliation regardless of that
   channel choice.
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
failures, validate generated XML against the checked-in TY2025 IRS schema,
inspect actually filled PDFs, then obtain applicable IRS business-rule and ATS
acceptances. No ATS acceptance is recorded. Review, PR, merge and release follow
those gates, not the static inventory.
