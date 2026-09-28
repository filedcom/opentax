# TY2025 Form 7206 source-to-filing gap

Status: one-Schedule-C filing is fail-closed, 2026-09-28. The line calculator
remains as a preparatory pure helper, but it cannot authorize a return, MeF
document, or filled PDF. No full-batch test, local XSD validation, filled-PDF
inspection, IRS business-rule check, or ATS acceptance proves this path.

The [2025 Form 7206](https://www.irs.gov/pub/irs-pdf/f7206.pdf) and
[instructions](https://www.irs.gov/instructions/i7206) require a separate form
for each trade or business under which a different insurance plan is
established. Its line 4 is the establishing business's earned income, while line
5 is total positive profit from all eligible businesses. Line 6 is their ratio,
line 7 allocates the Schedule 1 line 15 self-employment tax deduction, line 9
allocates the Schedule 1 line 16 retirement deduction, and line 14 is the
smaller of eligible premiums and line 13. An S corporation's more-than-2%
shareholder wages use line 11. The 2025 native `IRS7206` XSD requires
`NameLine1Txt` and `SSN` before any optional line elements.

## Current coded boundary

- `nodes/intermediate/forms/form7206/index.ts` has a preparatory one-plan
  Schedule C calculator for lines 1-10 and 12-14. Active one-plan claims throw
  before any Schedule 1, AGI, QBI, or Form 7206 output. Literal flags claiming
  eligible premium months, sole positive business, no Marketplace overlap,
  no Form 2555, and no optional Schedule SE method are not primary evidence.
- The old flat `se_net_profit` and `health_insurance_premiums` inputs are
  rejected. The separate `self_employed_health_insurance` premium-only input no
  longer deposits a deduction; positive claims fail with an identified-plan
  requirement. There is no premium-only bypass.
- `2025/mef/forms/f7206.ts` retains the checked-in TY2025 v5.4 native field
  map, but rejects a nonempty one-plan payload rather than serializing amounts
  that were not reconciled to primary sources and the finished return.
- The PDF descriptor likewise rejects active one-plan projection and inclusion.
- The existing Publication 974 single-business calculator remains a separate
  Marketplace-overlap route. It does not emit a Form 7206 document; its
  worksheet and return reconciliation still needs end-to-end review.

### Publication 974 mixed-month boundary

The iterative route accepts partial-year Marketplace coverage only when every
covered Form 1095-A policy month has a reconciled *specified* premium and no
business nonspecified-premium deduction. It rejects coverage in other months or
mixed specified/nonspecified policy months through the source reconciliation;
`all_marketplace_enrollment_premiums_are_specified` must be true. This is an
intentional filing boundary, not a claim that the other months have zero PTC.
Under [2025 Publication 974](https://www.irs.gov/publications/p974), Step 2
calculates PTC for all Marketplace enrollment, but Steps 3 and 5 attribute only
the PTC for months with specified premiums. When monthly Form 8962 column (e)
varies and specified premiums cover fewer than 12 months, those steps use the
sum of column (e) for the specified months; otherwise they use the specified-
month to coverage-month ratio. Business nonspecified premiums must first go
through Worksheet P or Form 7206. Supporting this case requires identified
policy/month premium facts for *all* coverage months, a documented
specified-month and business-plan classification, and reconciliation of both
attribution steps to the final Form 8962. We must not subtract total PTC from
the business's specified premiums or infer monthly PTC from annual Form 1095-A
totals.

The input model's eligibility booleans are assertions, not verified facts. It
does not derive premium-month eligibility from invoices/policy and employer
coverage records. Its Schedule 1 lines 15-16 can disagree with the actual
return, which can overstate line 14. Schedule C lacks an owner field, so a
spouse's identity can be placed on a taxpayer-owned business. The code also
cannot prove that Form 1095-A/8962, Form 2555, or Schedule SE optional-method
facts do not contradict the supplied assertions. These gaps require primary
sources and return-wide reconciliation before the route can reopen.

## Required build boundary

1. Source-identify each insurance plan, establishing business, covered persons,
   eligible months, actual premiums, and excluded employer-subsidized or
   nontaxable public-safety-officer amounts. Reconcile business profit, Schedule
   SE optional-method amounts, Schedule 1 lines 15-16, S-corporation W-2 wages,
   and any Form 2555 amount. For LTC, apply each person's age limit across all
   plans rather than once per form.
2. Calculate printed lines 1-14 per business/plan, including line 6's
   cross-business ratio and the line 7/9 allocations. Reconcile the sum of filed
   line 14 amounts once to Schedule 1 line 17 and QBI/AGI. Treat Marketplace
   overlap through Publication 974's sourced calculation, not a guessed
   subtraction.
3. Rebuild native MeF documents with required identity and the exact TY2025
   sequence. Reconcile each document to its own source and the filed return.
   Remap the PDF to the actual 2025 AcroForm, then inspect filled pages.
4. Write cases for one sole proprietorship, two profitable businesses sharing
   the line 7 allocation, a loss-making second business, an S-corporation
   shareholder, Form 2555, LTC per-person limits across plans, and Marketplace
   overlap. Execute them in the agreed full batch after implementation.

No legacy-tag remapping, empty-document skip, or externally asserted deduction
would establish complete filing support. The broader route remains open in the
inventory until the remaining sources and execution gates are satisfied.
