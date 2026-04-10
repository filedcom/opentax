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

## Cases Added — 2026-04-10T02:30:00
- Source: IRS TY2024 MeF ATS (Modernized e-File Assurance Testing System) — IRS Pub 1436
- Cases:
  - 108-single-w2-schedule-c-se-self-employed-health — Scenario 12 (Sam Gardenia): W-2 $100,836 + Sch C $24,328 + SE tax $3,438 + SEHI $1,000 deduction; all values IRS-stated
- IRS citation: IRS TY2024 Form 1040 MeF ATS Scenario 12, Pub 1436 ATS Guidelines (https://www.irs.gov/pub/irs-efile/)
- Notes: Scenarios 1-4, 7, 8, SR1 had blank 1040 computation lines (DO NOT FILE drafts). Only Scenario 12 had fully filled-in 1040 with IRS-confirmed computed values. VITA Pub 4491 checked as fallback — training guide only, no computed answer key.

---

## [f1040:2025] Round 1 — 2026-04-10
- Baseline: 102 pass / 5 fail (107 total cases after 10 new VITA cases added)
- After fix: 107 pass / 0 fail
- Fixed clusters:
  - savers_credit_overcredit: agi_aggregator not routing AGI to form8880 → always 50% rate
  - w2g_gambling_agi_missing: W-2G winnings not reaching agi_aggregator
  - foreign_tax_credit_missing: schedule3 line1_foreign_tax_1099 not accumulable
  - f2441_dep_care_routing: correct.json missing EITC $415 (engine was correct)

## Cases Added — 2026-04-10T01:55:00Z (mef run)
- Source: IRS MeF ATS (Scenario 12) + VITA Pub 4491 TY2025 illustrative
- Cases:
  - 108-single-w2-schedule-c-se-self-employed-health — W-2 + Sch C + SE tax + self-employed health insurance; IRS MeF ATS Scenario 12 (Sam Gardenia)
  - 109-mfj-w2-ira-deduction-savers-credit — MFJ + IRA deduction + 10% Saver's Credit
  - 110-single-marketplace-excess-aptc-repayment — Single + ACA marketplace + excess APTC repayment (Form 8962)
  - 111-single-schedule-c-sep-ira-qbi — Self-employed + SEP-IRA + QBI deduction
- IRS citations:
  - 108: IRS Pub 1436 ATS Scenario 12
  - 109-111: VITA Pub 4491 TY2025 illustrative (IRC §219, §25B, §36B, §199A)

## Cases Added — 2026-04-10T21:30:00Z
- Source: IRS VITA Pub 4491 TY2025 (supplemented by IRC §72, §86, §172, §469, §74)
- Cases: 112–121

| # | Name | Scenario | IRS Citation |
|---|------|----------|--------------|
| 112 | single-w2-1099r-early-ira-penalty | Single, W-2 + early IRA dist code 1, 10% penalty | VITA ch. 11, p. 11-11; IRC §72(t) |
| 113 | single-1099r-rmd-ssa-senior | Single age 75, RMD code 7 + SSA taxability | VITA ch. 11, p. 11-11; IRC §86 |
| 114 | single-w2-1099r-roth-conversion | Single, W-2 + Roth conversion code 2 (no penalty) | VITA ch. 11, p. 11-8; Pub 590-B |
| 115 | single-w2-schedule-e-rental | Single, W-2 + Schedule E rental income | VITA ch. 12, p. 12-1; IRC §469 |
| 116 | single-1099r-disability-pension | Single, disability pension code 3 (treated as wages) | VITA ch. 11, p. 11-9; IRC §105(d) |
| 117 | single-w2-1099misc-prizes | Single, W-2 + 1099-MISC prizes/awards box 3 | VITA Other Income; IRC §74 |
| 118 | single-w2-schedule-h-household | Single, W-2 + Schedule H nanny wages $12k | VITA; IRC §3101-§3111 |
| 119 | single-w2-nol-carryforward | Single, W-2 + post-2017 NOL carryforward (80% limit) | VITA; IRC §172(a)(2) |
| 120 | single-w2-alimony-received | Single, W-2 + alimony received (pre-2019 decree) | VITA ch. 17, p. 17-1; IRC §71 |
| 121 | mfj-w2-1099r-early-401k-penalty | MFJ, two W-2s + early 401(k) dist code 1, penalty | VITA ch. 11, p. 11-11; IRC §72(t) |

### Engine fixes made while writing cases:
- **Case 116**: f1099r disability-as-wages was not routing to agi_aggregator — fixed
- **Case 118**: schedule_h was not wired as a user-facing input node — registered in inputs.ts
- **Case 120**: alimony_received input node did not exist — created new node + registered
