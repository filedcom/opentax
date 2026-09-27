# TY2026 clean vehicle credit and dealer-transfer contract

Sources: pinned [2026 draft Form 8936](corpus/draft/f8936.pdf), SHA-256
`6a9cf4ed1f329541950bb822c0771c10529b7d4d2c1089f3f1ddd109fa0f1e27`,
[2026 draft Schedule A](corpus/draft/f8936sa.pdf), SHA-256
`a654516609524f2b7f4ec475e50aff6ac5c9470e42f20672fa03488b408d2524`,
and [combined 2026 draft instructions](corpus/draft/i8936.pdf). Recheck
final versions and the current MeF package before filing. The expected
separate Schedule A instruction URL is absent because the combined Form
8936 instructions explicitly cover Schedule A.

## Acquisition and credit routes

The three credits remain possible on a **2026 return** only for a vehicle
treated as acquired **on or before September 30, 2025**, then placed in
service during 2026. The instructions define acquisition by a **written
binding contract plus payment**; a nominal down payment or trade-in can be
payment. An acquisition after that date does not qualify merely because the
seller report or order began earlier. Preserve contract date, payment proof,
2026 service date, seller report, VIN and owner. Each vehicle needs its own
Schedule A; a dealer transfer still requires both forms on the return.

| Source / calculation | Form 8936 and Schedule A route | Filed handoff |
| --- | --- | --- |
| Current and prior MAGI | Form 8936 lines 1a–5 use 2026 and 2025 AGI, excluded Puerto Rico income, Form 2555 **lines 45 and 50**, and Form 4563 line 15; preserve each year's filing status. Threshold can be met by either year's MAGI. | New vehicle limit $150k single/MFS, $225k HOH, $300k MFJ/QSS; previously owned limit $75k/$112.5k/$150k. Source Form 2555 amounts must match their filed attachment; see [its contract](FORM2555-GRAPH.md). |
| New personal and business use | Schedule A Part I lines 1–5 and Part II/III lines 8–12: verify seller report, 30-day resale, ownership/use, MSRP/manufacturer requirements, tentative credit and business-use fraction. Do not claim the same VIN under new and commercial routes. | Business/investment amount → Form 8936 line 8 → Form 3800 Part III line **1y**; personal amount → Form 8936 line 13 after tax limit → Schedule 3 line **6f**. Reduce vehicle basis by Schedule A line 9 when the credit is claimed or transferred. |
| Previously owned personal use | Schedule A Part IV lines 13–17: dealer/first eligible transfer, model-year age, $25k price, three-year prior-credit rule, dependent answer, U.S. use and 30-day resale. Credit is lesser of 30% of sales price or $4,000 before MAGI/tax limits. | Form 8936 line 18 after credit limit → Schedule 3 line **6m**. Reduce basis by Schedule A line 17 when claimed or transferred. No second benefit for the same VIN. |
| Qualified commercial vehicle | Schedule A Part V lines 18–26: depreciable character, acquisition for use/lease, GVWR, cost less §179, 15%/30% amount, incremental cost and $7,500/$40,000 ceiling; identify any elective-payment registration. | Form 8936 line 21 → Form 3800 Part III line **1aa** and its applicable limitations/election. Reduce basis by Schedule A line 26 when claimed or transferred; coordinate depreciation with Form 4562. |
| Dealer transfer and repayment | Schedule A line 4a seller-reported transfer amount, line 4b directed repayment check, and the applicable line 8/13 disqualification answer. The transferred amount is **not** a second Schedule 3 credit. | Disallowed transferred new credit → Schedule 2 **line 1b**; disallowed transferred previously owned credit → **line 1c**. File Form 8936/Schedule A even if the credit was fully received at sale. |

The 2026 PDF inventories are [Form 8936, 31 widgets](pdf-fields-f8936.csv)
and [Schedule A, 65 widgets](pdf-fields-f8936sa.csv), all in their field
trees. The Schedule A draft has a coversheet and three form pages. Render one
copy per vehicle, including the transfer indicator and all answers that led
to a stop/repayment decision. The TY2025 descriptor and serializer are
references only; the current TY2026 XSD must determine XML groups, multiple
vehicle order, dealer report evidence and Form 3800 links.

## Current code boundary

- `f8936` is **not registered** in `forms/f1040/2026/registry.ts`. The shared
  input has the September 30, 2025 acquisition cutoff but
  `requireVehicleFacts()` accepts only service dates beginning `2025-`.
  Thus it rejects the defining eligible 2026 case. Require 2026 service
  dates in the 2026 filing path, with both valid dates and contract/payment
  evidence.
- The shared node models new and previously owned personal credits only.
  It blocks dealer transfer with business use and has no commercial vehicle
  credit/§179/incremental-cost path. It sends allowed personal amounts
  directly to TY2025 Schedule 3 and repayments to TY2025 Schedule 2;
  Form 3800 and the dedicated 2026 credit resolver are absent from that
  path.
- The old output key for a used dealer repayment is
  `line1c_prev_owned_clean_vehicle_repayment`; the dedicated TY2026
  Schedule 2 input requires `line1c_used_clean_vehicle_repayment`. The
  names describe the same printed line but are **not** interchangeable
  pending keys. The 2026 Schedule 3 input can receive lines 6f/6m, but it
  needs the source-backed Form 8936 tax limit and credit priority.
- The TY2025 filed-line helper expects a 2025 1040 AGI key and selected
  TY2025 Schedule 3 amounts. The 2026 form explicitly uses 1040 line 11a
  for current/prior MAGI and Form 2555 line 45/50 addbacks; derive those
  from the year-specific return and prior-year record. Avoid calculating
  two credits against the same available tax.
- There is no TY2026 Form 8936/Schedule A PDF builder or MeF serializer.
  The TY2025 versions must be audited against the 2026 layouts and current
  XSD, including Schedule A Part V and dealer transfers.

## Build and acceptance order

1. Add vehicle-level source records keyed by VIN and taxpayer/activity ID,
   with binding-contract and payment dates, seller report, acquisition and
   service dates, credit transfer and price details. Reject duplicate VIN
   claims, post-cutoff acquisition, missing seller report and incompatible
   new/used/commercial classifications with explicit diagnostics.
2. Derive 2026/prior MAGI from actual 1040/2555/4563 values. Compute each
   Schedule A path, allocate business/personal use and dealer repayment,
   then apply the 2026 Form 8936 personal tax limits. Send business and
   commercial credits through the [Form 3800 graph](GENERAL-BUSINESS-CREDIT-GRAPH.md),
   personal credits through Schedule 3, and repayments through Schedule 2.
   Reconcile basis reduction with depreciation records.
3. Render the complete 2026 Form 8936 and every Schedule A, then build
   current TY2026 MeF XML with actual XSD element names and business rules.
   Reconcile Form 3800, Schedule 2/3, 1040 and each vehicle's seller report.
4. Test acquisition **September 30 versus October 1, 2025**, both with
   2026 service; 2025 versus 2026 service; current versus prior MAGI; dealer
   transfer allowed/disallowed; 30-day resale; mixed business/personal
   use; previously owned three-year/price/dependent rules; qualified
   commercial incremental cost and GVWR; and duplicate VIN/credit choice.
   Run TY2025 regression on its existing route.
