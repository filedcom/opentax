# RRB-1099-R — Scratchpad

## Purpose
RRB-1099-R is issued by the Railroad Retirement Board (RRB) to report railroad retirement
benefits that include two distinct income streams treated differently on Form 1040:
1. SSEB/Tier 1 SS-equivalent — taxed like Social Security (→ line 6a via SS Worksheet)
2. Non-SSEB/Tier 2 + non-SS Tier 1 — taxed like pension/annuity (→ lines 5a/5b)

Distinct from regular Form 1099-R (no distribution codes; different box numbering).
Distinct from RRB-1099 (which covers Tier 1 non-SSEB as SS-equivalent — SSA-1099 type).

## Fields identified
- payer_name: string (required)
- box3_sseb_gross: SSEB/Tier1 SS gross amount paid
- box4_sseb_repaid: SSEB/Tier1 SS repaid to RRB in year
- box5_sseb_net: Net SSEB (Box3 - Box4), precomputed by RRB; use when provided
- box6_medicare_premiums: Medicare Part B deducted (informational; potentially Schedule A)
- box7_sseb_withheld: Federal tax withheld from SSEB/Tier1 → line 25b
- box8_tier2_gross: Gross non-SSEB (Tier2 + non-SS Tier1) → line 5a
- box9_tier2_taxable: Taxable non-SSEB → line 5b (when SM not used)
- box10_tier2_withheld: Federal tax withheld from non-SSEB → line 25b
- box2a_taxable_amount: SM-computed taxable amount (overrides box9)
- box5b_employee_contributions: Cost in contract for SM cost recovery
- simplified_method_flag: boolean
- age_at_annuity_start: for SM table lookup
- prior_excludable_recovered: cost already recovered in prior years

## Open Questions
- [x] Q: What fields does this node capture?
- [x] Q: Where does each field flow on the 1040?
- [x] Q: What are the TY2025 constants? → SM table unchanged; no inflation-adjusted RRB constants in Rev Proc 2024-40
- [x] Q: What edge cases exist? → repayment > gross → floor 0; SM fully recovered; no income → no output
- [x] Q: What upstream nodes feed into this node? → N/A (INPUT node)

## Sources checked
- [x] IRS Pub. 575 (2025 draft) — Railroad Retirement Benefits, Simplified Method
- [x] IRS Pub. 915 (2025 draft) — Social Security and Equivalent Railroad Retirement Benefits
- [x] Rev Proc 2024-40 — TY2025 inflation adjustments (no RRB-specific constants)
- [x] Drake KB screen "RRB" — RRB-1099-R data entry fields
- [x] Form RRB-1099-R instructions (RRB.gov)
