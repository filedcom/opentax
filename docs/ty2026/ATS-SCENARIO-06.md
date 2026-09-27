# TY2026 ATS Form 1040 scenario 6 fixture contract

Source: pinned [10-page IRS draft scenario 6 packet](corpus/ats/1040-scenario-06.pdf),
SHA-256 `43e5eeb8eb511cab7eda09148c57df9cdc962b0dcdb88365236536a408ba01fa`.
The independent source contracts are the January 2026 [Form W-2G](corpus/authorities/fw2g--2026.pdf)
(`2d75e44d5ea6574aec1c5b68884cdf1bd2bcc96f9f897a57c3b15cc691631168`)
and [its instructions](corpus/authorities/iw2g--2026.pdf)
(`79246b47e0e8a1224d56eb55cb85c15ee590c787f3551117550c83827e138115`).
Preserve **printed fact**, **independent expectation**, and **application
output** separately. Empty calculated fields are unknown, not printed zeros.

| PDF page | Printed source facts | Fixture route and verification |
| --- | --- | --- |
| 1 | Jeremy Davidson, SSN 400-00-1059, born January 20, 2008, U.S. citizen, may be claimed on his parents' federal return; partner in a gambling trade/business. Cover lists Form 1040, W-2, W-2G, Schedule 1, and Schedule E. | Preserve dependent and citizenship source answers. A business description is not a Schedule K-1, an SE earnings figure, or QBI evidence. |
| 2–3 | Single, Wyoming address, no dependents, digital-assets **No**; Form 1040 line 12a dependent box checked. The citizenship/work-authorization boxes are not visibly answered, despite the cover's citizenship statement. Money lines are blank. | Require a reconciled citizenship answer before e-filing. Calculate income, deduction, tax, payments, and refund from source facts; do not turn blanks into zero. |
| 4 | W-2 from Nona's Italian Kitchen, EIN 00-0000012: box 1 wages $2,300, box 2 federal withholding $985, box 4 Social Security tax $143, box 6 Medicare tax $33; box 12 code **TT $200**; box 14b tipped occupation code **102**. Boxes 3 and 5 are blank. | Wages → 1040 line 1a; withholding → line 25a. TT → 2026 Schedule 1-A overtime calculation if eligibility is satisfied, and then 1040 line 13a. Occupation code is not tip income: there is no box 12 TP or other tip amount. Do not reconstruct blank W-2 boxes 3/5 from FICA withholding. |
| 5 | W-2G from Lucky Bear Casino, TIN 00-0000013: box 1 winnings $2,200, box 2 date won February 15, box 3 Slot Machines, box 4 withholding **$0**, box 5 transaction 8888888, winner SSN 400-00-1059. Box 7 has no amount. | 2026 Schedule 1 **line 8b Gambling** $2,200. Box 7, when present, is *additional winnings from identical wagers*, not noncash winnings; add it once to reportable winnings. Box 4 → 1040 line 25b, with the printed zero preserved as source evidence. Personal W-2G winnings remain separate from the partnership Schedule E activity. |
| 6–7 | Schedule 1 monetary lines are unfilled. | Line 5 from Schedule E $1,200; line 8b from W-2G $2,200; line 9 $2,200; line 10 $3,400 → 1040 line 8. Do not put gambling on line 8z. |
| 8 | Schedule E Part I property rows unfilled. | No rental/royalty activity may be invented. |
| 9 | Schedule E line 26 is printed **$0**; line 27 **No** checked. Part II row A: Davidson and Davidson, EIN 00-0000022, partnership type P; column (i) nonpassive allowed loss $1,000 and column (k) nonpassive income $2,200. Rows' (e)/(f) boxes are unchecked. | Preserve separate row columns and the printed Part I zero. Derive line 30 nonpassive income $2,200, line 31 allowed nonpassive loss ($1,000), and line 32 net $1,200. Do not net the two source columns before loss limitation and K-1 reconciliation. The packet includes no K-1, outside-basis, at-risk, or loss-carryforward evidence. |
| 10 | Schedule E remaining Parts III–V and their monetary rows are unfilled. | Part V line 41 $1,200 → Schedule 1 line 5 exactly once. No farm rental, trust, or REMIC activity. |

The directly supported income bridge is **$5,700 total income**: W-2 wages
$2,300 plus Schedule 1 income $3,400. This is a provisional derived amount;
the packet prints no Form 1040 income total. The $985 W-2 withholding is the
only positive federal withholding printed.

The dependent standard deduction needs an earned-income classification, not
only the dependent checkbox. [Rev. Proc. 2025-32](corpus/authorities/rp-25-32.pdf)
sets the 2026 dependent floor at $1,350 and adds $450 to earned income, capped
at the $16,100 single base. W-2 wages alone imply **$2,750**, but the packet
does not include enough K-1 facts to decide whether any partnership amount is
earned income for this purpose. Preserve that as an explicit fixture gate.
Likewise, code TT supports a provisional **$200** Schedule 1-A overtime source
amount, but eligibility and its final line 44 require the Schedule 1-A
calculation; the cover does not list the schedule. Confirm whether the
completed return must attach it. Assess Form 8615, Schedule SE, and QBI from
their own source and applicability rules instead of inferring their absence
from the cover's attachment list.

## Current graph and source-contract gaps

- The shared [W-2G node](../../forms/f1040/nodes/inputs/w2g/index.ts)
  labels box 2 as wager type, box 3 as identical winnings, and box 7 as
  noncash winnings. The January 2026 W-2G labels these **date won**, **type of
  wager**, and **winnings from identical wagers**. Its box 1 plus box 7 sum is
  plausible, but the input contract, validation, and provenance are wrong.
  It emits gambling to shared Schedule 1 line 8z and is not registered in the
  2026 graph. Create a dedicated 2026 W-2G record and emit to 2026 Schedule 1
  line 8b; reconcile Form 1040 line 25b without double counting.
- The [2026 Schedule 1 sink](https://github.com/filedcom/opentax/blob/b7c07b616564167a91bc588dba05caab2a28e054/forms/f1040/2026/nodes/schedule1.ts)
  lacks `line8b_gambling`. Add it to its schema and line 9 sum, with distinct
  PDF and MeF field mapping. The sink explicitly rejects the stale
  `line8b_savings_bond_exclusion` key; do not reuse that key for gambling.
- The shared [partnership K-1 node](../../forms/f1040/nodes/inputs/k1_partnership/index.ts)
  routes amounts directly to Schedule 1. It neither fills Schedule E Part II
  nor proves allowed losses. Build a per-activity K-1/limitation result feeding
  Schedule E columns (i)/(k), then aggregate Schedule E line 41 once. Keep
  the ATS row as a printed-summary fixture with missing K-1 provenance until
  underlying records can be supplied.
- The dedicated [2026 standard deduction](https://github.com/filedcom/opentax/blob/b7c07b616564167a91bc588dba05caab2a28e054/forms/f1040/2026/nodes/standard_deduction.ts)
  already requires `dependent_earned_income`; this fixture must supply a
  source-backed value. The existing W-2 TT → Schedule 1-A graph is a useful
  route, but the final PDF and XML must include the schedule when claimed.

## End-to-end acceptance order

1. Encode every printed source field, checkbox, explicit zero, and absence in
   a typed fixture with page and packet hash. Mark missing K-1 and citizenship
   answer distinctly from a blank calculated amount.
2. Correct the 2026 W-2G input contract and Schedule 1 line 8b path. Build the
   Schedule E Part II activity with separate nonpassive income and allowed
   loss, source/limitation evidence, line 32/41 reconciliation, and no duplicate
   Schedule 1 income. Verify $5,700 total-income bridge independently.
3. Resolve dependent earned income, overtime deduction, Form 8615/SE/QBI
   applicability, final tax, and settlement using current 2026 authorities.
   Derive any new attachments from those rules and reconcile them with the
   cover's list; do not force the list to be exhaustive.
4. Render Form 1040, Schedule 1, Schedule E, and any required Schedule 1-A or
   other attachments. Inspect checked boxes, W-2G gambling line, partnership
   columns, 1040 income/deduction/withholding, and attachment order.
5. Generate XML from the same calculated return. Validate against the current
   authorized TY2026 MeF XSD and business rules, including required W-2G and
   partnership activity records, then run ATS and TY2025 regression fixtures.

The [May v1 MeF drift review](MEF-V1-DRIFT.md) remains a release gate: that
package cannot establish conformance with the September TY2026 MeF version.
