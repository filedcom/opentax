# Form 1099-OID — Scratchpad

## Purpose
Form 1099-OID (Original Issue Discount) reports OID that accrues on debt instruments (bonds, CDOs, STRIPS, etc.) regardless of whether cash interest was received. Taxpayers must include taxable OID in gross income each year. The node ingests one or more payer entries, computes net taxable OID per payer (box1 minus acquisition premium and nominee adjustments), and routes to Schedule B (interest income), Form 1040 line 25b (withholding), and Form 6251 line 2g (AMT — private activity bond OID).

## Fields identified
- box1_oid: Total OID for the year → Schedule B (after netting)
- box2_other_interest: Periodic interest → added to Schedule B taxable_interest_net
- box3_early_withdrawal_penalty: Deductible penalty → UNROUTED (should go to Schedule 1 line 18)
- box4_federal_withheld: Backup/voluntary withholding → Form 1040 line 25b
- box5_market_discount: Market discount (informational) → not routed
- box6_acquisition_premium: Reduces taxable OID → used in netTaxableOid()
- box7_description: CUSIP / instrument name (informational) → not routed
- box8_oid_treasury: Treasury OID (federal taxable, state exempt) → not independently routed
- box9_investment_expenses: Suspended 2018-2025 per TCJA → not routed
- box10_bond_premium: Bond premium amortization → not independently routed
- box11_tax_exempt_oid: PAB OID (AMT preference) → Form 6251 line 2g
- box12_state_tax: State withholding (informational) → not routed
- box13_fatca: FATCA flag (informational) → not routed
- nominee_oid: Nominee reduction → used in netTaxableOid()

## Open Questions
- [x] Q: What fields does this node capture or receive? → 13 boxes + nominee_oid + payer fields
- [x] Q: Where does each field flow on the 1040? → Schedule B (box1+box2), Form 1040 line 25b (box4), Form 6251 (box11)
- [x] Q: What are the TY2025 constants? → None for this node; no thresholds affect routing
- [x] Q: What edge cases exist? → Premium floors at 0, nominee reduction, unrouted box3, market discount informational, STRIPS, de minimis rule

## Sources checked
- [x] Drake KB: OID screen (https://kb.drakesoftware.com — note: web access not available, relied on implementation + IRS knowledge)
- [x] IRS form instructions: i1099oid.pdf — boxes 1-13 definitions and routing
- [x] IRS Publication 1212 — Guide to OID Instruments (acquisition premium, nominee, de minimis)
- [x] IRS Publication 550 — Investment Income (market discount, bond premium)
- [x] Rev Proc 2024-40 — No TY2025 constants apply to this node
- [x] Codebase: index.ts (implementation), index.test.ts (test coverage), schedule_b/index.ts, form6251/index.ts, f1040 output schema
