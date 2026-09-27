# TY2026 Form 8606 graph contract

Sources: pinned [2026 draft form](corpus/draft/f8606.pdf)
(SHA-256 `4d7e8fe466cf0534817d78bc5e6e84d78971b59cbbed0523eaa6448a20c2f2a6`)
and [2026 draft instructions](corpus/draft/i8606.pdf)
(SHA-256 `d2717dedf7b5f7025fbbec73f1be0093adbe306cdb6e97b2e32f8a54b8e51878`).
The instructions were posted September 23, 2026. Both remain drafts and need
final-version review before filing.

## Owner and source contract

Form 8606 is per owner: a joint return needs a separate form for each spouse
who must file it. Inherited IRAs from different decedents can also require
separate forms. The 2025 node currently receives one Form 1099-R item at a
time and has one pending key, so it cannot establish a complete 2026
owner-wide pro rata denominator. The TY2026 route must collect all relevant
IRAs and distributions for one owner before calculating, and preserve the
owner for the PDF and MeF attachment.

| Input fact | 2026 form destination | Required provenance or exclusion |
| --- | --- | --- |
| 2026 nondeductible traditional IRA contributions | Part I line 1 | Reconcile with the IRA deduction decision; exclude employer SEP/SIMPLE contributions and returned contributions. |
| Prior basis | Line 2 | Prior Form 8606 basis chart, adjusted for prior line 15c worksheet carryover, excess contribution return, divorce transfer, or nontaxable plan rollover. |
| Contributions for 2026 made January 1–April 15, 2027 | Line 4 | Remove from current-year distribution basis on line 5; retain in line 14 carryforward. |
| All traditional IRA December 31 value, outstanding rollovers, qualifying repayment adjustments | Line 6 | Aggregate traditional, SEP, and SIMPLE IRAs owned by this filer. Require the value and adjustments explicitly; absence is not a zero balance. |
| 2026 traditional IRA distributions | Line 7 | Include all relevant statements; exclude rollovers, QCDs, HSA funding distributions, conversions, recharacterizations, and returns of certain contributions. |
| Net traditional-to-Roth conversion | Lines 8 and 16 | Keep separate from line 7; source from conversion statements and basis evidence. |
| Qualified disaster amount and qualifying repayments | Lines 15b/15c and 25b/25c worksheets | Require Form 8915-F and repayment history before changing taxable income or carryforward. |
| Nonqualified Roth distributions and ordered Roth basis | Part III lines 19–25c | Distinguish contributions, conversions, rollover basis, first-homebuyer exclusion, and five-year/qualified-distribution facts. |

The form's line 10 ratio is line 5 divided by the sum of lines 6–8, rounded
to at least three decimal places and capped at 1.000. Lines 11 and 12 apply
that ratio separately to conversions and other distributions. Line 13 is
their nontaxable total; line 14 carries remaining basis forward. Line 15c
feeds Form 1040 line 4b for traditional distributions, and Part II line 18
feeds line 4b for conversions. The corresponding gross amounts still reach
line 4a. Any applicable early-distribution tax must use the resulting taxable
amount and its Form 5329 exception facts, not gross box 1.

## Existing-node audit and build order

1. Do not register the shared 2025 `form8606` node as the TY2026 solution.
   It has no line 4 post-year contribution field, defaults an absent year-end
   value to zero, uses a simplified Roth distribution calculation, and emits
   one pending form without an owner. It also lacks the current disaster and
   repayment worksheets. Its helpers are implementation references only.
2. Add a typed TY2026 IRA basis/contribution input per owner and aggregate
   all matching 1099-R statements before the Part I calculation. Require
   affirmative answers for outstanding rollovers, QCDs, HSA funding,
   recharacterizations, and repayments. Route unsupported affirmative cases
   to a named diagnostic until their source and attachment are wired.
3. Implement and test the no-distribution basis carryforward, the
   distribution-only pro rata case, and a combined distribution/conversion
   case with line 4 contributions. Reconcile 4a/4b, AGI, line 14
   carryforward, and any Form 5329 tax. Then add Part III with Roth ordering
   and its own basis carryforward.
4. Inventory the pinned draft AcroForm rather than reusing 2025 widget names.
   Render a separate Form 8606 PDF for each owner and reconcile printed
   lines 1–18 and 19–25c to calculated values and Form 1040. Build the MeF
   attachment only against the current TY2026 schema and business rules.
5. Add ATS/source fixtures for basis, conversion, spouse forms, Roth
   distributions, and the exclusion/repayment branches. Recheck the final
   form and instructions before registration.

The draft instructions appear to print “April 15, 2026” in one line 4
example about contributions made in 2027. The draft form itself specifies
April 15, 2027; use that form date and recheck the final instructions.
