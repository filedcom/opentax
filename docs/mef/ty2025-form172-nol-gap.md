# TY2025 Form 172 and NOL carryforward: unsupported

Status: fail-closed. A positive `nol_carryforward` input now stops at the
calculation node, before reducing Schedule 1 or AGI. A zero-valued populated
source remains blocked at both exports. The existing export guards also reject
any direct positive Schedule 1 line 8a amount, so an input cannot bypass the
source node and file an unsupported deduction. Direct nonzero Form 6251 line
2f remains rejected. Focused cases were written but not run pending the agreed
full batch.

The current input holds only `year`, asserted `nol_amount`, a pre-2018 versus
post-2017 label, and asserted 2025 taxable income. It does not prove an NOL
existed, survived prior years, or is deductible in 2025. No native `IRS172`
document or PDF descriptor exists. Schedule 1 line 8a is not yet mapped to
either MeF or the filled PDF.

## Required evidence and arithmetic

| Step | Required source and calculation | Missing today |
| --- | --- | --- |
| Establish each loss vintage | Filed loss-year return and Form 172 Part I or applicable historical NOL worksheet; separate business/nonbusiness income and deductions, capital losses/gains, section 1202, QBI and other disallowances; filing status and taxpayer ownership | `nol_amount` is a bare assertion. The current enum does not establish the actual loss year computation or owner. |
| Reconcile availability | Per-vintage carryback election and application, each intervening year's filed return, modified taxable income and refigured AGI/itemized deductions, prior utilization, surviving balance, and expiry/exception rules | The node sums vintages by broad class and does not apply them in earliest-year order or prove the balance brought into 2025. |
| Calculate 2025 regular deduction | Source-derived taxable income before NOL, QBI and section 250 deductions, with any pre-2018 NOL applied first and the post-2017 80% limitation applied to the statutory base; reconcile each vintage's used and remaining amounts | `current_year_taxable_income` is asserted independently of the final return. The graph needs a pre-NOL pass to avoid the Schedule 1 to AGI to taxable-income cycle. |
| Refigure AMT | For each loss year, derive an ATNOL from AMT-allowed income/deductions and section 172(d) modifications with all AMT preferences; track AMT carryovers separately. For 2025, add the regular NOL on Form 6251 line 2e, calculate AMTI before ATNOLD, apply the ordinary 90% limit or documented historic disaster exception, then subtract sourced ATNOLD on line 2f | A regular NOL cannot be reused as ATNOLD or defaulted to zero. `nol_adjustment` is only an unsupported direct amount. |
| Attach and reconcile | One applicable Form 172 per NOL, each with the correct year and Part I/II values, linked to Schedule 1 line 8a and the regular/AMT calculations; native MeF `IRS172` and all three PDF pages per attachment | Neither exporter can produce Form 172. The TY2025 XSD contains required Part I lines and optional two-year carryback groups, so a bare carryover amount cannot serialize it. |

The IRS currently lists [Form 172 (rev. December 2024)](https://www.irs.gov/pub/irs-pdf/f172.pdf)
and its [instructions](https://www.irs.gov/instructions/i172) for 2025 use;
there is no separate 2025 revision. The instructions require a negative
Schedule 1 entry when carrying an NOL forward and an applicable Form 172 for
each NOL attached to the 1040. The [2025 Form 6251](https://www.irs.gov/pub/irs-prior/f6251--2025.pdf)
places the regular NOL addback on line 2e and ATNOLD on line 2f. Its
[instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf) require a
separate loss-year AMT refigure and generally cap the deduction at 90% of
AMTI before ATNOLD, with specified historical disaster exceptions.

No asserted-capacity input, copied regular-to-AMT amount, or placeholder
Form 172 should be added. Build the per-vintage source contract and a pure
pre-NOL/finalization calculation first. Then wire native/PDF attachments and
run the full test, XSD/business-rule, visual PDF, and ATS gates.
