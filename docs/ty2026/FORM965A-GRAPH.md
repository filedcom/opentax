# TY2026 Form 965-A liability and installment graph

Snapshot: September 27, 2026. The IRS still lists the January 2021
[Form 965-A](corpus/authorities/f965a--2021.pdf) and
[instructions](corpus/authorities/i965a--2021.pdf) as current. Their SHA-256
hashes are `ec389e548af6627533adba1293017a5cc101e41b1ae237de608eae7efa09a446`
and `c6f7b4a89f68261975754572be6bd55b0e29ab642fe14017cbf92e7f37a9bef1`.
The form has [413 AcroForm fields/widgets](pdf-fields-f965a.csv). This
continuous-use revision is the 2026 comparator until superseded.

## Source facts and calculation

- Form 965-A is a cumulative report for an individual (or similarly taxed
  entity) with a net section 965 liability remaining unpaid at any point in
  the reporting year, including an S corporation deferred amount. Its Part I
  records the original 2017–2020 inclusion, liability assumed or later
  triggering event; net tax with/without section 965; deferred S corporation
  amount; installment election; amount payable immediately; transfer or
  adjustment; and counterparty TIN. The 2026 source is the **prior-year
  liability ledger**, election and transfer/trigger records, not a fresh
  2026 transition-tax inclusion.
- Part II preserves payments for each of the eight installment years,
  remaining unpaid liability, and column (k), the payment for this reporting
  year. The standard schedule is 8% in each of years 1–5, then 15%, 20% and
  25%. The instructions require **actual payments** when they differ from
  that schedule, and describe proration of later adjustments. Derive the
  current-year amount from each liability's own start/trigger year; reconcile
  beginning liability, transfers, adjustments, cumulative payments and
  ending balance. A 2017 inclusion normally reaches year 8 in 2024, a 2018
  inclusion in 2025, a 2019 inclusion in 2026, and a 2020 inclusion in 2027
  when calendar years and the general schedule apply. A later S corporation
  trigger can start a new eight-year sequence.
- Part III retains each S corporation's original computation and deferral
  election. Part IV carries the deferred liability by corporation, including
  beginning balance, amount triggered, transfer and end balance. Do not turn
  an untriggered Part IV balance into current tax. Preserve additional-sheet
  rows and attached transfer/adjustment statements.

## 2026 return route and source conflict

The pinned [2026 Schedule 2 draft](corpus/draft/f1040s2.pdf) explicitly
prints **line 12** as “Section 965 net tax liability installment from Form
965-A”; [its PDF field](pdf-fields-f1040s2.csv) is on page 2. The same draft
instructs line **15** to add lines **4 through 11 and line 14**, omitting line
12. Treat that as a source inconsistency: map the amount to the printed line
12, but do not silently include or exclude it from line 15 or Form 1040 line
23 until final 2026 Schedule 2 instructions/form or a correction resolves
the total. The 2021 Form 965-A instructions still refer to Schedule 2 **line
9 for TY2020**; that stale destination is not the TY2026 authority.

The shared [`f965` node](../../forms/f1040/nodes/inputs/f965/index.ts)
accepts a manually supplied `current_year_installment` per row, sums it,
and sends it to the TY2025 Schedule 2 `line9_965_net_tax_liability` key.
Its “TY2025 final year” comment only considers one original inclusion year
and is inaccurate for later inclusions and triggers. The TY2026 registry has
no `f965` route, and the TY2025 PDF and MeF inventories have no Form 965-A
serializer. A new 2026 graph should own the ledger and output; do not reuse
the old Schedule 2 key or assume that PDF/MeF exists.

## Build and acceptance

1. Confirm current Form 965-A, its instructions, the final 2026 Schedule 2
   line 12/15 arithmetic, and active TY2026 MeF XSD/business rules before
   enabling this route.
2. Build owner- and liability-keyed Part I–IV source records with prior-year
   balances, transfer/trigger evidence, actual payment history and amended
   adjustments. Calculate or validate the reporting-year installment and
   reconcile the ledger.
3. Add a 2026 Schedule 2 line 12 producer and confirmed total/1040 route;
   render every required Form 965-A page and additional sheet/statement.
   Serialize the current MeF Form 965-A/related attachments with the return.
4. Test a 2019 inclusion paid in 2026, a triggered S corporation deferral,
   liability transfer, adjusted installment, year with no payment but
   outstanding balance, amended report and an additional-sheet case. Compare
   the printed PDF, XML, Schedule 2 and 1040 totals, and retain TY2025
   regression results.
