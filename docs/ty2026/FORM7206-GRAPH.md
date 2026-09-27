# TY2026 self-employed health insurance deduction contract

Sources: pinned [2026 draft Form 7206](corpus/draft/f7206.pdf), SHA-256
`66d95039b0ee96857505db5b2d3882c51082a73ea70d532bd94dacddb2156700`,
and [2026 draft instructions](corpus/draft/i7206.pdf), SHA-256
`0b06657958a23088806040d89fe8ff66ff1b28742eec5f5c21fb0d6e67376ff4`.
The pinned [2025 Publication 974](corpus/authorities/p974--2025.pdf), SHA-256
`e17265a7ff82e0b2541dbf7bd90797bdaa1eb5678c3d23d059f42939274f0845`,
is **only a prior-year comparator** for the Marketplace premium-tax-credit
loop. Obtain the 2026 publication or updated IRS method before finalizing
that branch, then recheck final forms and current MeF rules.

## Per-business calculation and return destinations

Use a separate Form 7206 for each trade or business under which an insurance
plan was established. Preserve `ownerId`, `businessId`, `planId`, premium
month and covered-person ID through the calculation. A spouse's business or
S corporation is not interchangeable with the taxpayer's Schedule C/F or
partnership activity.

| Form line | Source and rule | Destination |
| --- | --- | --- |
| 1 | 2026 medical/dental/vision premiums for eligible months under that business plan. Exclude months with eligibility for a subsidized employer plan, including a spouse/dependent/under-27 child's employer; exclude nontaxable retired-public-safety-officer amounts. Marketplace premiums require the PTC coordination below. | Only eligible amounts enter this business's line 1. |
| 2 | For each covered person, lesser of qualified LTC premiums paid and the **2026 age cap**: ≤40 $500; 41–50 $930; 51–60 $1,860; 61–70 $4,960; ≥71 $6,200. Apply employer-plan month exclusions separately to LTC. Across multiple Forms 7206, one person's LTC amount cannot exceed the cap in total. | Sum eligible covered-person amounts into this business's line 2. |
| 3–10 | Line 3 = lines 1+2. Line 4 = profit/other earned income of this plan's Schedule C/F, partnership, or optional Schedule SE method activity. Line 5 = **total positive** profit/earned income from all profitable SE businesses, excluding losses. Line 6 = line 4 ÷ line 5; line 7 allocates Schedule 1 line 15 half-SE-tax deduction by that percentage. Subtract line 7 and this business's Schedule 1 line 16 retirement-plan amount to reach line 10. Exclude SE-exempt CRP payments; use Schedule SE Part I line 4b attributable amount for an optional method. | Keeps one business's earnings limit from consuming another's profit or deductions. |
| 11–13 | A >2% S-corporation shareholder uses **that corporation's W-2 box 5 Medicare wages** on line 11 instead of lines 4–10. Line 12 subtracts attributable Form 2555 line 45 foreign earned income from line 10 or 11. | Line 13 is this plan's final earned-income ceiling. |
| 14 | Smaller of line 3 premiums and line 13 ceiling, after the applicable Marketplace PTC method. | Sum allowed plan deductions → Schedule 1 line **17** → AGI. Attribute each allowed amount to its business for QBI; exclude that amount from Schedule A medical expenses. The deduction does **not** reduce Schedule SE earnings. |

The instructions allow the simpler 1040 worksheet in ordinary cases but
require Form 7206 when there is more than one SE income source, a Form 2555,
or qualified LTC premiums. Keep a filing decision separate from deduction
arithmetic; when filing Form 7206, render one copy per plan/business.

Marketplace premiums can participate in both Form 7206 and Form 8962.
The 2026 Form 7206 instructions direct this case to Publication 974. The
2025 publication describes specified/nonspecified premiums and simplified
or iterative methods because the deduction changes AGI/PTC and PTC changes
the available premium deduction. The TY2026 path must use a source-backed
2026 method and reconcile [Form 8962](FORM8962-GRAPH.md), Form 1095-A,
Schedule 1 line 17 and the premium cap without blindly subtracting a PTC
total from all premiums. Keep the 2025 publication labeled comparator until
the 2026 method is available.

The [2026 PDF inventory](pdf-fields-f7206.csv) contains **16 widgets**, all
in the field tree: name/TIN plus lines 1–14 on the single printed page (PDF
page 2 after the coversheet). Fields `f1_3[0]` through `f1_16[0]` follow
printed lines 1–14. Render each plan's own values and inspect the result.

## Current code boundary

- Shared `form7206` accepts one aggregate nonnegative `se_net_profit`,
  taxpayer/spouse LTC premiums and ages, a gross premium amount and a single
  `premium_tax_credit`. It cannot identify a plan/business, eligibility by
  month, partnership/S-corporation route, optional SE method, other
  profitable-business denominator, allocated half-SE/retirement deductions,
  covered-child LTC, or Form 2555 line 45. It simply caps premiums less PTC
  by gross SE profit, which is not the form's line 14 computation.
- The shared node emits the Schedule 1 line 17 deduction to a TY2025
  Schedule 1/AGI path and only one Form 8995 QBI amount. It does **not**
  self-emit lines 1–14, so no complete Form 7206 can be printed from its
  result. It is absent from the TY2026 registry and public inputs.
- The TY2025 PDF descriptor maps `se_net_profit` to `f1_3[0]`, which is
  **line 1 premiums** on the 2026 form, and maps other raw inputs to similarly
  wrong printed lines. The TY2025 MeF descriptor has seven source fields,
  without the 2026 line worksheet. Neither can be reused as a filed 2026
  attachment without a line-by-line/XSD audit.
- Form 8962 and the deduction can depend on each other; the present
  `premium_tax_credit` subtraction hides that loop. The 2026 Publication
  974/method and final Form 8962 instructions remain explicit source gates.

## Build and acceptance order

1. Add plan, business, covered-person and premium-month facts; connect
   Schedules C/F/SE, partnership K-1, S-corporation W-2, Form 2555,
   retirement-plan deduction, Form 8962/1095-A and LTC age records.
2. Calculate lines 1–14 per business with the printed numerator/denominator
   and allocated deductions. Resolve Marketplace PTC using the current-year
   source method. Aggregate line 14 to Schedule 1 line 17/AGI, reduce the
   correct business's QBI, and pass only the **undeducted eligible** medical
   amount to Schedule A where applicable.
3. File each required Form 7206 as a complete 2026 PDF and current-XSD MeF
   attachment. Reconcile printed lines, Schedule 1/1040 totals, QBI,
   Schedule A and Form 8962 without duplicate premiums or deductions.
4. Test single Schedule C, two profitable businesses plus one loss, farm
   optional SE method, partnership guaranteed-payment plan, >2% S-corp W-2
   box 5, Form 2555, partial employer-subsidized months, multi-person LTC
   and cross-form cap, under-27 child, Marketplace PTC iteration, and
   remaining Schedule A medical expenses. Run TY2025 regressions on any
   shared calculator or source changed.
