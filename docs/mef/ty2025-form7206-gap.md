# TY2025 Form 7206 source-to-filing gap

Status: implementation audit, 2026-09-28. No current full-batch test, local
XSD validation, filled-PDF inspection, IRS business-rule check, or ATS
acceptance proves this path.

The [2025 Form 7206](https://www.irs.gov/pub/irs-pdf/f7206.pdf) and
[instructions](https://www.irs.gov/instructions/i7206) require a separate form
for each trade or business under which a different insurance plan is
established. Its line 4 is the establishing business's earned income, while
line 5 is total positive profit from all eligible businesses. Line 6 is their
ratio, line 7 allocates the Schedule 1 line 15 self-employment tax deduction,
line 9 allocates the Schedule 1 line 16 retirement deduction, and line 14 is
the smaller of eligible premiums and line 13. An S corporation's more-than-2%
shareholder wages use line 11. The 2025 native `IRS7206` XSD requires
`NameLine1Txt` and `SSN` before any optional line elements.

## Current implementation mismatch

- `nodes/intermediate/forms/form7206/index.ts` currently caps the premium
  total at `se_net_profit`. It does not calculate lines 4-13, allocate the
  self-employment tax and retirement deductions, identify the establishing
  business, or produce a distinct form for each plan. This can overstate the
  Schedule 1 line 17 deduction even without Marketplace PTC overlap.
- `nodes/inputs/self_employed_health_insurance/index.ts` deposits the full
  premium amount into Schedule 1 and AGI with no earned-income or
  employer-subsidized-month substantiation. It says it trusts an externally
  verified cap. This is not a complete source-to-deduction path.
- `2025/mef/forms/f7206.ts` maps seven internal fields to tags that are not
  children of the TY2025 v5.4 native `IRS7206` type. It also omits required
  name and SSN. The existing MeF path is structurally invalid if emitted.
- The registered PDF descriptor treats net profit as printed line 1 and
  premiums as line 2, whereas printed line 1 is health insurance and line 2
  is qualified LTC premiums. Its field map needs a new source-to-form review
  and a filled-render check.

## Required build boundary

1. Source-identify each insurance plan, establishing business, covered
   persons, eligible months, actual premiums, and excluded employer-subsidized
   or nontaxable public-safety-officer amounts. Reconcile business profit,
   Schedule SE optional-method amounts, Schedule 1 lines 15-16, S-corporation
   W-2 wages, and any Form 2555 amount. For LTC, apply each person's age limit
   across all plans rather than once per form.
2. Calculate printed lines 1-14 per business/plan, including line 6's
   cross-business ratio and the line 7/9 allocations. Reconcile the sum of
   filed line 14 amounts once to Schedule 1 line 17 and QBI/AGI. Treat
   Marketplace overlap through Publication 974's sourced calculation, not a
   guessed subtraction.
3. Rebuild native MeF documents with required identity and the exact TY2025
   sequence. Reconcile each document to its own source and the filed return.
   Remap the PDF to the actual 2025 AcroForm, then inspect filled pages.
4. Write cases for one sole proprietorship, two profitable businesses sharing
   the line 7 allocation, a loss-making second business, an S-corporation
   shareholder, Form 2555, LTC per-person limits across plans, and Marketplace
   overlap. Execute them in the agreed full batch after implementation.

No legacy-tag remapping, empty-document skip, or externally asserted deduction
would establish filing support. This route remains open in the inventory.
