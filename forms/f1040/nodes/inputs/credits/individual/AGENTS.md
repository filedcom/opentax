# credits/individual inputs

Personal nonrefundable and refundable credit sources: `f2441`, `f5695`,
`f8834`, `f8859`, `f8862`, `f8863`, `f8912`, `f8936`. Their computed partners
(`form2441`, `form5695`, `form8396`, `form8839`, `form8880`) are in
`../../../intermediate/forms/credits/individual/`. Crosswalk: [../AGENTS.md](../AGENTS.md).

## Routes

- Final on Schedule 3 here: `f2441` → line 2 (+ `f1040` `line1e_taxable_dep_care`);
  `f8863` → line 3 and `f1040` `line29_refundable_aoc`; `f5695` → `form5695`
  → lines 5a/5b; `f8936` personal → line 6f (new) / 6m (previously owned).
- Finalized later in the `f1040` sink: `f8834` (`form8834_source_credit`),
  `f8859` (`form8859_source_carryforward`), `f8912` (`form8912_source_lines`,
  using `f8912/calculation.ts`). Each also sets a
  `form88xx_source_credit_pending` flag on `schedule3`, and `f8834`/`f8912`
  set `form6251` flags. Sink order: 8880, 8834, 8936, 8396, 8859, 3800, 8912.
- `f8862` only gates: `form8862_filed` on `eitc`, `f8812`, `f8863`.
- `f8936` business/commercial use → `f3800`; a dealer-transferred credit with
  no allowable credit → `schedule2` line 1b/1c repayment.
- `f8912` also reports bond interest on `schedule_b`.

## Traps

- `f8863` has three CLI keys in `2025/inputs.ts`: `f8863` (array of students),
  `f8863_claimant_review` and `f8863_credit_limit_worksheet`; the review
  schemas live in `f8863/claimant_review.ts` and `business_review.ts`.
- The sink throws when `f8834` combines with `f8859` or `f8936`
  ("needs a joint credit-ordering calculation"), and when Schedule 3 line 6i
  is prefilled alongside an `f8834` source.
- `f8862/prior_notice_byte_binding.ts` binds the prior IRS notice copy; see
  `docs/ty2025/domains/credits/individual/form8862/`.

Verify: `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/credits/individual/<node>`,
then the matching Sch 3 replay in `2025/domains/credits/individual/`.
