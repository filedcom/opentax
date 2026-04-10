# Tax Harness Progress Log

Append-only log of harness runs and outcomes.

---

## Cases Added — 2026-04-10T00:00:00
- Source: IRS VITA Pub 4491 TY2025 (illustrative cases)
- Cases:
  - 98-single-w2-savers-credit-50pct — Saver's Credit 50% (401k Box 12 D)
  - 99-single-w2-savers-credit-20pct — Saver's Credit 20% (401k Box 12 D)
  - 100-single-w2-gambling-winnings — W-2G gambling, Schedule 1 Line 8b
  - 101-mfj-w2-itemized-mortgage-salt-charity — Schedule A itemized (SALT+mortgage+charity)
  - 102-single-w2-residential-clean-energy-solar — Form 5695 §25D 30% credit
  - 103-mfj-w2-savers-credit-10pct — Saver's Credit 10% MFJ (401k Box 12 D)
  - 104-single-w2-lifetime-learning-credit — Form 8863 LLC $2,000 nonrefundable
  - 105-single-w2-foreign-tax-credit-de-minimis — FTC $120 de minimis (Schedule 3)
  - 106-hoh-w2-child-dep-care-credit — Form 2441 dep care + CTC → $0 tax
  - 107-mfj-w2-energy-efficient-home-improvement — Form 5695 §25C $2,600 credit
- IRS citations: VITA Pub 4491 TY2025 modules: Saver's Credit, Other Income, Deductions, Energy Credits, Education Credits, Foreign Tax Credit, Child and Dep Care Credit

---

## [f1040:2025] Round 1 — 2026-04-10
- Baseline: 102 pass / 5 fail (107 total cases after 10 new VITA cases added)
- After fix: 107 pass / 0 fail
- Fixed clusters:
  - savers_credit_overcredit: agi_aggregator not routing AGI to form8880 → always 50% rate
  - w2g_gambling_agi_missing: W-2G winnings not reaching agi_aggregator
  - foreign_tax_credit_missing: schedule3 line1_foreign_tax_1099 not accumulable
  - f2441_dep_care_routing: correct.json missing EITC $415 (engine was correct)
