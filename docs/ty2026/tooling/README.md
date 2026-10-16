# Current runtime inventory

Run from any directory using Python 3.9+ and the repository's Deno installation
(use an absolute script path when outside the repository):

```sh
python3 docs/ty2026/tooling/build_inventory.py
python3 docs/ty2026/tooling/build_inventory.py --check
python3 -m unittest discover -s docs/ty2026/tooling -p 'test_inventory.py'
```

Dependencies must already be present in Deno's cache. The runtime probe uses
`--cached-only --frozen --allow-read`: it loads registries and their declared
metadata, without executing returns, fetching templates or editing tax code.
All inputs are validated before output files are written. `--check` exits 1 if
any generated file is missing or differs; it writes no inventory files. Unknown
registry syntax, unresolved imports, changed object identities, duplicate keys
and orphaned review notes fail instead of producing a partial ledger.

The generator resolves its repository root from its own location. Outputs belong
in `docs/ty2026/inventories`; the corpus and readiness notes retain their existing
folders. This fixes the old pre-reorganization path assumptions.

## Generated evidence

The October 16 refresh loads 223 TY2025 nodes, 118 PDF descriptors and 158 MeF
descriptors from 154 modules. It also loads 53 TY2026 nodes with 276 unique declared
edges, including 19 edges to unregistered targets. Counts are recorded in
[`runtime-surface.json`](../inventories/runtime-surface.json), not hardcoded in the
generator. Regeneration follows the checkout, including future main changes.

- Node sources come from imported registry bindings; every imported node is
  compared by object identity with the loaded registry. The two explicit start
  factory declarations are supported separately and point to their imported
  factory modules (which may re-export the shared implementation).
- PDF and MeF coverage comes from the actual descriptor arrays, including nested
  modules, descriptors outside the `forms` directories, and multiple descriptors
  exported by one module. Runtime object identity and array order are checked.
- Node PDF/MeF columns use exact runtime pending-key equality. They do not infer
  a relationship from a filename or certify upstream source ownership. A `no`
  can mean that a different node produces the filed document. Draft availability
  uses the manifest's downloaded draft-form slugs, not final instruction status.
- `graph-routes.csv` contains every unique declared source/target pair;
  `graph-route-gaps.csv` contains the subset with an unregistered target. These
  are wiring review leads. A declared edge can carry only context; calculations
  can also be implemented inside a combined adapter. Inspect actual execution
  and source rejection before treating a missing target as a lost tax value.
- `year-literals.csv` scans non-test modules under `forms/f1040/nodes`, excluding
  configuration. It includes comments and fixtures and does not scan every
  transitive helper, the year directories or source authority.

## Review ownership

[`node-review.csv`](../inventories/node-review.csv) is the sole manually maintained
source for priority, disposition and next-action notes. The generator preserves
it; edit it when advancing a route, then regenerate `node-coverage.csv`. Existing
191 notes were carried over exactly, including their unresolved work. They are
historical review context and must be checked against the current implementation.

The 32 newer nodes receive `audit-required` and an explicit unassigned next action
in generated coverage. Their keys appear under `nodes_without_review_notes` in
the runtime snapshot. Add a reviewed owner/action to `node-review.csv` as each is
triaged. Removed nodes with remaining annotations fail generation, requiring an
explicit decision about whether to migrate or retire their notes.

No registration count, same-name match, draft slug, annotation or successful
generator run proves 2026 parity. Source branches, cross-form calculations,
carryforwards, rendered documents, current MeF and rules, public workflows and
IRS ATS acceptance retain the gates in the implementation plan.
