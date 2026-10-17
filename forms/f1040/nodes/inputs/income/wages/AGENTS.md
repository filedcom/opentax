# Income — wages inputs

Form 1040 lines 1a–1i from employment: `w2`, `f4852` (substitute W-2/1099-R),
`household_wages` (line 1b, employee side; employer Schedule H is in Taxes)
and `clergy`. Crosswalk to MeF/PDF/domains: [../AGENTS.md](../AGENTS.md).

## Flow

- `w2` is the widest fan-out in the section (22 targets): wages and
  withholding to `f1040`/`agi_aggregator`; box 12 code D excess deferral to
  line 1h (`codeDExcessDeferral`); code Q combat pay to line 1i; statutory
  employee box 1 to `schedule_c` as `statutory_w2_sources` (Schedule C must
  hold one matching business with equal receipts); box 12 A/B/M/N
  (uncollected FICA), K and Z (excises) to `schedule2`; Medicare and tip
  facts to `form8959`, `form4137`, `form8919`; other box 12 codes to Credits
  and Adjustments nodes (`form8880`, `form8889`, `form8839`, …).
- `f4852` imports `../w2` and `../../retirement/f1099r`. With
  `reviewed_source` it re-emits rows into those input nodes as
  `substitute_w2s` / `substitute_f1099rs`, which their schema transforms
  merge into `w2s` / `f1099rs`. Without it, it writes `f1040` lines and
  `form8959`/`form5329` directly (legacy path).
- `household_wages` → `f1040` line 1b, `agi_aggregator`, `form8959`.

## Traps

- `clergy` always throws: it lacks the W-2, housing designation and Form
  4361 facts needed to file. Do not "fix" it by routing amounts.
- W-2 community-property allocation (`communityW2Fields`) requires a full
  2025-01-01..2025-12-31 period; see `w2/community_property.test.ts`.
- Box 12 codes are `Box12Code` with `z.nativeEnum`; extend the enum, not a
  string.
- The W-2 MeF serializer and rules live under `other/`, not `wages/`:
  `2025/mef/forms/income/other/w2.ts`, `validation/rules/income/other/fw2.ts`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/income/wages`
- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/wages`
  (XSD-backed cases fail without the private `Return1040.xsd`).
