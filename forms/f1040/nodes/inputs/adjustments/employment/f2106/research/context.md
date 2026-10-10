# TY2025 Form 2106 source and calculation

The [2025 Form 2106](https://www.irs.gov/pub/irs-prior/f2106--2025.pdf) is per employee/job. The public `f2106s` array now contains strict per-job records; the old category-only shape is rejected rather than supported through a shim. Each record has employee name/SSN/occupation, employer and source reference, a typed qualification branch, one vehicle method, Part I expenses, and separate meal/nonmeal reimbursements. See the [filing gap](../../../../../../../../docs/mef/ty2025/domains/adjustments/employment/form2106/ty2025-form2106-gap.md) before using any amount for a return.

| Source | Current treatment |
| --- | --- |
| Fee-basis state/local official | Requires a government employer, fee-basis compensation, and record reference; calculates lines 1-10, including standard mileage where sourced. Sends line 10 to Schedule 1 line 12 and AGI. |
| Qualified performing artist | Owner-wide employer, expense, AGI and marital tests reconcile to owned W-2s and final filing status/AGI; the verified filing route has wage-only arts income. |
| Employee with impairment-related work expenses | Requires disability and workplace-enabling facts; current calculation accepts only sourced line 4 expenses with no vehicle/travel/meals. Sends line 10 only to Schedule A line 16, never AGI. |
| Armed Forces reservist | Dated overnight trip records reconcile mileage, fees, lodging and meals. Form 2106 retains full expenses; Schedule 1 receives only travel over 100 miles, with reviewed CONUS federal rates and first/last-day meal limits. Reimbursements and unrepresented expense categories remain guarded. |

Part I line 6 has separate A (lines 1-4) and B (line 5) columns. The source separately classifies Form 2106 line 7 reimbursements; the calculator first computes each unreimbursed line 8 amount, then applies the standard 50% limit to line 8B for line 9B. A positive line 7A excess over line 6A is calculated but tax routing rejects pending W-2 and Form 1040 line 1a reconciliation. The [instructions](https://www.irs.gov/instructions/i2106) expressly require that income route.

Part II supports no vehicle or a fully specified standard-mileage vehicle with placement date, total/business/commuting miles, personal-use answers, and written-mileage evidence reference. Business plus commuting miles cannot exceed total miles. The canonical result contains lines 11-22, including $0.70 per business mile and calculated other miles. The source currently excludes a midyear personal-to-business conversion so line 14 is not miscomputed under that special rule. The actual-expense source collects lines 23-28 but calculation rejects until section D depreciation and method history are sourced. Multiple vehicles per job are not yet supported.

Native and official PDF descriptors are registered for one to four sourced jobs. Export guards reconcile employee/W-2 ownership, expenses, schedule contributions and Form 1040 totals. The filing gap records current complete-return tests and reviewed packets. Source references do not authenticate issuer documents; broader income/expense combinations, business-rule validation and IRS acceptance remain open.
