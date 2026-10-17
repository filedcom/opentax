# nodes/inputs/general/filing/

Filer identity and filing-level requests. Only three nodes route:

- `general` — filing status, identity, address, dependents and review flags.
  It feeds 18 nodes in every section. Other modules reuse its exported
  helpers (`filedDependentsFromGeneral`, `hohQualifyingChildFromGeneral`,
  `qssNonclaimedChildFromGeneral`, `dependentFilingSchema`); users include
  `2025/domains/general/return-assembly/*` and PDF
  `dependent_continuation.ts`. `filer_eligibility.ts` decides the CTC/ODC/EITC
  SSN and TIN-timing tests.
- `preparer` — `preparer_*` fields to `f1040`, read by
  `forms/f1040/mef/filer.ts` for the MeF header.
- `f8958` — `{ f8958_allocation }` to Income `w2`; the schema and
  `prepareF8958Allocation` are in `source.ts`. `staged_documents.ts` is used
  only by its own test.

`schedule_lep` and `f9000` take `{ requests }`, one per `person`, with
`request_confirmed_by_person: true` and a record reference. Their MeF
serializers take the name and SSN from the filed header and reject a spouse
request on a non-joint return. A Schedule LEP cancel (`000`) requires
`prior_election_review`; any other code forbids it.

Export blocked (`attachment_coverage.ts`): `f8958`, `f1310`, `f2120`,
`f8332`, `f8867`, `amendment_request`. Not exported at all (separate
filings or statements): `f56`, `f8822`, `f8840`, `f8843`, and the
not-CLI-input `f14039`, `f911`, `f114`.

Traps:

- `start.ts` reads `general.filing_status` and both SSNs to build
  `owner_identity` for `schedule_se`, `w2`, `f4852`, `schedule_c` and
  `schedule_f` on MFJ returns with Schedule C or F.
- `general/index.ts` imports `2025/domains/credits/health/form8962/`, so this
  shared node depends on TY2025 code.

## Verify

- `bun test ./forms/f1040/nodes/inputs/general/filing --timeout=1800000`
- After changing `general`: `bun run check:cases`,
  `bun run bench --form f1040 --year 2025`, `bun run check:oracle`.

Section map: [../AGENTS.md](../AGENTS.md)
