# TY2026 Archer MSA, Medicare Advantage MSA, and LTC contract

Sources: pinned [2026 draft Form 8853](corpus/draft/f8853.pdf), SHA-256
`9a5755097d1aa1ba5cf6ed91d6ae020cbe5b5e672f3d565af6d2c903174034d3`,
[2026 draft instructions](corpus/draft/i8853.pdf), SHA-256
`b8cf14a2282edd869ba389c423a93d7dc57efc9791e4d10b500531135259ae57`,
and [Rev. Proc. 2025-32](corpus/authorities/rp-25-32.pdf) §4.62 for the
2026 **$430 daily LTC** amount. Recheck final revisions and current MeF
schema/rules before filing.

## Source and filed destinations

| Section | Facts and calculation | Return route |
| --- | --- | --- |
| A Part I, Archer contributions | Establish 2026 MSA eligibility, employer/owner contributions, HDHP deductible and monthly coverage from the line 3 chart, and employer compensation or business earned income. Employer contribution (W-2 box 12 code R) can disallow an owner deduction, with distinct spouse/family rules. Line 5 is the smallest of owner line 2, monthly limitation line 3 and compensation line 4 when allowed. | **Line 5 → Schedule 1 line 23**. Form 8853 **lines 1+2 contributions**, not Section A distributions, feed [Form 8889](FORM8889-GRAPH.md) line 4 HSA limit reduction. |
| A Part II, Archer distributions | Form 1099-SA box 1 gross, valid rollover to MSA/HSA and timely returned excess/earnings on line 6b, qualified expenses, and taxable line 8. Distinguish taxable distributions with a death, disability or age-65 exception from those without it. | **Line 8 → Schedule 1 line 8e**; line 9b 20% tax on only nonexcepted taxable amounts → **Schedule 2 line 13e**. |
| B, Medicare Advantage MSA | By beneficiary, gross 1099-SA distribution less qualified expenses gives line 12 taxable. Death/disability exceptions apply to the 50% tax. If a Medicare Advantage MSA existed on **December 31, 2025**, use the instructions' Additional 50% Tax Worksheet: compare its year-end value with 60% of the January 1, 2026 HDHP deductible before taxing the residual. Age 65 alone is not an exception here. | **Line 12 → Schedule 1 line 8e**; line 13b → **Schedule 2 line 13f**. Preserve prior-year MSA value and January deductible. |
| C, LTC and accelerated death benefits | One insured/policyholder record per Section C, with 1099-LTC per-diem payments, qualified contract status, terminal/chronically ill certification, period days, qualified costs and reimbursements. For each LTC period, line 21 = $430 × days; line 25 = max(line 21, costs) − reimbursements; line 26 is taxable payments after the limitation. Terminal-only accelerated benefits may take the printed zero shortcut. Multiple payees require an aggregate statement and insured-first/pro-rata allocation of the shared limit. | **Line 26 → Schedule 1 line 8e** for 1040 filers. If more than one Section C is attached, mark its checkbox and include each statement. Nonqualified-contract taxable benefits follow the instructions' separate income route. |

The draft has a coversheet and two printed form pages. The [PDF inventory](pdf-fields-f8853.csv)
has **38 widgets**, all in the canonical field tree, including Section A/B
exception boxes, Section C insured/policyholder IDs and yes/no answers, and
the additional-Section-C checkbox. Produce repeated attachments and LTC
allocation statements where required; a single two-page PDF cannot
represent every spouse/insured/payee case.

## Current code boundary

- Shared `form8853` accepts one aggregate record. It cannot model distinct
  account holders, monthly Archer eligibility, both-spouse employer rules,
  multiple Medicare Advantage MSAs, death-beneficiary statements, per-insured
  LTC periods or multiple payee allocations. Line 3 is accepted as a
  precomputed amount with no source proof; line 4 compensation can default
  to infinity, allowing a deduction without the printed cap.
- Its `archer_msa_distributions` is a Section A Part II amount; the [shared
  Form 8889 node](../../forms/f1040/nodes/intermediate/forms/form8889/index.ts)
  erroneously names that field as the HSA line 4 limit reduction. The 2026
  route must send actual Form 8853 lines **1 and 2** contributions.
- It sends Schedule 1 income/deduction using shared old targets. Its tax
  output uses TY2025 keys `line17e_archer_msa_tax` and
  `line17f_medicare_advantage_msa_tax`, while the dedicated 2026 Schedule 2
  requires `line13e_archer_msa_tax` and
  `line13f_medicare_advantage_msa_tax`. Exception booleans currently zero
  all penalty tax, even when only some taxable distributions qualify.
- The Medicare Advantage penalty is always a simple 50% of taxable
  distributions and omits the year-end-2025/January-2026 worksheet. LTC
  computation assumes one period and no other payees; it does not emit
  full Form 8853 line values or required answers/statements.
- TY2025 PDF and MeF descriptors map a subset of raw source fields. The
  2026 form has 38 fields plus repeat/statement obligations; audit each
  destination against its printed line and current XSD. `form8853` is not
  in the TY2026 registry or public inputs.

## Build and acceptance order

1. Add owner/account-keyed MSA contributions, distributions, coverage and
   compensation facts, including W-2 code R and 1099-SA classification;
   add per-insured LTC contract/payment/period/payee records with dates,
   certifications and prior-year MSA value when applicable.
2. Derive Archer line 3 from 12 monthly worksheet rows; calculate the
   proper spouse employer restriction and line 5. Send lines 1+2 to
   Form 8889 line 4, line 5 to Schedule 1 line 23, and taxable MSA/LTC
   amounts to line 8e. Split 20%/50% taxes to 2026 Schedule 2 lines
   13e/13f, including partial exceptions and the Medicare Advantage
   prior-year worksheet.
3. Render all applicable 2026 Form 8853 copies and LTC allocation
   statements, then map current TY2026 MeF groups/cardinality and active
   rules. Reconcile Sections A/B/C, Schedule 1, Schedule 2, Form 8889 and
   the 1040 before considering the return filed.
4. Test joint self-only vs family Archer coverage, employer code R,
   owner contributions made in early 2027 for 2026, MSA-to-HSA rollover,
   mixed taxable/excepted Archer and Medicare Advantage distributions,
   December 31 MSA value/January deductible, two LTC periods, terminal-only
   benefit, nonqualified contract, and multiple LTC payees with the required
   statement. Run TY2025 regressions on any shared source changed.
