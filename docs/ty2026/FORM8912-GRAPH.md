# TY2026 Form 8912 tax-credit bond contract

Current continuous-use authority: [Form 8912 (Rev. December 2024)](corpus/authorities/f8912--2024.pdf),
SHA-256 `0c083a7452a2d973a2a9d7fcecacbb1c0db1157bfcc30968b0b1b97c3430d912`,
and [instructions (Rev. December 2024)](corpus/authorities/i8912--2024.pdf),
SHA-256 `8d4a48b71c4c1d3873b6488b5a4684d87d510d584d9f30a2beb353d0896343bd`.
The instructions explicitly designate this as a continuous-use form.
The pinned [2026 Schedule 3 draft](corpus/draft/f1040s3.pdf) still has
Form 8912 on line 6k. Recheck the current IRS product, final Schedule 3
and 2026 MeF XSD/rules before filing.

## Source ledger and form contract

Keep each pre-2018 bond with type (CREB, NCREB, QECB, QZAB, QSCB, BAB),
issuer/EIN and CUSIP or unique identifier, issue/acquisition/disposition/
maturity dates, owner or pass-through source, each credit-allowance date,
principal or BAB interest payable, published credit rate, Form 1097-BTC
monthly amounts, purchase/sale accrued interest and basis, direct-payment
election, and carryforward by bond/origin year. Bonds issued after 2017
are ineligible for new holder credits, but a holder can still earn credits
on older bonds. Do not double-count a credit received both through a
partnership K-1 and Form 1097-BTC.

| Area | Calculation and return route |
| --- | --- |
| Parts III–IV | Part III lists each Form 1097-BTC issuer/unique ID and credit. Part IV derives unreported bond credits from allowance-date principal or interest, rate and percentage; NCREB/QECB line 20 receives the 70% factor. Continue the printed rows as needed. Reconcile deemed interest with Schedule B/1040 line 2b and acquisition/disposition accrued interest. |
| Part I, lines 1–4 | Bring Part III line 14, Part IV line 20, and eligible prior-year carryforwards into total tentative credit. The printed line 3 still says carryforward “to 2021”; the 2024 instructions describe prior-year qualified-bond/BAB carryforward generically. Verify this wording against current IRS/MeF guidance rather than hardcoding 2021. CREB and pre-October-2008 QZAB credits cannot carry forward. |
| Part II, lines 7–12 | For individuals, line 7 is 1040 line 16 plus Schedule 2 line 1z; line 8 is Form 6251 line 11. Subtract foreign, other prior-order, Form 3800 and prior-year minimum-tax credits on lines 10a–d. Apply the special taxable-income limitation where required for a pass-through CREB, then send allowable line 12 to 2026 Schedule 3 line 6k, Schedule 3 line 8, and 1040 line 20. Preserve unused credit by eligible bond and year. |

Part II needs **finalized return lines** from 1040, Schedule 2, Form 6251,
Schedule 3 and Form 3800. It cannot be safely calculated from only a bond
amount before the credit-order graph is resolved. The 2026 Schedule 3
credit sequence and current Form 3800 amount are explicit dependencies.

## Current code boundary

- The shared `f8912` node already validates many bond types/issue windows,
  reconciles Form 1097-BTC monthly amounts, derives Part III/IV tentative
  credit and deemed interest, and sends pending credit plus Form 6251 work.
  TY2025 has a 3-page PDF descriptor and `IRS8912` serializer with a
  finalized-return reconciliation. The [current PDF inventory](pdf-fields-f8912.csv)
  has **218 terminal widgets** across three pages. These are strong reuse
  baselines, not a TY2026 registration or current XML proof.
- The input schema limits carryforward `origin_tax_year` to **2024**;
  a 2025-origin unused credit carried into 2026 cannot pass. The node and
  PDF/MeF builders reject pass-through CREB credits rather than applying
  their distinct taxable-income formula. The serializer uses TY2025 XSD
  names and pending paths. Its Schedule 2 line 1z value is inferred from
  a 1040 aggregate less Form 6251; derive it directly from the 2026
  Schedule 2 output and reconcile both totals.
- Form 8912 and its source node have no TY2026 registry, PDF or MeF route.
  Review the 2024 form's old “to 2021” line 3 caption against current
  accepted-form rules, but keep its generic carryforward instruction as
  the calculation starting point.

## Build order and acceptance

1. Confirm the continuous-use form/instructions and 2026 MeF document and
   business rules; compare 2026 Schedule 2/3/1040/Form 6251/Form 3800
   destinations and the line 3 carryforward rule.
2. Extend source-year bounds and bond-level carryforward history through
   2025/2026. Resolve pass-through CREB allocation/taxable-income limits,
   issuer direct-payment and bond interest/basis before the credit order.
3. Reuse and verify Parts I–IV calculations against current source rows;
   derive Part II from finalized 2026 lines and reconcile line 12 to
   Schedule 3 line 6k exactly. Preserve unused credits without claiming
   ineligible CREB/pre-2008 QZAB carryovers.
4. Fill/render all 218 fields/continuations and emit current `IRS8912`
   with active XSD/reject tests. Cover Form 1097-BTC and no-1097 bond,
   multi-bond, BAB and 70% factors, purchase/sale interest, 2025-origin
   carryforward, pass-through CREB, credit-order limit, and TY2025
   regression.

This is a research and implementation contract, not registered TY2026
filing support.
