# TY2026 Form 1099-R route contract

Sources: pinned final [2026 Form 1099-R](corpus/authorities/f1099r--2026.pdf)
(SHA-256 `d3de9319bed344f02621f97760a50bd19093de22f7d1e3352bd8ff10f61a4c44`)
and [2026 instructions](corpus/authorities/i1099r--2026.pdf)
(SHA-256 `0bb009120b7793c15445c0e4be2cd525bc37b19c215f2478b6df627dcf23db14`).
The draft [2026 Form 1040](corpus/draft/f1040.pdf) supplies the destination
line labels. The current TY2025 `f1099r` node, its Form 8606/5329/4972
dependencies, and the TY2025 MeF serializer are audit inputs, not a 2026
input contract. A dedicated TY2026 node now handles normal, fully taxable
  IRA and pension distributions and a code G pension-plan rollover; the
  remaining cases below are still required.

## Source shape changes

| 2025 source field | 2026 form | Required code change |
| --- | --- | --- |
| `box7_distribution_code`, `box7_code2` | **7a** distribution codes | Accept one or two actual 7a codes and retain code order. Code Y for a QCD is optional in 2026, and when used must precede code 4, 7, or K. A missing Y does not disprove a QCD. |
| `box7_ira_simple_indicator` | **7b** IRA/SEP/SIMPLE checkbox | Route 7b to IRA 1040 lines 4a/4b; pension and annuity distributions route to 5a/5b. Do not infer the checkbox from code 7a. |
| no source field | **7c** Trump account checkbox | Keep these distributions out of ordinary IRA/pension calculation until the distinct excess-contribution, ABLE rollover, and death rules are implemented. |
| no source field | **7d** earnings on excess contributions | This amount can be separate from box 1; the 2026 instructions' example reports $100 in box 1 and $9 of earnings in 7d. Do not quietly add it to box 1 or treat it as taxable box 2a. |
| `box8_other` | **8a** other amount and **8b** percentage of annuity contract | Separate amount and percentage, including the 2026 optional actuarial-value reporting rule. Review Form 4972 mapping. |
| payer/recipient address lines | street, suite, city, state/province, country, postal code split | Preserve each printed field for the eventual TY2026 MeF attachment. |

## Calculation edges to build

1. Expand the dedicated 2026 item schema from its registered normal
   distribution branch to all relevant actual box fields. It already
   requires payer, recipient, gross and taxable amounts, 7a codes, and the
   7b IRA checkbox; unsupported codes and elections receive diagnostics. Do
   not expose the legacy 2025 box-7 shape as a second TY2026 input.
2. Classify each 7a code and 7b/7c flag before aggregating. Ordinary IRA
   distributions feed Form 1040 lines 4a/4b; pensions and annuities feed
   5a/5b; box 4 feeds 25b. Disability before minimum retirement age,
   rollovers, QCDs, Roth conversions, and designated Roth distributions
   require their documented routes. The code G pension-plan route now keeps
   gross and taxable amounts separate and marks line 5c rollover; other 4c/5c
   check boxes still need their calculation paths.
3. Feed Form 8606 for nondeductible IRA basis and Roth conversion, Form 5329
   for applicable additional tax through the **2026** Schedule 2 layout,
   and Form 4972 for an explicit lump-sum election. Reconcile every gross,
   taxable, and withholding amount against AGI and the printed 1040. The
   shared TY2025 node already has parts of these calculations, but its
   no-box-2a assumption and exclusion branches need source-by-source review.
4. Build the 2026 MeF 1099-R attachment only after comparing the current
   TY2026 XSD/rules with the pinned source fields. The May v1 package is
   research material; a current package is needed for element names and
   schema/rule acceptance. Check the 2026 1040 PDF's 4a/4b, 5a/5b, 5c,
   and 25b output and add ATS/source fixtures.

## Filing gates

- A straightforward fully taxable IRA and a fully taxable pension must
  reach the correct 1040/AGI lines and withholding totals from box facts.
  This graph and two-page PDF case now passes, including simultaneous
  SSA-1099 and W-2 withholding.
- A normal code 7 pension with a determined box 2a below box 1 now reports
  box 1 on Form 1040 line 5a and only box 2a on line 5b and in AGI. Box 5
  contributions or insurance premiums are preserved as source data. IRA
  distributions with basis still require Form 8606.
- A single-code G pension-plan direct rollover now prints its box 1 gross on
  Form 1040 line 5a, box 2a taxable amount on line 5b, and checks 5c(1).
  A zero-taxable rollover and a taxable rollover to a Roth account can be
  aggregated while only the taxable amount enters AGI. IRA code G, in-plan
  Roth details, and other rollover codes remain to map.
- Code 1 with the full amount subject to 10% now routes directly to 2026
  Schedule 2 line 5, then Form 1040 line 23 and the PDF, as allowed by the
  pinned [2026 draft Form 5329 instructions](corpus/draft/i5329.pdf). The
  source requires explicit full-tax and SIMPLE IRA first-two-years facts.
  An early SIMPLE IRA distribution within its first two years now takes the
  25% Part I route through Form 5329, Schedule 2 line 5, and a three-page
  draft Form 5329 attachment. A normal code 7 statement can coexist with
  this Form 5329 route. The direct 10% route still requires all 1099-R
  statements to carry code 1. See the [Form 5329 contract](FORM5329-GRAPH.md).
- Other rollover forms, early-distribution exceptions, IRA
  basis with Form 8606, and QCD with and without optional code Y need
  independent calculation fixtures.
- A box 7c or 7d Trump-account statement must take its own verified path or
  raise an explicit diagnostic. Box 8b may not be interpreted as a dollar
  amount.
- The output set must pass current TY2026 MeF XSD, business rules, PDF
  reconciliation, ATS, and TY2025 regression checks before product release.
