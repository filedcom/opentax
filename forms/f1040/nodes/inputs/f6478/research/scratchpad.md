# Form 6478 — Biofuel Producer Credit — Scratchpad

## Purpose
Captures qualified biofuel production data and routes a general business credit to Schedule 3 line 6z.

## Fields identified
- fuel_entries: array of { fuel_type, gallons, credit_rate_override? }
- BiofuelType enum: alcohol_mixture, biodiesel_mixture, cellulosic_biofuel, second_generation_biofuel, small_agri_producer

## Open Questions
- [x] Q: What fields does this node capture? → fuel_type + gallons per entry
- [x] Q: Where does each field flow on the 1040? → Schedule 3 line 6z (general business credit)
- [x] Q: What are the TY2025 constants? → Statutory rates: $0.45, $1.00, $1.01, $0.10/gal
- [x] Q: What edge cases exist? → Small producer capacity limit (60M gal/yr), mixture vs pure fuel

## Sources checked
- [x] IRS Form 6478 instructions (irs.gov)
- [x] IRC §6426, §6427, §40, §40A
- [x] Rev Proc 2024-40 (rates are statutory, not CPI-indexed)
