# Income — rental and pass-through inputs

Schedule E and the three K-1s: `schedule_e`, `k1_partnership` (1065),
`k1_s_corp` (1120-S), `k1_trust` (1041). Crosswalk:
[../AGENTS.md](../AGENTS.md).

## Flow

- Nonpassive Schedule E income: `schedule_e`, `k1_partnership` and
  `k1_s_corp` each send `line5_schedule_e` to both `schedule1` and
  `agi_aggregator`. Passive activities go to `form8582` instead, which posts
  the allowed loss to `schedule1.line5_schedule_e`.
- `k1_partnership` box 7 royalties and `k1_trust` rows re-enter `schedule_e`
  (`schedule_es` / `estate_trust_rows`); the other K-1 Part II rows are
  rebuilt for MeF/PDF from K-1 pending by
  `2025/domains/income/rental-passthrough/schedule-e/schedule_e_k1_part2.ts`.
- `k1_partnership` box 10 / box 11 line-10 rows and `k1_s_corp` section 1231
  rows → `form4797`; `k1_s_corp` basis facts → `form7203`, which adds the
  basis-disallowed loss back (`basis_disallowed_add_back` to `schedule1` and
  `agi_aggregator`) rather than reducing the K-1 amount itself.
- The K-1s (each a subset) also feed `schedule_b`, `schedule_d`, `form6251`, `form8995`,
  `form_1116`, `form4562`, `form4952`, `f3800`, `form8582cr`; `schedule_e`
  feeds `form4797`, `form4562` (section 179), `form8990`, `schedule_a`.
- Prior-year Form 8582 facts arrive from `business/f8582_prior_year_record`
  as `filed_2024_form8582_record`.

## Shared modules (group root)

- `k1_passive_eic.ts` — K-1 passive income review for EIC investment income;
  also used by `2025/domains/credits/earned-income/eic/eic_source.ts`.
- `k1_passive_source.ts` — `passiveK1Activities`, imported by both K-1 nodes,
  `form8995`, `form8582cr` and the MeF Form 8582 serializer.
- `k1_s_corp_passive_loss_source.ts` — first-year passive S-corp loss source,
  shared with `form7203` and `form8995`.
- Per-code K-1 sources: `k1_partnership/box11_code_{e,j,k,s}.ts`,
  `box11_line10.ts`; `k1_s_corp/box10_code_j.ts`.

## Traps

- TY2025 domain checks for these nodes sit in other groups:
  `2025/domains/income/business/trust-k1/` (K-1 1041) and
  `2025/domains/income/business/passive_s_corp_loss_*.ts` (K-1 1120-S).

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/income/rental-passthrough`
- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/rental-passthrough`
