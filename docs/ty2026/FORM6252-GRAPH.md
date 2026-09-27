# TY2026 Form 6252 installment-sale contract

Source snapshot: [draft 2026 Form 6252 **and its instructions on pages
2–4**](corpus/draft/f6252.pdf), SHA-256
`021eb4aa9512a3291e2ab5429470c0b1afff697f5ac8b5a9f087215fe0b1a62f`.
[Publication 537 (2025)](corpus/authorities/p537--2025.pdf),
SHA-256 `2bca1db38d6d34e814bfd7e11bde7530be34d481f23a6583fc2d7ee26ebfce88`,
is a prior-year comparator for contingent price, multi-asset sales,
repossession and obligation dispositions. **Correction to the source
inventory:** no separate 2026 `i6252` file is needed for the draft; its
instructions are embedded in `f6252.pdf`. They contain stale references to
Form 4797 line numbers; resolve those against final 2026 sources before
coding. Obtain final Form 6252, Publication 537 and MeF rules before filing.

## Sale and obligation ledger

Maintain one Form 6252 **per sale**, across every year of its installment
agreement, including a year without a payment and the final-payment year.
The stable sale ID links seller/owner, asset(s), buyer and relationship,
dates, sale-year property classification and holding period, sale price and
whether determinable, debt assumed, adjusted basis, selling costs, excluded
main-home gain, Form 4797 depreciation recapture, historical gross-profit
percentage and contract price, current/prior payments, interest/OID,
deemed payments, remaining obligation basis and unpaid gain, pledged debt,
resale by a related party, repossession, disposition of the obligation and
any election out. Split a single contract covering several assets into
asset-level basis/recapture before the Form 6252 record; preserve the
contract's overall reconciliation. Do not rederive an old sale's ratio from
current-year basis or classify its gain using a current-year use change.

Eligibility matters before math: losses do not use the installment method;
the draft instructions also exclude specified established-market securities
sales, some related-party depreciable-property sales and timely elections
out. Interest, original-issue discount, unstated interest and carrying
charges are separate income sources, not Form 6252 payments or gross profit.
For a contingent selling price, obligation disposition, repossession,
pledge-rule deemed payment or §453A deferred-tax interest, retain the
underlying facts and apply the final instructions/[Publication 537](corpus/authorities/p537--2025.pdf)
rules rather than entering a guessed contract price.

## Printed lines and destinations

| Section / lines | Calculation and cross-form evidence |
| --- | --- |
| Header, 1–4 | Property code/description and acquisition/sale dates; related-party and determinable-price answers. Related-party sales require Part III in the sale year and following two years unless final payment is received, subject to the printed conditions. |
| I, 5–18 | Selling price including assumed debt, less debt at lines 6–7; cost, depreciation, adjusted basis, selling costs and **sale-year Form 4797 Part III recapture** at lines 8–13; gross gain at 14, home-sale exclusion at 15, gross profit at 16 and contract price at 18. If line 14 is zero or less, report the sale on the applicable disposition form instead. The §1245/1250 recapture at line 12 is recognized in the year of sale **even with no cash payment**, then removed from deferred gross profit. |
| II, 19–26 | Use the **sale-year** gross-profit percentage on line 19 in later years. Line 20 is the sale-year excess assumed debt; lines 21–23 separate current cash/FMV receipts and prior-year/deemed receipts, excluding interest. Line 24 is current taxable installment income. Line 25 separates eligible ordinary recapture under §§1252/1254/1255 or remaining old recapture, capped by line 24, with excess carried forward; line 26 goes to Schedule D or Form 4797 based on property character and holding period. The current draft's embedded line-25/26 instructions cite old Form 4797 line numbers; reconcile with the [2026 Form 4797 draft](FORM4797-GRAPH.md). Long-hold business §1231 portion goes to its line 4; short-hold/ordinary property requires the correct Part II row, not a Schedule D substitute. |
| III, 27–37 | Identify the related party and second disposition. Lines 29a–e test printed exceptions, including dates and an explanation for the non-tax-avoidance branch. If no exception, derive deemed payment from related-party resale amount, original contract price, payments already received, and original gross-profit percentage; split ordinary amount at line 36 and remaining gain at 37. Store deemed payment in the history so it is **not recognized again** when actual cash arrives. |

Reconcile gain to [Form 4797](FORM4797-GRAPH.md), [Schedule D](CAPITAL-GAIN-GRAPH.md)
and the [Form 4562 asset ledger](FORM4562-GRAPH.md). A Part III recapture
amount may arise before any installment payment and may feed Form 4797;
the remaining installment gain then feeds the correct Part I or Part II
Form 4797 line or Schedule D. Avoid adding both the sale price and the
installment recognition to income. Track gross-profit percentage, payments,
deemed payments, recapture not yet reported and obligation basis into 2027.

## Current code boundary

- Shared `calculateInstallmentSale` derives lines 5–26 for a **determinable**
  price but rejects a sale after **2025** and computes line 20 only when
  sold in 2025. It treats line 25 as **always zero**; the corresponding node
  and TY2025 MeF reject depreciated properties and linked recapture detail.
  There is no Part III related-party calculation, contingent-price branch,
  deemed-payment or obligation-disposition history.
- The shared node can accept aggregate gross profit and contract price
  without sale facts, defaults property to a capital asset, and sends
  long-term gain through Schedule D `line_11_form2439`. That source key
  overlaps Form 2439. It sends long-term business gain to Form 4797 but
  rejects short-term business property; the filed route needs the actual
  property classification and a source-specific Schedule D value.
- TY2025 MeF emits only an unrelated-party, determinable-price sale and
  checks its Form 4797 line 4/limited Schedule D sources. TY2025 PDF maps
  only five aggregate inputs. The [2026 draft inventory](pdf-fields-f6252.csv)
  has **49 terminal widgets**, all in the field tree, on the printed form
  page; pages 2–4 contain instructions and the draft cover is separate.
  `form6252` is absent from the TY2026 registry/PDF builder and has no
  TY2026 MeF or current-rule validation.

## Build order and acceptance

1. Confirm final 2026 Form 6252 and Publication 537; resolve the embedded
   draft instruction's stale Form 4797 line references. Select current MeF
   XSD/rules and confirm multiple form instances, related-party selections,
   statements and prior-year ratio representation.
2. Build the persistent sale/obligation ledger and eligibility decision.
   Link asset basis/depreciation and sale-year recapture to Form 4797 before
   computing the nonrecaptured gross-profit percentage. Calculate Parts I,
   II and, when needed, III from that ledger; preserve payments/deemed
   payments and remaining recapture by origin year.
3. Route current gain once to Form 4797 Part I/II or Schedule D by actual
   character and holding period, with ordinary recapture separate. Fill and
   render all 49 PDF widgets, including checkboxes and explanations; build
   2026 MeF instances from the same printed-line results. Reconcile XML,
   PDF, source forms, return totals and next-year obligation state.
4. Test sale year with no payment but §1245 recapture, a later zero-payment
   year, final payment, assumed debt exceeding basis, main-home exclusion,
   short/long business and capital sales, multiple asset classes, contingent
   price, loss/election-out exclusions, related-party resale with and without
   each printed exception, a pledge/deemed payment, obligation disposition
   and repossession. Run TY2025 shared-code regressions and complete TY2026
   return fixtures.

This is the research and implementation contract, not filed TY2026 support.
