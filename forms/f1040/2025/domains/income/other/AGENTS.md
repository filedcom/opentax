# Income — other income reconciliation (TY2025)

Schedule 1 Part I (lines 1, 2a, 7, 8a–8z, 9) source checks: Form 1099-G,
Form 982 / 1099-C, alimony, W-2G, SSA/RRB-1042-S. Crosswalk:
[section map](../../../../nodes/inputs/income/AGENTS.md).

## What is here

- `f1099g/f1099g_owner_reconciliation.ts` (`assertPositive1099GOwner`, called
  by the Form 1040 MeF/PDF serializers) and
  `f1099g_unemployment_reconciliation.ts` (`assert1099GUnemploymentSource`,
  both builders).
- `form982/form982_qpri.ts` — `projectQpriForm982`,
  `assertForm982AbsentSource` for the Form 982 serializers (qualified
  principal residence indebtedness).
- `schedule1_*.test.ts` — whole-return replays of Schedule 1 lines: line 9
  tied to printed sources, zero-only Schedule 1 omitted from both outputs,
  1099-MISC box 3 descriptions, 1099-G grants/RTAA, S-corp box 10 code J, and unsourced
  line 8z amounts (golden parachute, at-risk recapture) that must be
  rejected.
- `ordinary_state_refund_source.*` — table-driven Schedule 1 line 1 state
  refund returns (source computation through both exports).
- `w2g_payer_copy.fixture.ts` — W-2G payer copy reused by
  `mef/identity/w2g_payer_copy.test.ts`, `mef/xsd_validation.test.ts` and the
  W-2G PDF reviews.
- `benefit_1042s_source.test.ts` — SSA/RRB-1042-S stays out of ordinary
  benefit income; `alimony_received_route.test.ts` — line 2a.

## Traps

- No guard here owns Schedule 1 itself: the serializer is in
  `2025/mef/forms/general/return-assembly/schedule1/`; Income owns only the
  other-income rows and statements (`2025/mef/forms/income/other/schedule1/`).

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/other`
- `bun test --timeout=1800000 ./forms/f1040/e2e/income/other`
