# TY2026 Form 1040 research corpus

Snapshot date: 2026-09-27. This is the source map for full TY2026 1040 end-to-end
work. Start at [`forms/f1040/2026/README.md`](../../forms/f1040/2026/README.md)
for the implementation contract.

## What is in this snapshot

- [`corpus/manifest.json`](corpus/manifest.json): URL, SHA-256, byte length,
  and retrieval date for **57 TY2026 IRS draft forms**, the **2026 draft
  Schedule 8812 instructions**, **five draft URLs that
  still serve an older year**, **13 IRS ATS PDFs**, **two MeF
  inventory spreadsheets**, final IRS authorities (Rev. Procs.
  2025-19, 2025-25, 2025-32; Notice 2025-67; Notice 2026-10; and IRB
  2026-29 and 2026 W-2/W-3 instructions), Publication 505 (2026), and the final 2025 HHS poverty guidelines. All PDFs
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
