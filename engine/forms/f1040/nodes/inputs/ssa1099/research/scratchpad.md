# SSA-1099 Social Security Benefit Statement — Scratchpad

## Purpose
Captures Social Security benefit amounts from SSA-1099/RRB-1099 and routes net benefits to Form 1040 line 6a and federal withholding to line 25b.

## Fields identified (from IRS 1040 instructions + Publication 915)

- **Box 3**: Total social security benefits paid to you in 2025
- **Box 4**: Amount of any benefits you repaid in 2025
- **Box 5**: Net benefits (Box 3 minus Box 4) — enters Form 1040, line 6a
- **Box 6**: Federal income tax voluntarily withheld (W-4V) — enters Form 1040, line 25b

Additional fields (informational in Drake):
- Payer name (SSA or RRB)
- RRB flag (RRB-1099 treated same as SSA-1099 for taxability)
- Lump-sum year flag (for prior-year lump-sum election — triggers special calculation, out of scope for this input node; handled by intermediate SS taxability node)

## Open Questions
- [x] Q: What fields does Drake show for this screen?
  - Box 3 (gross benefits paid), Box 4 (repaid), Box 5 (net = 3-4), Box 6 (federal withheld)
  - Source: IRS Form 1040 instructions, Lines 6a/6b section + Line 25b section
- [x] Q: Where does each box flow on the 1040?
  - Box 5 (net benefits) → Form 1040, line 6a (gross SS amount shown)
  - Box 6 (withholding) → Form 1040, line 25b (withheld from 1099s)
  - Taxable portion (line 6b) computed by separate intermediate SS taxability node
  - Source: IRS Form 1040 instructions
- [x] Q: What are the TY2025 constants?
  - MFJ base: $32,000; Single/HOH/QSS/MFS-apart: $25,000; MFS-together: $0
  - 85% tier: $44,000 (MFJ), $34,000 (single/HOH)
  - Source: IRS Form 1040 instructions, Social Security Benefits Worksheet
- [x] Q: What edge cases exist?
  - Repayments exceed gross (Box 4 > Box 3) → net is negative → no benefits taxable, box 5 = 0
  - MFS-lived-together: all benefits potentially 85% taxable (no base amount exclusion)
  - Lump-sum prior-year amounts: special election under Pub 915 (out of scope for input node)
  - Workers' comp offsets reduce Box 3 before SSA computes Box 5
  - RRB-1099 treated identically for taxability purposes

## Sources to check
- [x] Drake KB article — SSA KB inaccessible; authenticated; derived from IRS sources
- [x] IRS Form 1040 instructions — i1040gi.pdf (cached), Lines 6a/6b + 25b sections
- [x] IRS Publication 915 — Social Security and Equivalent Railroad Retirement Benefits
- [x] Rev Proc 2024-40 — not applicable (no inflation-adjusted thresholds for SS worksheet)
