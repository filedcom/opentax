# TY2025 product board status checkpoint, 2026-10-04

## Compacted status (2026-10-04)

The board has **52 open TODOs**: **32 outside** Named tax-form gaps and **20
inside** that section. The 1212 bounded completed slices are recorded in the
[completed ledger](ty2025-product-board-completed-2026-10-01.md).
A completed slice does not close its parent form or release gate.

Work the non-named queue first where source evidence and scope are settled.
The [dependency audit](ty2025-nonnamed-board-dependency-audit.md)
maps those 32 rows to independent work, product decisions, named-form
prerequisites, validation, and IRS ATS needs. Keep the named-form parents open
until their full routes or approved rejection boundaries are established.

| Workstream | Open TODOs | Current state |
| --- | ---: | --- |
| Scope and completion rules | 3 | End-to-end filing boundaries and acceptance remain open. |
| Coverage inventory and decisions | 8 | Applicability, source evidence, and unsupported-path dispositions need review. |
| Core return and source paths | 8 | Broader joins, ownership, and source classification remain open. |
| Named tax-form gaps | 20 | Listed parent forms remain open despite completed bounded slices. |
| Native MeF and PDF parity | 3 | Complete descriptor, attachment, and print parity remain open. |
| Automated and artifact validation | 5 | A full batch passed 11,116/11,116 before the Form 4684 PDF repair. A corrected-source rerun stopped amid disk pressure; its 18-case XSD group passed when rerun with disk space restored. A clean corrected-source full result, route completeness, every-page review, and IRS acceptance remain open. |
| IRS ATS and delivery | 5 | Credentials, accepted scenarios, and a filing-ready release remain open. |

**Implemented coverage.** Retained routes include source and owner checks for
W-2, 1099, payment, Schedule B interest (including generic broker, K-1, and Form 8912 payer rows), K-1 dividend source totals and box 6c classification, tax-exempt interest, and Form 1040 component totals; shared native/PDF preflight;
PDF field, checkbox, retained-page, and filer-name checks; and prepared
attachment/archive/A2A integrity checks. Selected 21-case/70-page and
55-case/185-page synthetic packets passed their completed visual checklists
and read-only replay checks. A five-page mixed box 8/RTAA/grant packet also
passed visual and source/XML/PDF replay review. A six-page short/long Form 8949
and Schedule D packet passed the same checks. An 11-page Schedule C simplified
home-office packet passed source/XML/PDF replay and visual review. An additional
13-page mixed 1099-K/1099-NEC/personal-sale packet passed the same checks.
Two six-page personal-sale 1099-K gain/loss and selling-fee packets, plus
fourteen pages for blank-TIN withholding and business refund/fee routes, passed
visual and source/XML/PDF replay checks.
A two-page excess W-2 code D deferral packet also passed page review,
source/XML/PDF replay, and local TY2025 XSD validation.
These bounded selections do not cover all 185
current fixtures.
The retained manifest inventory now marks 149 distinct fixture IDs and 842
pages complete, with 36 fixture IDs still lacking completed page flags; this
counts manifest checklists rather than rechecking older packets.
A separate current-head two-page direct pension rollover packet passed a
completed source/XML/visual checklist; the all-page review gate remains open.
Two current-head Form 1098 purchase and construction-refinance points packets
passed six more source/XML/visual page checks; other Form 1098 branches remain open.
A current 116-descriptor IRS AcroForm audit found no missing mapped field names, wrong field types,
or template errors; field values, page layouts, and unused template fields still
need route review. The live inventory has 149 native MeF descriptors, 116 PDF
descriptors, and 211 TY2025 schema roots. These counts are inventories, not positive filing claims.

**Validation and release.** `deno task test` passed 11,116/11,116 on
`a75f0bca` with local changes on 2026-10-04 and no ignored tests. It started
before the Form 4684 PDF repair. A corrected-source rerun stopped near the
end amid disk pressure; the affected 18-case XSD group passed after disk
space was restored. A clean corrected-source full run remains open. The exact
commands, log digests, and
open source/visual/ATS
limits are recorded in the
[validation batch](ty2025-form1040-validation-batch.md).
The later Form 1099-NEC positive-payer identity guard passed 76 focused graph
and native/PDF Form 1040 export tests.
The subsequent Form 1099-MISC payer-name guard passed 99 focused source and
native/PDF Form 1040 exporter tests.
The later Form 1099-INT/OID payer-name guards passed 102 focused source and
native/PDF Form 1040 exporter tests.
The Form 1099-DIV positive-payer guard passed 90 focused and five nearby
dividend-reconciliation tests.
The Form 1099-G positive-payer guard passed 62 focused and four nearby
unemployment-replay tests.
The Form 1099-PATR positive-payer guard passed 22 focused graph, owner, and
withholding-exporter tests.
The final Form 1099-B broker-identity guard passed 23 broker tests and 36
related withholding, interest, and attachment tests.
The later Form 1099-B description and real TY2025 sale-date guard passed 25
broker tests and the same 36 related tests.
The Form 1099-B acquired-date final guard passed 26 broker and 36 related
tests. An additional VARIOUS acquired-date route passed focused native/PDF
tests and local TY2025 Form 8949 XSD validation; other special acquired-date
codes and calendar formats remain open.
The Form 1099-R final payer-identity guard passed a native/PDF regression and
30 nearby tests. Two older PDF text-extraction tests cannot run in this
environment because `pdftotext` is unavailable.
The Schedule 1 line 8z bare disallowed-business-interest guard passed 62
focused source, native, and PDF tests; positive Form 8990 filing remains open.
The exact `INHERITED` acquired-date code now reaches long-term broker Form
8949 XML and PDF; 64 focused tests, including local TY2025 XSD, passed.
Other inherited-basis evidence and `INH-2010` election paths remain open.
The W-2 same-employer/employee repeated-copy guard passed a graph-to-native/PDF
case and 116 nearby W-2 tests; correction lineage remains open.
All four payment-request root families now retain typed intent and stop native
and PDF export with an explicit separate-workflow message. Debit authority and
transmission remain open; 15 focused tests passed.
Form 1040-X amendment intent now retains its affected year and prior-return
reference and stops original-return exports; 18 focused amendment,
payment, and coverage tests passed. The amendment filing workflow remains open.
SSA/RRB-1042-S issued-copy intake now retains distinct source identities and
amounts and stops both exporters until resident status, withholding, and
attachment requirements are resolved; 15 focused tests passed.
The separate 116-descriptor PDF field audit also passed. CLI type
check, native compilation, and a synthetic W-2 → MeF → PDF smoke passed at
earlier checkpoints.
The attachment-aware TY2025 fixture/XML/XSD file passed 178/178 again at
`8149198a` after the newer source guards.
[CLI v2.0.6](https://github.com/filedcom/opentax/releases/tag/v2.0.6) is
published. Manual page review, complete route/XSD/business-rule evidence, IRS
ATS acceptance, and a filing-ready release remain open.
The selected PDF generator now has a 31-page Form 8826/Form 7203 artifact
manifest after correcting printable packet defects. A bounded Form 2441
no-benefit credit route now has a four-page generated packet; Form 2441
benefit/overflow branches and unimplemented Form 5695 branches still block
complete PDF parity. The sourced Form 5695 door/AC and Form 4684-to-4797 loss
packets now generate with XML/XSD checks, and Form 8936 emits its parent and
vehicle Schedule A as separate copies.
The generated pages still need the full per-page visual review.
A declared 167-case exportable selection now generated 1,052 filled PDF pages
with matching source/XML/PDF hashes and local TY2025 XSD validation. Twelve
guarded source or attachment cases remain outside that selection.
The inventory reached 183 fixtures after adding the paired other-coverage HSA
current-excess case. Its eleven-page owner-specific Form 8889/Form 5329 packet
passed a selected visual/source/XML/PDF replay check. Other selected packets
completed this day are recorded in the validation batch; the all-page gate
remains open. A further Schedule H FICA/FUTA fixture brings the current
inventory to 184; the spouse withholding-only Schedule H fixture makes 185, with the same 85/113 covered PDF keys.

**Phase order.** Finish independently actionable non-named source, graph,
packet, and PDF work; settle the workflow and evidence decisions; retain the
passing local batch as automated evidence. Named-form completion, complete
visual/XSD/business-rule evidence, and IRS ATS acceptance have their own open
rows below. The [validation batch](ty2025-form1040-validation-batch.md)
records test and artifact detail; the [September 30 checkpoint](ty2025-product-board-checkpoint-2026-09-30.md)
records earlier evidence.
