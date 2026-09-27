# TY2026 Form 1040 research corpus

Snapshot date: 2026-09-27. This is the source map for full TY2026 1040 end-to-end
work. Start at [`forms/f1040/2026/README.md`](../../forms/f1040/2026/README.md)
for the implementation contract.

## What is in this snapshot

- [`PDF-F1040-MAP.md`](PDF-F1040-MAP.md) and `pdf-fields-f1040.csv`: the
  draft 2026 Form 1040 AcroForm inventory and changed-line mapping for the
  future year-specific PDF builder.
- [`PDF-SCHEDULE3A-MAP.md`](PDF-SCHEDULE3A-MAP.md) and
  `pdf-fields-f1040s3a.csv`: the new schedule's line/widget map and its
  orphaned-field issue.
- [`PDF-SCHEDULEB-MAP.md`](PDF-SCHEDULEB-MAP.md) and
  `pdf-fields-f1040sb.csv`: the 2026 Schedule B field map, including Part III
  disclosures and supplemental statement requirements.
- [`PDF-SCHEDULE2-6251-MAP.md`](PDF-SCHEDULE2-6251-MAP.md),
  `pdf-fields-f1040s2.csv`, and `pdf-fields-f6251.csv`: the 2026 additional-tax
  and AMT attachment field maps and remaining print-detail gaps.
- [`PDF-DEPENDENTS-8812-MAP.md`](PDF-DEPENDENTS-8812-MAP.md): the revised
  dependent table, continuation, Schedule 8812 AcroForm fields, and checks.
- [`PDF-SCHEDULE3-MAP.md`](PDF-SCHEDULE3-MAP.md): the revised Schedule 3 lines,
  Form 1040 and Schedule 8812 routes, and draft PDF fields.
- [`SCHEDULE1-GRAPH.md`](SCHEDULE1-GRAPH.md) and
  `pdf-fields-f1040s1.csv`: the 2026 Schedule 1 source/AGI contract, changed
  line meanings, and 73 draft PDF widgets.
- [`MEF-V1-DRIFT.md`](MEF-V1-DRIFT.md): why the downloaded May v1 1040 XSD
  cannot describe the September draft form, and the exact refresh/diff gate.
- [`INSTRUCTION-COVERAGE.md`](INSTRUCTION-COVERAGE.md) and
  `instruction-coverage.csv`: available 2026 instructions, URLs still serving
  2025, and source refresh gates for the full form inventory.
- [`GRAPH-ROUTES.md`](GRAPH-ROUTES.md) and `graph-route-gaps.csv`: generated
  inventory of declared 2026 edges whose downstream target is not registered.
- [`INTEREST-GRAPH.md`](INTEREST-GRAPH.md): source-backed 1099-INT, Schedule B,
  AGI, NIIT, PDF, and MeF wiring and attachment contract.
- [`DIVIDEND-GRAPH.md`](DIVIDEND-GRAPH.md): continuous-use 1099-DIV source,
  current TY2026 income/withholding route, and dependent-form worklist.
- [`SSA-BENEFITS-GRAPH.md`](SSA-BENEFITS-GRAPH.md): SSA-1099 and RRB-1099 box
  distinctions, taxable-benefit route, and remaining repayment/election work.
- [`FORM1099R-GRAPH.md`](FORM1099R-GRAPH.md): final 2026 Form 1099-R box changes,
  IRA/pension downstream routes, and filing gates.
- [`FORM5329-GRAPH.md`](FORM5329-GRAPH.md): early SIMPLE IRA Part I tax and
  attachment route, with the remaining additional-tax work.
- [`FORM8606-GRAPH.md`](FORM8606-GRAPH.md): 2026 IRA basis, conversion,
  Roth-distribution, spouse-form, and carryforward implementation contract.
- [`CAPITAL-GAIN-GRAPH.md`](CAPITAL-GAIN-GRAPH.md): direct 1099-DIV box 2a
  decision, Schedule D/8949 dependencies, and PDF/MeF work order.
- [`PDF-SCHEDULED-MAP.md`](PDF-SCHEDULED-MAP.md) and
  `pdf-fields-f1040sd.csv`: all 55 draft Schedule D widgets, the six Form 8949
  summary rows, and the reconciliation work required for a filed attachment.
- [`TRANSACTION-GRAPH.md`](TRANSACTION-GRAPH.md): the 2026 1099-B/1099-DA box
  meanings, Form 8949 classification, Schedule D totals, and MeF/ATS gates.
- [`PDF-FORM8949-MAP.md`](PDF-FORM8949-MAP.md) and `pdf-fields-f8949.csv`:
  all 202 draft Form 8949 widgets and the eleven-row pagination contract.
- [`FORM5695-CREDIT-GRAPH.md`](FORM5695-CREDIT-GRAPH.md): the carryforward-only
  2026 form, its pinned draft instructions, and the Schedule 8812 credit order.
- [`SCHEDULEH-GRAPH.md`](SCHEDULEH-GRAPH.md): 2026 household payroll thresholds,
  FUTA paths, and the Schedule 2 line 17a attachment contract.

- [`corpus/manifest.json`](corpus/manifest.json): URL, SHA-256, byte length,
  and retrieval date for **57 TY2026 IRS draft forms**, the **2026 draft
  Schedule 8812, Schedule B, Schedule H, Form 5695, and Form 5329 instructions**, **five draft URLs that
  still serve an older year**, **13 IRS ATS PDFs**, **two MeF
  inventory spreadsheets**, final IRS authorities (Rev. Procs.
  2025-19, 2025-25, 2025-32; Notice 2025-67; Notice 2026-10; and IRB
  2026-29 and 2026 W-2/W-3 instructions), continuous-use Form 1099-DIV and
  its instructions, final 2026 Forms 1099-B/1099-DA/1099-R with instructions, the
  2025 Form 1040 and Form 8949 instructions as marked comparators,
  Publication 505 (2026), and the final 2025 HHS poverty guidelines. All PDFs
  are source artifacts, not filing-ready forms. Run `python3
  docs/ty2026/corpus/download.py` to refresh the snapshot; review all hash
  changes before using new values or layouts.
- [`pdf-coverage.csv`](pdf-coverage.csv): each current TY2025 PDF descriptor,
  its IRS source URL, and whether a matching TY2026 draft is in the snapshot.
  Current result: 51 of 56 descriptors have a 2026 draft; five IRS draft
  URLs still serve older years and are recorded as `wrong-year` in the manifest.
- [`mef-coverage.csv`](mef-coverage.csv): each TY2025 MeF serializer module.
- [`node-coverage.csv`](node-coverage.csv): all 191 registered TY2025 graph
  nodes, their source modules, 2025 year mentions, tax-year dispatch, matching
  MeF/PDF surface, available 2026 draft, and review priority. Every row remains
  `audit-required` until its TY2026 behavior and output route are proved;
  progress notes do not mean a node is ready for the 2026 registry.
- [`year-literals.csv`](year-literals.csv): all `2025` occurrences in non-test
  calculation node source, including comments. These are review leads, not
  proof of a bug. Regenerate the four CSVs with `python3
  docs/ty2026/build_inventory.py` after a source or code change.
- [`FORM-DELTA.md`](FORM-DELTA.md): concrete changes visible in IRS draft forms.
- [`DEDUCTION-GRAPH.md`](DEDUCTION-GRAPH.md): source-backed Schedule A,
  Schedule 1-A, and QBI dependency contract and implementation sequence.
- [`SCHEDULE2-8812.md`](SCHEDULE2-8812.md): filed 2026 Schedule 2 line
  crosswalk and the Schedule 8812 Part II-B source dependency.
- [`ATS.md`](ATS.md): scenario inventory and fixture extraction rules.
- [`CONSTANTS.md`](CONSTANTS.md): authority-to-config mapping.
- [`IMPLEMENTATION.md`](IMPLEMENTATION.md): ordered code and verification plan.
- [`SOURCES.md`](SOURCES.md): versions, Drive package, availability limits,
  and refresh procedure.

## Version rule

Do not mix TY2026 sources without recording their version. On this snapshot
date, the IRS public page lists 2026v4.0 for MeF, while the user's Drive folder
has only the May 2026 IMF package containing 2026v1.0. The v1 XSD/rules help
locate changes and bootstrap work; they do **not** prove conformance to v4 or
future production releases. Draft forms and ATS PDFs can change independently
of the MeF package. Reconcile all three before claiming end-to-end readiness.

## Scope

`f1040:2026` means the federal Form 1040 product family already represented
by the 2025 registry. The IRS ATS index also lists 1040-NR, 1040-SS, and 4868;
they are inventoried here, but the current codebase has no full 2025 product
definition for those form types. Their addition is separate product work and
must be stated explicitly if included in a release claim.
