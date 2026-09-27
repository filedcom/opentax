# TY2026 Schedule J farm/fishing income-averaging graph

Snapshot: September 27, 2026. The IRS [2026 Schedule J draft](corpus/draft/f1040sj.pdf)
is pinned at SHA-256 `3a98f9c8e1d3a936a28ddd60a4ba6c51ba5438c53a4699cf1137f106824545b4`;
its [27 PDF widgets](pdf-fields-f1040sj.csv) cover both filed pages and
lines 1–23. The currently available [Schedule J instructions](corpus/authorities/i1040sj--2025.pdf)
are **TY2025 only**, pinned as a method comparator at SHA-256
`c5152385331a2ed517245a89a1ba597f0493b240dfe57edec1416e16baa3f870`.
The expected draft instruction URL still serves 2025. Obtain 2026
instructions and current MeF rules before finalizing the election.

## Source and calculation contract

- The election applies to an individual with taxable farming or fishing
  income. Keep each current-year Schedule F, Form 4835, pass-through and
  disposition item with activity/source ID, taxable amount, and whether it
  qualifies for elected farm income. Line 2a is the elected portion, capped
  by 2026 1040 line 15 taxable income (line 1). Preserve capital-gain
  components separately: line 2b net long-term gain over net short-term loss
  included in the election, and line 2c its unrecaptured §1250 gain. These
  affect the tax-rate calculations; a single elected-income total is not
  sufficient.
- Load **2023, 2024 and 2025** base-year return state, including taxable
  income, section 1 tax, prior Schedule J use, and the exact prior Schedule J
  lines named on the 2026 form. Lines 5/9/13 may use different prior-year
  Schedule J lines when a base year itself used averaging. Lines 19/20/21
  likewise select prior Schedule J tax lines or prior Form 1040 line 16.
  Do not substitute a plain taxable-income or tax value when the printed
  conditional route names another source. Line 21 limits prior 1040 line 16
  to tax imposed by section 1; preserve its component breakdown.
- Line 3 subtracts elected income from current taxable income and line 4
  computes its **2026-rate** tax. Line 6 allocates one-third of elected
  income to each base year. Lines 7/8, 11/12 and 15/16 recompute with
  **2023, 2024 and 2025** tax rates respectively, including the applicable
  preferential-rate worksheets and any printed negative-income handling.
  Line 17 totals the four taxes, line 22 totals the three base-year taxes,
  and line 23 is their difference.
- Compare line 23 with the taxpayer's ordinary 2026 tax-table,
  tax-computation, qualified-dividend/capital-gain or Schedule D worksheet
  result. Attach Schedule J and use its line 23 on Form 1040 line 16 **only
  if** the taxpayer uses this election. Keep the alternative calculation
  for an informed choice and for reconciliation with AMT and credit-limit
  worksheets.

## Current implementation boundary

The shared [`schedule_j` node](../../forms/f1040/nodes/inputs/schedule_j/index.ts)
accepts `schedule_j_tax` as a caller-supplied answer and writes it to the
TY2025 Form 1040 line 16 key. It identifies its base years as 2022–2024,
not 2023–2025, and accepts only three undifferentiated prior taxable-income
numbers, missing the prior Schedule J conditional lines and base-year taxes.
It neither computes the four annual rate results nor compares line 23 with
the regular 2026 tax. The TY2025 PDF and MeF inventories have no Schedule J
serializer. This node cannot be a TY2026 filed calculation by registration.

## Build and acceptance

1. Pin final 2026 instructions and the current MeF document/rules; map
   farming/fishing sources, base-year election records, tax-rate worksheets,
   negative-income rules and line 2b/2c treatment to their exact instructions.
2. Build an election record with the three base-year returns and explicit
   selected prior-form lines. Compute all 23 filed lines and the competing
   regular-tax result, then choose one authoritative producer for 1040 line
   16. Prevent a user-entered `schedule_j_tax` from bypassing arithmetic.
3. Render both pages from the pinned 27-widget map; serialize the current
   MeF Schedule J and reconcile its line 23 with 1040 line 16 and the rest of
   the return's income-tax/credit calculation.
4. Test no prior averaging, averaging in 2025 only, averaging in 2024 but
   not 2025, a 2023-only base-year election, preferential gain, negative
   base-year income, non-section-1 prior tax on line 16 and a case where the
   regular 2026 tax is lower. Retain TY2025 regression evidence.
