# Income — foreign reconciliation (TY2025)

Form 8621 (PFIC), Form 8992 (GILTI) and Form 2555 checks. Crosswalk:
[section map](../../../../nodes/inputs/income/AGENTS.md).

## What is here

- `form8621/form8621_1294_refigure.ts` — `applyForm8621QefRefigure`: for an
  `f8621` item with `qef_1294_election`, reruns the whole return without the
  deferred income and records the per-fund deferred tax. `2025/index.ts`
  wraps every non-Form-8990 return in it (a no-op without an election);
  `return-processing/composed_source_return.ts` also calls it.
  `form8621_1294_allocation.ts` (`form8621ElectionBTaxForHolding`) splits
  that tax for the MeF/PDF Form 8621.
- `form8621/form8621_parent_source.ts` — parent source packet projection and
  prior-distribution reconciliation for the 8621 serializers and statements.
- `schedule1_form8621_source.ts` — `assertSchedule1Form8621Source`: Schedule 1
  `line8z_form8621_{qef,mtm,section1291}` must match retained 8621 sources;
  called by both builders.
- `form8992/form8992_source.ts` — `projectForm8992Source` derives Form 8992
  from the General `f5471` node (`calculateCategory5Inclusions`); used by the
  8992 and 5471 serializers. `form8992.fixture.ts` is the shared CFC packet
  for the `mef/forms/general/foreign/f5471/` tests.
- `schedule1a_form2555_overtime.test.ts` — Form 2555 plus W-2 overtime through
  Schedule 1-A Part I MAGI (Deductions effect).

## Traps

- Election B refigure tests compose with other staged returns (Forms 8839,
  8863, AMT, credit carryforwards: `form8621_1294_*_refigure.test.ts`);
  `applyForm8621QefRefigure` throws with `form8990` present.
- `form8621/form8621_qef.fixture.ts` supplies a PDF review fixture
  (`form8621QefReviewFixture`) imported by `2025/pdf/review_fixtures.ts`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/foreign`
- `bun test --timeout=1800000 ./forms/f1040/e2e/income/foreign`
