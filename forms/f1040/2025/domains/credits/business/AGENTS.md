# domains/credits/business

TY2025 reconciliation for general business credits: guards, staged sources and
full-return tests, by form. Crosswalk:
[../../../../nodes/inputs/credits/AGENTS.md](../../../../nodes/inputs/credits/AGENTS.md).

## Forms

- `form3800/`: `form3800_final_credit_join.ts`
  (`assertForm3800FinalCreditJoin`: Form 3800 line 38 → Schedule 3 line 6a →
  line 8 → Form 1040 line 20, checked to the cent). Most credit PDFs
  (`../../../pdf/forms/credits/**`) and the MeF `f3800` import it. This folder
  also holds the full-return tests for Form 8835 (`form8835_*`) and Form 8911
  (`form8911_*`), plus carryforward, rounding and Part V/VI tests.
- `form8582cr/`: `reconcileFiledForm8582CROrdinary`, used by the MeF/PDF
  `f8582cr` and the PDF `f3800`. `form8582cr_k1.fixture.ts` feeds
  `2025/pdf/review_fixtures.ts`.
- `form8864/`, `form8994/`: direct producer/employer joins (Schedule C income
  or wage reduction, Form 3800, AMT exclusion for 8864). The MeF and PDF
  `f3800` import them.
- `form8908/`: `form8908_source.ts` holds `calculateForm8908Source`. The
  `f8908` input node imports it, and so do the staged MeF `f8908*.ts` modules.
- `form3468/` (trust Part V), `form6478/`, `form8826/`, `form8874/`: these
  folders hold tests only, run through the public return.

## Data flow tested here

Source node → `form8582cr` (passive) or `disabled_access_limit` (8826) →
`f3800` typed sources → `f1040` sink Part II limit → `allowed_credit` and
Schedule 3 line 6a → Form 1040 line 20. The MeF `f3800` serializer checks
filing status and the attached 8582-CR against the filed pending, then calls the
join guard. Any mismatch throws.

## Traps

- A node importing from `2025/domains` (`f8908` → `form8908_source.ts`) goes
  the opposite way from the layering in `../../AGENTS.md`. Don't add more of
  these.
- `form8582cr_test_pending.ts` is a test-only helper.

Verify: `bun test --timeout=1800000 ./forms/f1040/2025/domains/credits/business/<form>/`.
