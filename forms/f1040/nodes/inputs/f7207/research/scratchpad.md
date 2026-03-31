# Form 7207 — Advanced Manufacturing Production Credit — Scratchpad

## Purpose
Captures qualified advanced manufacturing component production data and routes the IRC §45X credit to Schedule 3 line 6z (general business credit).

## Fields identified
- components[]: array of { component_type (ComponentType enum), quantity (W/Wh/$), credit_rate_override? }
- 15 ComponentType values across solar, wind, inverters, battery, and critical minerals

## Open Questions
- [x] Q: What fields does this node capture? → component_type + quantity per entry
- [x] Q: Where does output flow? → Schedule 3 line 6z → Form 3800
- [x] Q: TY2025 constants? → Statutory rates per IRC §45X; no CPI adjustment
- [x] Q: Phase-down schedule? → 2030: 75%, 2031: 50%, 2032: 25%, 2033+: 0% (via credit_rate_override)
- [x] Q: Edge cases? → domestic content requirement, related-party rule, wind nameplate vs rated capacity

## Sources checked
- [x] IRC §45X (IRA §13502)
- [x] Final regulations TD 10024 (Jan 2025)
- [x] Rev Proc 2024-40 (rates are statutory)
