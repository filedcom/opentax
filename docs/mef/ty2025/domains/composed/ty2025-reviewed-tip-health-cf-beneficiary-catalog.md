# Existing reviewed tip/health/C/F/beneficiary packet catalog inventory

This catalog-only change adds 18 already reviewed public source returns to the held PDF review inventory: nine qualified-business-tip/health packets (149 pages), seven mixed C/F business-tip packets (220 pages), and two same-participant partial-beneficiary Form4972 packets (six pages). It introduces no new tax branch or form-eligibility claim. The source-only planner now has 365 fixtures, 116 PDF descriptors, 113 descriptor keys and 96 expected keys. The same 17 keys remain uncovered.

## Retained sources and independent metadata

`review-tip-health-cf-beneficiary.inputs.json` retains the exact public input values from the reviewed packets, including original issued records, owner/plan references, expense inventories, election facts and source reviews. The factory clones this pure JSON and imports the catalog interface only as a type. It never imports a fixture that reads the runtime catalog, runs a tax calculation during import, or manufactures scalar profits/deductions. This avoids the reverse mixed-C/F fixture import cycle while preserving the original packets.

The fixed metadata retains original source/PDF hashes, actual filer identities, exact repeated-form inventory and all 375 page origins. Individual ownership is checked for 77 first pages of Schedule C, Schedule F, Schedule SE, Form7206 and Form4972 copies. Expected owner identities come from actual public source proprietor/recipient fields and plan business references; independent health copies follow source business-reference order. Original extracted PDF titles independently confirm each first-page form label. The expected inventory is fixed; tests do not create it from the bundle under test.

## Gates and preserved artifacts

The public-source gate executes every registered input, checks empty diagnostics and the source-derived filer, prepares the actual native return, validates the full local `Return1040.xsd`, generates flattened PDFs, checks exact page origins and form titles, and verifies original-owner identities and byte-identical original PDF hashes. The held replay additionally compares original public inputs and all normalized pending values, original source bytes and complete PDF bytes. Original input/XML/PDF artifacts are not overwritten; new packets are written to `/tmp/opentax-reviewed-18-catalog-evidence`.

Terminal proof paths:

- `/tmp/opentax-reviewed-18-catalog-gate-final.log`: terminal20/0: all18 public source/native/full-XSD/PDF packets plus catalog registration and source-owner/copy metadata checks.
- `/tmp/opentax-reviewed-18-catalog-metadata-negatives.log`: source-owner binding and changed/missing form-copy/page-origin rejects.
- `/tmp/opentax-reviewed-18-catalog-entrypoints-final.log`: terminal4/0: four fresh-process imports, including the existing qualified-tip, tip/health and mixed-C/F input modules, initialize the 365-case catalog without a cycle.
- `/tmp/opentax-reviewed-18-catalog-plan.json`: exact planner inventory including all 17 uncovered keys.
- `/tmp/opentax-reviewed-18-catalog-compat.log`: terminal9/0: existing source, page-origin, scope and replay metadata guards.

One retained pending field is explicitly reconciled: `tip-health-advanced-wotc-fully-phased-out` now carries `f1040.form5884_determined_credit = 2400`, absent in its original saved pending. The unchanged issued 6000 qualified wages and 400 hours produce 2400 at40%; the old retained specified-credit amount is also2400. The replay accepts only that specific source-derived projection addition and compares every other pending field. The other17 packets have no pending differences. No public input, filed tax or PDF bytes changed.

The final artifact verifier `/tmp/opentax-reviewed-18-catalog-artifact-verification.log` reopens all18 PDFs (375 pages, zero fields/widgets), proves byte equality and77 source-owner copies, and proves all18 native XML packets differ from originals only in `ReturnTs`. It verifies48 original tip/health/C/F artifact hashes plus4 beneficiary source/PDF hashes; the two beneficiary XML files are read-only and also compared. The separate snapshot manifest `/tmp/opentax-reviewed-18-catalog-evidence/catalog-replay-manifest.json` has SHA256 `9a9ff813ee05350b10c93bd8b73063a2f9c9de0ac6dc88ed073a5f83ff07ef68`.

Historical baseline v1 rejected an unnormalized direct PDF-builder argument; using the prepared bundle's retained pending data corrected the replay harness. Initial gate v1 failed type checking; v2 rejected JavaScript `undefined` fields absent in retained JSON. The final comparison canonically serializes those objects. Gate v3 completed all PDF/native/XSD checks but failed the one newly retained determined-credit field; the final gate documents and derives that exact addition. None of these harness updates changed tax production code, source inputs or expected reviewed bytes.

The originals were previously visually reviewed; byte equality preserves that page review and is not a new visual examination. Broader tax/source combinations, external issuer authentication, the 17 uncovered descriptors and parent tasks remain open. This registration does not claim all-form coverage, IRS acceptance or completion of those tasks.

## Corrected 2025 Form6251 catalog replay

A later filed Form6251 whole-dollar correction changes three previously
reviewed PDF packets while their exact public inputs and original source/PDF
archives remain immutable. The 2025 [Form6251 line7 instructions](https://www.irs.gov/instructions/i6251)
use 26% through $239,100 taxable excess and 28% minus $4,782 above it.
Independent calculations from the current source-backed excesses are
$388,935×28%−$4,782=$104,119.80→$104,120;
$928,692×28%−$4,782=$255,251.76→$255,252; and
$139,745×26%=$36,333.70→$36,334. The old PDFs truncated those TMT
operands by one dollar. Form3800 printed tax-limit intermediates follow the
corrected TMT; Form1040 filed amounts do not change. No source input or tax
production code was changed to recover the old PDF hashes.

The catalog retains every original source and PDF hash and adds an explicit
corrected hash and a complete per-packet pending-field reconciliation only for
`tip-health-advanced-wotc-fully-phased-out`,
`mixed-cf-tip-above-zero-wotc`, and `mixed-cf-tip-owned-health`. Their changed
rendered pages are respectively 12/13/22, 16/17/27, and 18/19/29: the two
Form3800 pages and the Form6251 page. The other 84 rendered pages in those
three packets are pixel-identical to the original archives. All nine changed
pages were reviewed visually. The remaining 15 packet PDFs remain byte-identical
with unchanged page origins and owner inventory.

The exact held-source comparison also records six pending-only updates with
unchanged PDF bytes: four mixed C/F packets carry rounded whole-dollar AMTI and
taxable-excess operands; two partial-beneficiary packets carry the recipient
SSN already present in their retained first Form1099-R copy into the internal
Form4972 source record. The replay derives each operand from the old value or
issued source before reconciling, then compares the entire normalized pending
graph. These changes alter neither printed return nor original source facts.

Private packet/pixel proof: `/tmp/opentax-three-catalog-6251-oct6/.state/research/three-catalog-6251-oct6/`.
The original archives under `/tmp/opentax-qualified-tip-health-evidence` and
`/tmp/opentax-mixed-cf-qualified-tip-evidence` were read only. This remains
local full-XSD/real-PDF evidence; it makes no IRS acceptance or external source
authentication claim.

Corrected held replay log `/tmp/opentax-three-catalog-6251-replay-v2-oct6.log`
is terminal **20/0** (all 18 packet cases plus registration/owner metadata checks,
375 pages), with complete local v5.4 XSD, original source/PDF hash checks,
exact pending reconciliation, current corrected PDF hashes and 93-page
old/current render comparison for the three corrected packets. The 15 other
PDFs are byte-identical. Private `proof-manifest.json` SHA256:
`c503e38226c8588173ddc3425dd5202b9cf178efcf317abe2ca91cd34ef6f9e4`.
