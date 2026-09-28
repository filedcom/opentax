# TY2025 Form 7206 source-to-filing gap

Status: a narrow taxpayer-owned one-Schedule-C, one-non-Marketplace-plan path is
coded, 2026-09-28, but remains unverified. No full-batch test, local XSD
validation, filled-PDF inspection, IRS business-rule check, or ATS acceptance
proves this path.

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

- `nodes/intermediate/forms/form7206/index.ts` calculates and emits the one-plan
  Schedule C lines 1-10 and 12-14 only after the establishing business's
  reference, taxpayer owner, and computed line 31 match the Schedule C node;
  Schedule SE's computed line 13 matches Schedule 1 line 15; and the actual
  retirement source and plan both show zero line 16. The prior aggregate
  `eligible_health_premiums` and eligibility flag were replaced with twelve
  ordered premium-month records. Each has policy/payment references, a
  taxpayer-only covered-person fact, an employer-plan eligibility review
  reference, Marketplace/LTC classification, and any public-safety-officer
  exclusion. The helper excludes employer-eligible months and the sourced
  public-safety-officer amount; a positive exclusion needs its own source
  reference and the plan total cannot exceed $3,000. It rejects Marketplace,
  LTC, missing/duplicate months, and an exclusion larger than the paid premium.
  This is traceable source calculation, not independent authentication of those
  records. The premium source remains a document-reference claim, not a parsed
  insurer or payment record. Literal no-Form-2555 and sole-business claims are
  checked again against the assembled return at MeF/PDF projection.
- The old flat `se_net_profit` and `health_insurance_premiums` inputs are
  rejected. The separate `self_employed_health_insurance` premium-only input no
  longer deposits a deduction; positive claims fail with an identified-plan
  requirement. There is no premium-only bypass.
- `2025/mef/forms/f7206.ts` emits the checked-in TY2025 v5.4 native sequence
  with taxpayer name and SSN, recalculates every printed line, and checks the
  one Schedule C, Schedule SE, Schedule 1 lines 3/15/16/17, and Form 1040 line
  10. It rejects Form 2555 and Marketplace/PTC overlap. Schedule 1 MeF now
  includes native lines 16 and 17, which were previously omitted.
- The PDF descriptor maps the sourced recipient and line 6 as `100%`, checks the
  core Schedule C/Schedule 1 reconciliation and overlap exclusions, then
  projects the official fields. A filled-page visual review is still pending.
- The existing Publication 974 single-business calculator remains a separate
  Marketplace-overlap route. It does not emit a Form 7206 document; its
  worksheet and return reconciliation still needs end-to-end review.

### Publication 974 mixed-month boundary

The iterative route now accepts one identified Marketplace policy with
partial-year _specified_ premiums even if Form 1095-A coverage continues in
other months. It requires a policy-numbered premium/APTC record for every
covered month, matches those records to the 1095-A node, and matches each
specified Worksheet W month to its full policy month. This directly replaces
the old coverage-month/all-specified source shape, without a fallback.
Under [2025 Publication 974](https://www.irs.gov/publications/p974), Step 2
calculates PTC for all Marketplace enrollment, but Steps 3 and 5 attribute only
the PTC for months with specified premiums. When monthly Form 8962 column (e)
varies and specified premiums cover fewer than 12 months, those steps use the
sum of column (e) for the specified months; otherwise they use the specified-
month to coverage-month ratio. Business nonspecified premiums must first go
through Worksheet P or Form 7206. The new calculation reconciles both
attribution steps to final Form 8962 and does not subtract total PTC from
specified premiums or infer monthly PTC from annual Form 1095-A totals.
Multiple policies, within-month partial specified premiums, other SE income
sources, Form 2555, and special adjustment ordering remain unsupported here.
The records are source references, not authenticated insurer/payment records;
the full batch, native XSD, and filled-PDF visual review remain unrun.

The month-level premium and employer-coverage records are referenced but not
authenticated against actual documents. The bounded route rejects a positive
Schedule 1 line 16 because SEP/SIMPLE/qualified plan inputs have no business
owner; it also rejects a second Schedule C, Schedule F, Form 2555,
Marketplace/PTC overlap, Schedule E/4835/4797, and LTC. The current return-wide
exclusion check is only as complete as the listed source fields and must be
challenged in the full batch. It does not establish broader plan or
covered-person support.

## Required build boundary

1. Authenticate each insurance plan, establishing business, covered persons,
   eligible months, actual premiums, and excluded employer-subsidized or
   nontaxable public-safety-officer amounts. Reconcile business profit, Schedule
   SE optional-method amounts, Schedule 1 lines 15-16, S-corporation W-2 wages,
   and any Form 2555 amount. For LTC, apply each person's age limit across all
   plans rather than once per form.
2. Extend printed lines 1-14 per business/plan, including line 6's
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
