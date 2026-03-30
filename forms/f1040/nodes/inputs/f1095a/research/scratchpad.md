# Form 1095-A — Scratchpad

## Purpose
Form 1095-A (Health Insurance Marketplace Statement) provides monthly premium, SLCSP, and APTC data needed to compute the Premium Tax Credit (Form 8962).

## Fields identified (from Drake + IRS)
- Policy issuer name / EIN
- Covered individuals (up to 5 per policy: name, SSN, coverage dates)
- Part III columns A/B/C per month (Jan–Dec + Annual totals):
  - Column A: Monthly enrollment premium
  - Column B: Monthly applicable SLCSP premium
  - Column C: Monthly advance payment of PTC (APTC)

## Open Questions
- [x] Q: What fields does Drake show for the 95A screen?
  - Screen code 1095 / 95A. Fields: issuer name/EIN, covered individuals, 12 monthly rows × 3 columns (A=enrollment premium, B=SLCSP, C=APTC), annual totals.
- [x] Q: Where does each box flow on the 1040?
  - All data flows to Form 8962 (Premium Tax Credit computation). Form 8962 then flows to Schedule 3 line 9 (net PTC) or Schedule 2 line 2 (excess APTC repayment).
- [x] Q: What are the TY2025 constants?
  - No hard-coded dollar constants in 1095-A itself. 8962 uses FPL tables and indexing, but 1095-A node only passes raw data to form8962.
- [x] Q: What edge cases exist?
  - Multiple policies (multiple 1095-A entries)
  - Shared policy allocation (two households on one policy)
  - Alternative calculation for year of marriage
  - Months with no coverage (zero columns A/B/C)
  - Policy start/end mid-year

## Sources checked
- [x] IRS Form 1095-A instructions (TY2024 — most recent available): https://www.irs.gov/pub/irs-pdf/i1095a.pdf
- [x] IRS Form 8962 instructions: https://www.irs.gov/pub/irs-pdf/i8962.pdf
- [x] Drake KB: https://kb.drakesoftware.com/Site/Browse/16074
- [x] Rev Proc 2024-40 — no 1095-A-specific constants
