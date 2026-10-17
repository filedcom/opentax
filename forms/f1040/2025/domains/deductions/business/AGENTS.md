# 2025/domains/deductions/business

Reconciliation and return tests for Forms 4562, 8829, 8990, 8995, 8995-A
(nodes: `forms/f1040/nodes/intermediate/forms/deductions/business/`).
Section map: [../../../../nodes/inputs/deductions/AGENTS.md](../../../../nodes/inputs/deductions/AGENTS.md).

## Forms and how they connect

- `form4562/` — tests and fixtures only; fixtures reuse Form 8911/3800 sources
  from `../../credits/business/form3800/`. The §179 business-income limit is
  checked at export by MeF `f4562.ts` against pending `schedule_c`,
  `schedule1`, `f1040`.
- `form8829/` — fixture + test for the one rented-home route (`form_8829` →
  `schedule_c` `form8829_line30`).
- `form8990/form8990_projection.ts` — `projectForm8990ForExport`; used by
  `executeReturn` (`../../../index.ts`) after the two-pass run, MeF/PDF
  `f8990.ts`, and `cli/store/form8990-workpaper.ts`.
- `form8995/` — `assertFarmWotcReturn` is shared beyond QBI (MeF/PDF
  `schedule_c.ts`, `schedule_f.ts`, `f5884.ts`); `assertQualifiedTipQbiSource`
  ties Schedule 1-A business tips to QBI (MeF `f8995_route.ts`,
  `f8995_joint_owner.ts`, `f8995a.ts`).
- `form8995a/` — one guard per filing route of the `form8995a` node: patron →
  Schedule D (`form8995a_patron_reconciliation.ts`, which calls the
  independent-patron one), aggregation → Schedule B (`aggregationOwner`),
  SSTB → Schedule A, losses → Schedule C, plus WOTC, mixed fishing, producing
  mining, single farm. `assertSingleFarmQbiReturn` runs on the whole pending
  graph in every `../../../mef/builder.ts` and `../../../pdf/builder.ts` build.

## Traps

- `form8995` hands off to 8995-A above the threshold or for any patron review,
  so most QBI return tests live in `form8995a/`.
- `form8995a/` fixtures are `*.fixture.ts` / `*.expected.ts` plus
  `form8995a_rpe_*_source.json` inputs;
  `form8995a_sstb_service_checks.ts` is a test registrar, not a guard.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/deductions/business/<form>/`
