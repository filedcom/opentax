# Schedule 2 (Additional Taxes) — Scratchpad

## Purpose
Aggregates all "additional taxes" from upstream excise/penalty sources and emits a single total to Form 1040, Line 17.

## Inputs received (from upstream nodes)

From **w2** (Box 12 codes):
- `uncollected_fica` — Box12 codes A+B: uncollected SS/Medicare tax on tips (→ Schedule 2 Line 13)
- `uncollected_fica_gtl` — Box12 codes M+N: uncollected SS/Medicare on group-term life insurance (→ Schedule 2 Line 13)
- `golden_parachute_excise` — Box12 code K: 20% excise on golden parachute payments (→ Schedule 2 Line 17k)
- `section409a_excise` — Box12 code Z: §409A failure excise (→ Schedule 2 Line 17h)

From **f1099nec**:
- `line17k_golden_parachute_excise` — 20% excise on golden parachute (→ Line 17k)

From **f1099m**:
- `line17h_nqdc_tax` — §409A NQDC excise (→ Line 17h)

## Fields / lines identified
All current inputs map to two IRS lines:
- Line 13: uncollected SS/Medicare/RRTA on tips or GTL = `uncollected_fica` + `uncollected_fica_gtl`
- Line 17h: §409A excise = `section409a_excise` + `line17h_nqdc_tax`
- Line 17k: golden parachute 20% excise = `golden_parachute_excise` + `line17k_golden_parachute_excise`
- Line 10 (total of Part II): sum → f1040 line17

## Open Questions
- [x] Q: What upstream nodes feed into this form? → w2, f1099nec, f1099m (confirmed from codebase)
- [x] Q: What calculations does this form perform? → Aggregation: sums per-line, emits total to f1040 line17
- [x] Q: What does this form output to downstream nodes? → f1040 line17_additional_taxes
- [x] Q: What are the TY2025 constants? → No new TY2025 constants for this scope; excise rates (20%) are statutory, not inflation-adjusted
- [x] Q: What edge cases exist? → all-zero inputs → no output; merging duplicate fields from multiple upstream sources

## Sources to check
- [x] Drake KB article — Screen 5; Drake uses screen "5" for Schedule 2 data entry
- [x] IRS form instructions (general instructions PDF — i1040gi.pdf already in .research/docs)
- [x] IRS Schedule 2 PDF — .research/docs/f1040s2.pdf (already cached)
