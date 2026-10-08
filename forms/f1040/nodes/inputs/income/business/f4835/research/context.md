# Form 4835, tax year 2025

Source: [IRS Form 4835](https://www.irs.gov/pub/irs-pdf/f4835.pdf). This form is
for farm rental income based on crops or livestock where the owner does not
materially participate. It is not Schedule F self-employment income.

## Current model

- One `f4835s` item per farm, at most four per the TY2025 MeF `ReturnData1040`
  schema.
- The income inputs distinguish received/gross amounts from the taxable column
  on lines 2 through 5. Line 7 sums the taxable column, line 1, prior-year
  deferred crop insurance, and other income.
- Line 31 sums expenses and subtracts the section 263A capitalization amount.
  The capitalized amount cannot exceed the expenses entered.
- A negative preliminary result requires an explicit line 34 at-risk answer.
  When all investment is at risk, the node passes each farm's preliminary result
  through Schedule E to the Form 8582 activity allocation. MeF line 34c comes
  from that allocation, not a manually supplied `deductible_loss`.
- When some investment is not at risk, each loss farm supplies Form 6198
  simplified-computation amounts. Line 9 includes amounts in opening basis that
  are not at risk, and excludes the current-year loss. The computed amount at
  risk limits the farm loss before Form 8582, and the excess is reported as a
  per-farm at-risk carryforward. A separate IRS6198 document is emitted for each
  such farm.
- Prior-year unallowed passive operating losses stay attached to their farm
  activity. Form 8582 allocates the amount released this year; Form 4835 line 32
  first absorbs an allowed prior loss against current farm profit, and any
  excess allowed loss appears on line 34c. Schedule E line 40 uses the same
  allocation. If the farm is treated as actively participated this year, the
  prior-year active-participation answer is required. An ineligible prior loss
  is routed to Form 8582 Part V rather than the special allowance in Part IV.
  That changed-participation route is written but not yet verified in the
  requested full test batch.
- The node emits `farm_rental_gross`, at-risk-limited `farm_rental_net`, and
  per-farm activity rows to `schedule_e`. Schedule E withholds passive losses
  until Form 8582 permits them, then reports the allowed net on line 40. It does
  not fabricate withholding or bypass Schedule E.
- Line 4a CCC loan inclusion requires itemized loans matching the elected total.
  Each elected farm receives a linked `CCCLoanDetailCashMethodStmt` MeF
  document.
- Line 5c crop insurance deferral requires cash-method and normal-business-
  practice eligibility facts, dated crop damage, and itemized dated payments.
  The payments must reconcile with lines 5a and 5b. Each elected farm receives a
  linked `PostponementCropInsDsstrStmt` MeF document. The statement currently
  requires a domestic filer address because the IRS statement schema only has a
  US address field.

## Not yet supported

- Form 6198 detailed computation and at-risk recapture are not modeled.
  Prior-year farm at-risk carryforwards are not yet applied. Passive-loss
  carryforwards from a farm that changed participation category still need
  end-to-end MeF and business-rule verification. A calculated tax result is not
  by itself a submission-ready MeF return.
