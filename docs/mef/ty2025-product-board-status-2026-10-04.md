# TY2025 product board status checkpoint, 2026-10-04

## Compacted status (2026-10-04)

The board has **52 open TODOs**: **32 outside** Named tax-form gaps and **20
inside** that section. The 1230 bounded completed slices are recorded in the
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
| Automated and artifact validation | 5 | A corrected-source full batch passed 11,121/11,121 on `a5e0c448`; route completeness, every-page review, and IRS acceptance remain open. |
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
Before the current Form 4972 review, the retained manifest inventory marked
149 distinct fixture IDs and 842
pages complete, with 36 fixture IDs still lacking completed page flags; this
counts manifest checklists rather than rechecking older packets.
The current Form 4972 Part-II-only packet adds five visually reviewed pages
with a passing source/XML/artifact/XSD checker, bringing the distinct completed
inventory to 150 fixture IDs and 847 pages; 35 fixture IDs remain without
completed page flags. The separate Form 461 packet remains guarded on its
already tested net-QBI-loss carryforward boundary.
The ISO AMT packet adds six visually reviewed pages, with the Form 3921 spread
reaching Form 6251, Schedule 2, and Form 1040 and a passing source/XML/XSD
checker. The distinct completed inventory is now 151 fixture IDs and 853
pages, with 34 fixture IDs lacking completed page flags.
The Schedule J farm-income-averaging packet adds 13 visually reviewed pages
with source/XML/XSD checks across Schedule F, Schedule SE, Form 8995, and
Form 1040. The distinct completed inventory is now 152 fixture IDs and 866
pages, with 33 fixture IDs lacking completed page flags.
The nonparticipating rental-loss packet adds six visually reviewed pages:
Schedule E retains the $5,000 pre-limitation loss, Form 8582 disallows it,
and Form 1040 carries no current deduction. The source/XML/XSD checker passed.
The distinct completed inventory is now 153 fixture IDs and 872 pages, with
32 fixture IDs lacking completed page flags.
The reported tax-credit-bond packet adds seven visually reviewed pages with
Form 8912's $100 issuer-identified credit flowing once through Schedule 3
and Form 1040; its source/XML/XSD checker passed. The distinct completed
inventory is now 154 fixture IDs and 879 pages, with 31 fixture IDs lacking
completed page flags.
The Schedule SE rounding change was replayed through all 15 previously
reviewed selected fixtures containing that form. Six current PDF/XML pairs
were byte-identical; 39 changed pages across nine pairs were visually
rechecked, and the current 15-case/192-page hash, source, page-origin, and XSD
checker passed. This refresh does not change the distinct-fixture count.
The subsequent whole-dollar correction to Schedule SE line 13 was replayed
through those 15 fixtures plus the Schedule J and Form 8881 cases. The
17-case/229-page checker passed; 29 changed pages were visually rechecked.
The Form 8881 review adds 24 pages to the distinct completed inventory,
bringing it to 155 fixture IDs and 903 pages; 30 fixture IDs remain without
completed page flags. IRS acceptance is still open.
A further first-joint-year Form 2210-F packet passed three visually reviewed
pages and source/XML/XSD checks. The distinct completed inventory is now
156 fixture IDs and 906 pages, leaving 29 fixture IDs without page flags.
The foreign-interest excess-credit packet adds eight reviewed pages, including
Form 1116 and its carryover Schedule B; the inventory reaches 157 fixture IDs
and 914 pages, with 28 fixture IDs lacking completed page flags.
The annual-method marketplace APTC repayment packet adds six reviewed pages;
the distinct inventory is 158 fixture IDs / 920 pages, leaving 27 fixture IDs
without completed page flags.
The shared-policy Situation 4 packet adds five reviewed pages with a single
80% allocation to the filer and $2,880 net PTC; the inventory reaches 159
fixture IDs / 925 pages, with 26 fixture IDs lacking completed page flags.
Two sequential-policy Form 8962 packets add ten reviewed pages. Four uncovered
months stay blank in the first; five distinct policies cover the full year in
the second. The inventory reaches 161 fixture IDs / 935 pages, with 24
fixture IDs lacking completed page flags.
Three corrected-SLCSP Form 8962 packets add 18 reviewed pages, with repayments
of $1,096, $1,046, and $1,346 carried once through Schedule 2 and Form 1040.
The inventory reaches 164 fixture IDs / 953 pages, with 21 fixture IDs lacking
completed page flags.
Three shared-policy Form 8962 packets add 16 reviewed pages. One uses separate
20%/80% agreements; the MFS cases exercise capped repayment and a qualifying
PTC exception. The inventory reaches 167 fixture IDs / 969 pages, with 18
fixture IDs lacking completed page flags.
The trust clean-electricity investment-credit packet adds 17 reviewed pages:
Form 3468 Part V's $3,000 source credit reaches Form 3800, Schedule 3, and
Form 1040 once. The inventory reaches 168 fixture IDs / 986 pages, with 17
fixture IDs lacking completed page flags.
The geothermal production-credit packet adds 17 reviewed pages: Form 8835
line 15 carries $600 into Form 3800 Part III specified-credit line 4e,
Schedule 3, and Form 1040 once. The inventory reaches 169 fixture IDs /
1003 pages, with 16 fixture IDs lacking completed page flags.
A separate current-head two-page direct pension rollover packet passed a
completed source/XML/visual checklist; the all-page review gate remains open.
Two current-head Form 1098 purchase and construction-refinance points packets
passed six more source/XML/visual page checks; other Form 1098 branches remain open.
A current 116-descriptor IRS AcroForm audit found no missing mapped field names, wrong field types,
or template errors; field values, page layouts, and unused template fields still
need route review. The live inventory has 149 native MeF descriptors, 116 PDF
descriptors, and 211 TY2025 schema roots. These counts are inventories, not positive filing claims.

**Validation and release.** `deno task test` passed 11,121/11,121 on
`a5e0c448` after the Form 4684 PDF and Schedule SE rounding repairs, with
zero failures on 2026-10-04. The exact
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
