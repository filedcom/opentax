# Income — foreign inputs

Foreign income sources: `f8621` (PFIC/QEF), `fec` (foreign employer
compensation, Form 1040 line 1h) and `f8873` (extraterritorial income).
Form 2555 is computed in `intermediate/forms/income/foreign/form2555` (also a
CLI input); Form 8992 is projected from `f5471` in General. Crosswalk:
[../AGENTS.md](../AGENTS.md).

## Flow

- `fec` → `f1040.line1h_other_earned` and `agi_aggregator` (same field), and
  foreign tax on wages → `form_1116` (general category; the comment in
  `fec/index.ts` explains why the §904(j) de minimis election does not apply).
- `f8621` → `schedule1` and `agi_aggregator` with the same line 8z fields
  (`line8z_form8621_qef`, `_mtm`, `_section1291`); QEF capital gain →
  `schedule_d.line_11_qef_lt`; MTM disposition losses → `form8949`;
  nonexcess distributions → `schedule_b`, `form8960`; section 1291 tax on
  excess distributions → `income_tax_calculation.form8621_tax` and its
  interest → `schedule2.line17p_form8621_interest`; prior section 1294
  deferred tax/interest → `schedule2` lines 17z/17q. It also writes a
  pending-only `form8621` row (`{ items: lines }`) for the MeF/PDF
  descriptors.
- Section 1291 math is in `f8621/excess_distribution.ts`
  (`calculateExcessEvents`, `calculateSection1291Interest`), MTM in
  `mtm_disposition.ts`, section 1294 in `section1294.ts`.

## Traps

- An `f8621` item with `qef_1294_election` triggers a whole-return refigure
  (`applyForm8621QefRefigure`, `2025/domains/income/foreign/form8621/`) from
  `2025/index.ts`; with `form8990` present the return is rejected.
- `f8873` always throws: no reviewed TY2025 filing route.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/income/foreign`
- `bun test --timeout=1800000 ./forms/f1040/nodes/intermediate/forms/income/foreign`
- `bun test --timeout=1800000 ./forms/f1040/e2e/income/foreign`
