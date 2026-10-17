# 2025/domains/general/

TY2025 source guards for General forms and the whole Form 8886 pipeline.

- `return-assembly/` — Form 1040 guards. The MeF and PDF `f1040` serializers
  import `filing-status/*_source.ts` (HOH/QSS child),
  `line12a_dependent_source.ts`, `presidential_campaign_source.ts` and
  `resident_election_source.ts`. `filer_source_reconciliation.ts` (identity,
  K-1, Schedule C, statutory W-2 and EITC-child guards) is also called by
  `../../index.ts`, both builders and `mef/submissions/submission_archive.ts`.
- `filing/form8886/` — the `f8886` node. It is a legacy `TaxNode` in
  `public_node.ts`, baselined in `scripts/testing/structure-baseline.json`,
  with `outputs: []`. `../../index.ts` calls `preparePublicForm8886Return`
  (`public_return.ts`), which replays the inputs, then `return_packets.ts` and
  the `*_source.ts` reconcilers.
  - MeF: `mef_descriptors.ts` (`Form8886PendingKey`, registered in
    `../../mef/forms/index.ts`); it builds only from authenticated packets.
  - PDF: `pdf.ts` fills the embedded `fixtures/f8886-2019.pdf`, whose SHA-256
    is in `fixtures/README.md`.
  - OTSA copies: `otsa_export.ts`, used by `cli/commands/form8886-otsa.ts`.
- `foreign/` — Forms 5471, 8854, 8858; see [foreign/AGENTS.md](foreign/AGENTS.md).

## Verify

- `bun test ./forms/f1040/2025/domains/general --timeout=1800000`. Without
  the private `.state/research/docs/IMF_Series_2025v5.4/` XSDs, 18 HOH/QSS and
  Form 8886 XSD tests fail with "Failed to locate the main schema resource"
  (count at the time of writing). They do not skip; report them as
  unverified, not as regressions.
- `bun run check:structure` (the baselined `f8886` node).

Section map: [../../../nodes/inputs/general/AGENTS.md](../../../nodes/inputs/general/AGENTS.md)
