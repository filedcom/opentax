# Form 8814 — Parents' Election to Report Child's Interest and Dividends — Scratchpad

## Purpose
Allows parents to include a qualifying child's investment income on the parent's return. Avoids filing a separate return for the child. One item per qualifying child.

## Fields identified
- child_name, child_ssn (identification)
- interest_income, dividend_income, capital_gain_distributions, alaska_pfd
- TY2025 thresholds: $1,350 base (but code uses $1,300 — TY2024 value!)

## Open Questions
- [x] Q: What fields captured? → 4 income types + child ID
- [x] Q: Where flows? → f1040 line2b (interest), line3b (dividends)
- [x] Q: TY2025 constants? → $1,350 / $2,700 / $135 per Rev Proc 2024-40 (code has TY2024 $1,300/$2,600/$130)
- [x] Q: Edge cases? → child_tier_tax ($130) computed but not yet routed; capital gains not routed

## Known implementation gaps
1. Code uses $1,300/$2,600/$130 — TY2025 should be $1,350/$2,700/$135 (Rev Proc 2024-40)
2. child_tier_tax computed but variable discarded (line 102 `const _ = childTierTax(item)`) — not routed to schedule2.line17d or f1040
3. capital_gain_distributions captured but not routed to f1040.line7 or schedule d
