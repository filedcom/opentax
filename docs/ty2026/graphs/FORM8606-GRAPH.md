# TY2026 Form 8606 graph contract

Sources: pinned [2026 draft form](../corpus/draft/f8606.pdf)
(SHA-256 `4d7e8fe466cf0534817d78bc5e6e84d78971b59cbbed0523eaa6448a20c2f2a6`)
and [2026 draft instructions](../corpus/draft/i8606.pdf)
(SHA-256 `d2717dedf7b5f7025fbbec73f1be0093adbe306cdb6e97b2e32f8a54b8e51878`).
The instructions were posted September 23, 2026. Both remain drafts and need
final-version review before filing.

## Owner and source contract

Form 8606 is per owner: a joint return needs a separate form for each spouse
who must file it. Inherited IRAs from different decedents can also require
separate forms. The older generic node receives individual Form 1099-R items,
while the current 2025 reviewed annual route reconciles complete owner account
inventories and conversions. The TY2026 route must collect all relevant
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

1. Do not register the generic shared `form8606` node as the TY2026 solution.
   Its fallback calculation defaults missing year-end values and omits current
   source facts. Reuse the newer reviewed annual source calculations instead;
   their 2025 schema dates and retained-document bindings must remain separate
   from 2026. Disaster and repayment worksheets still need their own routes.
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

## Current annual traditional-IRA workpaper

`calculateIraBasis2026` implements annual Part I/II arithmetic through the
registered 2026 `f1099r` source. The retirement adapter resolves original and
corrected statements first, then passes every current owned IRA copy for each
covered owner to `bindIraBasis2026`. Public claims contain evidence references,
not current-copy overrides or entered compensation totals. General return
identity, executed W-2s and executed Schedule C inventories supply those facts.
The old generic shared `form8606` node remains unregistered for 2026.

Each owner supplies a complete traditional/SEP/SIMPLE account inventory with
explicit December 31 statements, the latest applicable prior Form 8606 line 14
and qualifying prior Line 15c worksheet adjustment, and a review of intervening
basis changes. Current nondeductible contributions reconcile issued Form 5498
box 1 to dated receipts and an all-nondeductible election. The 2026 age limit and
the owner's evidenced eligible compensation constrain those receipts; this stage
does not yet support spousal compensation allocation, deductible contributions or
concurrent regular Roth contributions. Current receipts through April 15, 2027
are retained, with post-year amounts removed from the distribution-year basis.

Actual current 1099-R copies bind to distinct account dispositions. Gross amounts
reconcile to owner cash, federal/state/local withholding and direct Roth receipts.
Conversion receipts reconcile to destination Form 5498 box 3. A SIMPLE conversion
requires the actual first-contribution date and completed two-year period, using
the same calendar-anniversary helper as the retirement source adapter. Same-owner
accounts aggregate before rounding; spouses retain independent forms and basis.

`traditionalIraBasisAmounts` extracts the arithmetic from the existing 2025 annual
conversion implementation. Both years now use that helper. It starts with the
printed three-place ratio and increases precision up to five places if necessary
to avoid spending more basis than exists; it never silently caps a printed
multiplication. The 2026 workpaper exposes Part I lines, Part II lines and an
owner-specific basis carryforward where applicable. No-activity contributions
print only lines 1–3/14. A full conversion without Part I retains a potentially
negative line 18 while adding no negative amount to taxable IRA income; it has no
automatic line-14 carryforward.

The form and instruction sources above were rechecked October 16, 2026. The
annual contribution limits are independently sourced from
[Notice 2025-67 and the IRS announcement](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500).

### Return and payment integration

A public nondeductible election identifies all of that owner's actual W-2s and
service businesses. The bridge replays Schedule C and the owner's SE deduction,
verifies the same W-2 inventory on both paths, and calculates W-2 box 1 less
box 11 plus code Q combat pay. It floors aggregate net business income less
deductible SE tax at zero separately from wages. A business loss therefore does
not reduce wage compensation. Reviews exclude other compensation, exclusions
and self-employed retirement deductions. This method follows
[Publication 590-A's compensation rules](https://www.irs.gov/publications/p590a);
its 2025 annual contribution limits are not reused.

Treatment reviews must identify the same annual owner and plan type, and cannot
simultaneously assert no basis or no conversion. Every current IRA copy for a
covered owner must have a disposition in the complete account inventory;
retired corrections cannot contribute income or withholding. Contribution-only
inventories need no invented 1099-R. Ordinary owned code 3 distributions retain
the payer disability exception; inherited accounts remain outside this basis
route.

Annual taxable distributions plus nonnegative taxable conversions feed 4b and
AGI once. Gross income remains on 4a for Form 8606 distributions and multiple IRA
copies, including fully taxable conversions. Withholding remains the unchanged
current-copy amount. The [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi)
are the display-method comparator; the served draft instructions still describe
2025 and need final 2026 review.

Early IRA basis payments supply the actual nonconverted amount and date, without
an entered taxable amount. The current disposition contract describes one dated
payment per issued copy; multi-date basis statements need a broader source ledger.
Cash and withholding left outside a direct conversion remain nonconversion
income. Code 2 partial conversions before age 59 1/2 therefore need a payment
review; full conversions need no early ledger. Exceptions remain tied to actual
payments. The annual ratio adjusts early, exempt and first-two-year SIMPLE groups,
bounded by filed annual taxable withdrawals. Owner Form 5329 combines those
amounts with ordinary early pensions; spouse amounts never cross. Conversion
income stays outside the penalty base, consistent with the
[2026 Form 5329 draft instructions](https://www.irs.gov/pub/irs-dft/i5329--dft.pdf).

The pinned 2026 PDF has 47 widgets across two form pages plus its draft cover.
The renderer removes the cover and produces separate static owner attachments,
replaying sources and reconciling combined 4b before filling lines 1-18. Split
line 10 widgets preserve at least three decimal places and any additional
precision used by the arithmetic. No-activity rows, unused Part III and
standalone-return address/signature fields remain blank. Negative Part II line 18
is printed without becoming negative taxable income. Generated pages remain
development drafts, not filing products.

### Remaining parity work

1. Add statutory-employee expense reconciliation and other compensation sources,
   deductible IRA contribution/SSA worksheet coordination, spousal compensation
   allocation and concurrent regular Roth contributions.
2. Expand dated payment ledgers and remaining Form 5329 exceptions; finish
   inherited basis, Roth ordering, indirect rollovers, recharacterizations,
   QCD/HSA, disaster/repayment and older basis-chart sources.
3. Add current MeF/ATS outputs and review final 2026 forms/instructions before
   registering a public filing product. These remain required scope.

### Validation

The integrated route passes 31 typed compensation, retirement, graph, exception
and PDF checks, the complete 952-test TY2026 runtime suite, and the 137-test unit
gate with a 3,763-module preflight and unchanged runtime snapshot. Printed-field
checks cover every Part I/II line, contribution-only blanks, negative line 18 and
joint owner attachments. Both rendered form pages were visually inspected;
flattened outputs contain neither widgets nor a residual AcroForm tree.

Earlier workpaper-only validation:

The workpaper passed 29 typed 2026 IRA/retirement checks and the complete
927-test TY2026 runtime suite. The 137-test repository unit gate and module-graph
preflight passed with unchanged runtime files. Selected 2025 node, MeF and SIMPLE
regressions passed; all ten annual traditional-IRA scenarios also completed their
native-output and PDF assertions.

Those annual scenarios exposed a pre-existing export check that summed retained
payment cents although the return node already summed filed whole-dollar lines.
The same failure was reproduced with the unmodified annual IRA module. The
payment check now replays the printed withholding/refundable/estimated-payment
operands; 17 annual-IRA and return-arithmetic tests pass, including rejection of
incorrect subtotals. No new 2026 PDF or filing route is claimed by this increment.
