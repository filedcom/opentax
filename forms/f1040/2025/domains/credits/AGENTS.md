# 2025/domains/credits

TY2025 source reconciliation for credit forms: `assert*` guards that the
serializers in `../../mef/forms/credits/` and `../../pdf/forms/credits/` import,
staged runners, and full-return tests. For the form-by-form map, see
[../../../nodes/inputs/credits/AGENTS.md](../../../nodes/inputs/credits/AGENTS.md).

## Layout

- `amt/form8801/`: calculation, carry record and MTCNOL/MTFTCE modules, plus
  `form8801_staged_native.ts` and `form8801_staged_pdf.ts`. These are Form 8801's
  only serializers. They are not in `ALL_MEF_FORMS`/`ALL_PDF_FORMS`, and nothing
  outside this folder imports them.
- `business/` → [business/AGENTS.md](business/AGENTS.md);
  `individual/` → [individual/AGENTS.md](individual/AGENTS.md).
- `earned-income/eic/` holds the EIC residency and passive-income checks. The
  group-level `actc_opt_out_source.ts` reads the Form 1040 line 28 election
  from Schedule 8812 source, and the Form 1040 serializers import it.
- `elderly-disabled/` has no form folder. Its Schedule R tests are table-driven
  (`schedule_r_*.fixture.json` + `.test.ts`).
- `foreign/form1116/` holds Form 1116 and Schedule B packets.
  `health/form8962/` holds `*.fixture.json`/`*.expected.json` pairs and Pub 974
  ordering.

## Evidence output

Some variables (`FORM3800_*`, `FORM8582CR_*`, `FORM8835_*`, `FORM8880_*`,
`OPENTAX_FORM1116_*`, `OPENTAX_FORM8839_FOREIGN_PROOF_DIR`) name a directory.
When one is set, its tests write their MeF XML/PDF there for human review. When
it is unset, the tests run the same assertions and write nothing.

Verify: `bun test --timeout=1800000 ./forms/f1040/2025/domains/credits/<group>/<form>/`.
Run `bun run bench --form f1040 --year 2025` when a guard can change a line.
