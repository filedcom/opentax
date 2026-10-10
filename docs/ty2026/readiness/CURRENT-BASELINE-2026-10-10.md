# TY2026 implementation assessment from current main

Assessed October 10, 2026, at base commit `8f5055950`.
Worktree: `/Users/atul/projects/opentax-ty2026`.
Branch: `codex/ty2026-readiness`.

Scope: federal **tax year 2026** Form 1040 returns (normally filed in 2027),
building on the existing OpenTax federal 1040 product. This is an implementation
assessment, not a claim that 2026 returns can currently be calculated or filed.
The original worktree and its uncommitted work were not modified or copied.

## What exists today

| Surface | Verified current state | Implication |
| --- | --- | --- |
| Product catalog | `catalog.ts` contains only `f1040:2025`. | No supported 2026 product. |
| Configuration | `forms/f1040/nodes/config/index.ts` contains only 2025. | Shared year-aware nodes cannot yet obtain 2026 constants. |
| Calculation graph | The loaded 2025 registry has **221** keys; `forms/f1040/2026` is absent. | The September research's 191-node baseline is stale. |
| Return creation | `createReturnCommand({year:2026,...})` succeeds, but `getReturnCommand` throws `Unsupported form: f1040:2026`. | Creating metadata does not establish year support. Add catalog validation before creating files when implementing the product boundary. |
| Product interface | `FormDefinition` now owns `executeReturn`, `prepareReturn`, and output builders; some shared types still import 2025 MeF types. | Integrate with the present source reconciliation and prepared-document contract. |
| CLI summary | `cli/commands/return.ts` reads 2025-shaped AGI/tax keys and imports 2025 pending normalization. | Move year-specific projections behind the selected definition or explicit year adapters. |
| Submission manifest | `forms/f1040/2025/mef/submissions/submission-archive.ts` writes 2025 year and period dates. | A 2026 return needs a year-correct archive path as well as XML. |
| Research | `docs/ty2026` contains source manifests, form/graph maps, PDF inventories, ATS plans and implementation notes. | Reuse the source work, but revalidate executable-code and readiness claims. |

The runtime observations above came from a Deno smoke check importing the catalog,
configuration and return commands. It used a temporary return directory, which
was removed afterward. No full regression run was needed for this documentation
assessment; no calculation code was changed.

## Recoverable prototype

The research commit **`b7c07b616`** (`docs: record TY2026 research handoff audit`)
is present in the local object database. `git ls-tree` shows **107 files** under
`forms/f1040/2026`, including graph/input definitions, calculation nodes, PDF
builders and tests. Its configuration barrel also imports a 2026 config.

Inspect it with:

```sh
git ls-tree -r --name-only b7c07b616 forms/f1040/2026
git show b7c07b616:forms/f1040/2026/registry.ts
git show b7c07b616:forms/f1040/nodes/config/2026.ts
```

Use this as a porting source, not a wholesale replacement for current main.
Its registry imports older paths such as `nodes/inputs/general/index.ts`; the
current tree has reorganized domains and substantial later source validation,
credit ordering and printable-document work. Port individual 2026 components,
their tests and required shared-node deltas while retaining current 2025 behavior.
The historical prototype was inspected, not restored or executed in this audit.

## Drive package and current IRS gate

The supplied [Drive folder](https://drive.google.com/drive/folders/1JGK9Tp-9jPX7Cg1xFFKPVBRIYJFvyIlR)
was inspected through folder fetch. It lists 19 direct children, including
[`IMF_05-28-2026_Release-2.zip`](https://drive.google.com/file/d/1ytwN79sy-XY0mMgXlLWA1hH1MSDR_fed/view)
(24,118,850 bytes), IRIS and BMF packages, and older releases. No later 2026 IMF
package appeared in that listing. The connector's search returned only four
release-note files, so search alone was not a complete folder inventory.

The existing [source ledger](SOURCES.md) records that May IMF ZIP's hash as
`8408dbd9f7ae0040bc588b8daa3b7bb24280c8ca5b2396d9fcfb8c4db64963f4`
and its contents as 2026v1.0 schemas/rules. This audit reconfirmed the Drive file's
identity/size and obtained a raw-file reference; it did not independently rehash
or re-extract the archive. Verify the hash before consuming it for implementation.
IRIS information-return and BMF business-return packages are separate products;
their presence does not supply a newer individual 1040 schema.

The [IRS TY2026 schema release table](https://www.irs.gov/tax-professionals/tax-year-2026-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions)
was checked on October 10:

- 2026v1.0: May 28 release; not valid for ATS or production.
- 2026v3.0: August 13 release; ATS date October 13; not valid for production.
- 2026v4.0: September 24 release; ATS date November 1; production date TBD.

Target the current authorized 1040 package and record the exact version/hash.
The May package is useful for discovery, but cannot establish filing readiness.
Obtaining the current package through authorized e-Services/SOR is an external
dependency for final XML/rule conformance. Calculation and draft-PDF work can
proceed while that dependency is outstanding.

## Recommended implementation order

1. **Reconcile sources and salvage the prototype.** Compare the historical
   2026 components with the current 221-node registry. Give each current input,
   calculation and filed document an explicit 2026 disposition: port, share with
   year rules, replace, obsolete, or unsupported. Refresh publication/version
   evidence before accepting numeric values. Repair the inventory tooling before
   regenerating ledgers: `tooling/build_inventory.py` still resolves `ROOT` to
   `docs` and `OUT` to `tooling`, and reads files using pre-reorganization paths.

2. **Deliver a bounded calculation milestone.** Port the 2026 constants,
   identity/year rules, general/W-2 inputs, deductions, tax calculation and 1040
   settlement graph. Add an explicit supported-input boundary. Prove a wages-only
   return and relevant boundary cases through execution and year-correct summary.
   Unsupported credits, businesses or carryovers must fail clearly. If exposed
   before filing outputs are ready, label this calculation-only and explicitly
   reject unsupported exports; do not silently reuse 2025 output builders.

3. **Port the changed tax routes in dependency order.** Use the existing graph
   plans as review queues: income and AGI; standard/itemized/nonitemizer charitable
   deductions and Schedule 1-A; tax and Schedule 2; dependent/education/care and
   other credits; refundable credits, payments and settlement. Then add investment,
   retirement, business/passive/foreign and carryforward routes. Review the planned
   Schedule 3-A/Form 1062 and all changed line meanings against the selected source
   revisions. Treat the older research's “implemented” notes as historical until
   the current port passes source-based tests.

4. **Build matching PDF, MeF, validation and archives.** Create year-specific
   attachment registries and mappings from the selected forms and current XSD.
   Preserve source ownership and the prepared-document contract. Ensure 2026 year,
   namespace/version, XML order, header, line keys, binary references, manifest and
   tax-period dates agree. Keep draft forms explicitly separate from final filing
   outputs. Catalog registration alone is not acceptance evidence.

5. **Prove public workflow and regression.** Exercise create → input → calculate/
   summary → validate → PDF/XML → submission ZIP. Use independently derived ATS
   expectations, line/attachment reconciliation, current-schema and business-rule
   checks, rendered PDF review and new-rule boundary cases. Run the required 2025
   regression gates for changed shared code. Record actual IRS ATS acknowledgments
   separately from local validation and wait for published production eligibility.

The first coding unit should be the prototype/configuration port plus the bounded
wages-only calculation route, with explicit unsupported-export behavior. Full
parity is a staged migration across calculation, source records and filed outputs;
changing a year constant or adding a catalog alias cannot provide it.

Continue with [IMPLEMENTATION.md](IMPLEMENTATION.md),
[PRODUCT-ASSEMBLY.md](PRODUCT-ASSEMBLY.md), and [PARITY-QUEUE.md](PARITY-QUEUE.md),
using this current-baseline assessment to correct their historical code claims.
