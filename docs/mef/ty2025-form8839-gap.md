# TY2025 Form 8839 coverage gap

Status: **active filing fails closed** in the tax node, MeF descriptor, and PDF descriptor. The pure Part II calculation helper remains for future source-backed work, but it does not emit Form 1040, Schedule 3, IRS8839 XML, or a filled PDF. No tests, typecheck, XSD validation, PDF rendering, or IRS ATS were run for this change.

## Why the former bounded route was not filing-ready

The [2025 Form 8839](https://www.irs.gov/pub/irs-pdf/f8839.pdf) and [instructions](https://www.irs.gov/pub/irs-pdf/i8839.pdf) require child eligibility and timing, qualified unreimbursed expenses, modified AGI, and a completed Credit Limit Worksheet. A plausible child identity and self-attested confirmation of finalization/payment are not evidence of an adoption decree, payment ledger, or employer reimbursement. The current graph does not reconcile those asserted facts to primary records.

The input `magi` also is not reconciled to finalized Form 1040 line 11b plus any Puerto Rico, Form 2555, and Form 4563 additions required by the instructions. The supplied `credit_limit_worksheet_line5` is not derived from finalized Form 1040 line 18 after the worksheet's listed other credits. A return could therefore overstate the refundable or nonrefundable credit even if the native XML and Form 1040/Schedule 3 amounts match each other. A matching pair of self-generated amounts is not independent validation.

The helper now rejects a Credit Limit Worksheet line 5 greater than Form 8839 line 16 (line 14 when carryforwards are absent). A former positive MeF fixture had line 16 of $10,000 and asserted worksheet line 5 of $12,000, which is impossible under the 2025 worksheet. This guard is a necessary arithmetic check, not a substitute for source reconciliation.

## Reopening the route

Source child finalization/eligibility and eligible unreimbursed payments from documents or a reviewed ledger. Derive MAGI from finalized return and foreign-income/Puerto Rico adjustments. Compute Credit Limit Worksheet line 5 from finalized Form 1040 line 18 and the worksheet's prescribed prior credits; preserve its ordering with the adoption credit itself. Then reconcile each per-child refundable amount, the Schedule 3 nonrefundable amount, and the native `AdoptedChild` group. The PDF needs a verified 2025 AcroForm field map and visual filled-PDF check. Separate routes are still needed for employer benefits, multiple children, special needs, foreign adoptions, prior-year credit/carryforward, ATIN, and MFS exceptions. Do not restore the old flat XML or add an asserted-facts bypass.
