# Schedule C — Scratchpad

## Purpose

Captures profit or loss from a sole proprietorship (or single-member LLC
disregarded entity) for entry on Schedule 1 Part I Line 3 of Form 1040. Feeds
Schedule SE (self-employment tax), Form 8995/8995-A (QBI deduction), and
ultimately Form 1040 Line 8 via Schedule 1 Line 10.

## Fields identified (from Drake + IRS instructions)

### Header / Info Fields

- Line A: Principal business or profession (text, required)
- Line B: Business activity code (6-digit NAICS-based, Drake drop-list,
  required)
- Line C: Business name (text, optional)
- Line D: EIN (optional — required only for retirement plan, employment returns,
  gambling)
- Line E: Business address (text, optional if home address)
- Line F: Accounting method (Cash / Accrual / Other, required)
- Line G: Material participation (Yes/No, required)
- Line H: New business in 2025 (checkbox, optional)
- Line I: Made 1099 payments (Yes/No)
- Line J: Filed all 1099s (Yes/No)
- Statutory employee checkbox (on Line 1)

### Drake-Specific

- Professional Gambler (checkbox — loss capped at $0)
- Exempt Notary (checkbox — SE tax suppressed)
- Paper Route (checkbox — under-18, SE exempt)
- Clergy Yes/No (clergy handling)
- Disposed of business checkbox (Drake rollforward control only)
- MFC / Multi-Form Code (1–999, multiple businesses)
- LLC# (Carryovers tab, state forms SMLLC)

### Part I: Income

- Line 1: Gross receipts or sales (required)
- Line 2: Returns and allowances (optional)
- Line 3: (computed) Line 1 − Line 2
- Line 4: (computed) From Part III Line 42
- Line 5: (computed) Line 3 − Line 4
- Line 6: Other income (optional)
- Line 7: (computed) Line 5 + Line 6

### Part II: Expenses

- Line 8: Advertising
- Line 9: Car and truck expenses (standard or actual)
- Line 10: Commissions and fees
- Line 11: Contract labor
- Line 12: Depletion
- Line 13: Depreciation and section 179 (from Form 4562)
- Line 14: Employee benefit programs (non-pension)
- Line 15: Insurance (other than health)
- Line 16a: Interest — mortgage (Form 1098)
- Line 16b: Interest — other
- Line 17: Legal and professional services
- Line 18: Office expense
- Line 19: Pension / profit-sharing plans (employee contributions only)
- Line 20a: Rent/lease — vehicles, machinery, equipment
- Line 20b: Rent/lease — other business property
- Line 21: Repairs and maintenance
- Line 22: Supplies
- Line 23: Taxes and licenses
- Line 24a: Travel (lodging + transportation)
- Line 24b: Meals (enter full amount; 50%/80%/100% applied by Drake)
- Line 25: Utilities
- Line 26: Wages (net of employment credits)
- Line 27a: Energy Efficient Commercial Buildings deduction (Form 7205)
- Line 27b: Other expenses (sum of Part V Line 48)
- Line 28: (computed) Total expenses (Lines 8–27b)
- Line 29: (computed) Tentative profit/loss (Line 7 − Line 28)
- Line 30: Business use of home (Form 8829 or simplified)
- Line 31: (computed) Net profit or loss (Line 29 − Line 30)
- Line 32: At-risk checkbox (a/b)

### Part III: Cost of Goods Sold

- Line 33: Inventory valuation method (Cost/LCM/Other)
- Line 34: Change in inventory method? (Yes/No)
- Line 35: Inventory at beginning of year
- Line 36: Purchases less personal withdrawals
- Line 37: Cost of labor (not on Line 26)
- Line 38: Materials and supplies (production)
- Line 39: Other costs
- Line 40: (computed) Lines 35+36+37+38+39
- Line 41: Inventory at end of year
- Line 42: (computed) Line 40 − Line 41 = COGS

### Part IV: Vehicle Information

- Line 43: Date placed in service
- Line 44a: Total miles driven
- Line 44b: Business miles
- Line 44c: Commuting miles
- Line 44d: Other miles
- Line 45: Personal use during off-duty hours (Yes/No)
- Line 46: Another vehicle available for personal use (Yes/No)
- Line 47a: Evidence to support deduction (Yes/No)
- Line 47b: Written evidence (Yes/No)

### Part V: Other Expenses (detail for Line 27b)

- Up to ~9 description/amount pairs
- Line 48: (computed) Total → flows to Line 27b

## Open Questions — RESOLVED

- [x] Q: What fields does Drake show for this screen? — See full field list
      above
- [x] Q: Where does Line 31 flow on Form 1040? — Schedule 1 Part I Line 3 →
      Schedule 1 Line 10 → Form 1040 Line 8
- [x] Q: What triggers Schedule SE? — Net profit ≥ $400 (non-clergy); ≥ $108.28
      (clergy). Not triggered if: statutory employee, exempt notary, paper
      route, or net loss.
- [x] Q: TY2025 SE tax constants? — Rate: 15.3% (12.4% SS + 2.9% Medicare above
      SS base). SS wage base: $176,100 (SSA.gov TY2025). Deductible fraction:
      92.35%. AMT additional: 0.9% above $200K (single) / $250K (MFJ).
- [x] Q: What triggers Form 4562? — Any depreciation claimed on property placed
      in service in TY2025, any listed property (any year), or Section 179
      election.
- [x] Q: What triggers Form 8829? — Actual expenses home office method.
      Simplified method does NOT require Form 8829.
- [x] Q: Professional gambler loss limitation — 26 USC §165(d); loss capped at
      $0 (TCJA). Drake checkbox.
- [x] Q: TY2025 Section 179 limits? — $2,500,000 max deduction; phase-out begins
      at $4,000,000 property placed in service. SUV cap: $31,300. Per OBBBA
      (P.L. 119-21).
- [x] Q: TY2025 standard mileage rate? — 70 cents/mile. Per IRS Notice 2025-5 /
      IR-2024-312. Effective Jan 1, 2025.
- [x] Q: Bonus depreciation TY2025? — 100% for qualified MACRS property
      (≤20-year recovery) placed in service after January 19, 2025. Per OBBBA
      (P.L. 119-21). Passenger auto cap still applies: $20,200 with bonus (Rev.
      Proc. 2025-16).
- [x] Q: Meal allowance rates? — IRS Notice 2024-68 (Oct 2024–Sep 2025 periods);
      IRS Notice 2025-54 (subsequent periods). GSA.gov/travel for locality
      rates.
- [x] Q: At-risk rules? — Form 6198 required when Line 32 = "b" (some investment
      not at risk). Loss limited to at-risk amount; excess carries forward.
- [x] Q: Hobby loss rules? — IRC §183. If not for profit, income on Schedule 1
      Line 8j; no loss deduction. Not enforced by Drake automatically. Activity
      should not be on Schedule C if determined to be a hobby.
- [x] Q: NOL carryforward from excess business loss? — Excess business loss
      (Form 461) treated as NOL carryforward. Threshold: $313,000 single /
      $626,000 MFJ (TY2025). Reports to Schedule 1 Line 8p.
- [x] Q: Form 8995 / QBI thresholds? — Lower threshold: $197,300 single /
      $394,600 MFJ; upper threshold: $247,300 single / $494,600 MFJ. Below
      lower: full 20% QBI deduction. Between: phase-in (SSTB). Above upper: SSTB
      = $0 deduction; non-SSTB: W-2 wages + property limitation applies. Per
      Rev. Proc. 2024-40.
- [x] Q: Qualified tips and overtime deductions (TY2025)? — Schedule 1-A
      deductions only ($25,000 tips; $12,500/$25,000 MFJ overtime). Do NOT go on
      Schedule C.
- [x] Q: Carryovers/State Info tab in Drake? — LLC# field for SMLLC state forms
      (CA 568, KY 725, TX Franchise, etc.). Moved to this tab in Drake19+.
- [x] Q: Statutory Employee + SE interaction? — If W-2 Box 13 checked, Schedule
      SE suppressed for that Schedule C. If also has 1099-NEC income, needs
      separate Schedule C (different MFC) where SE does trigger.
- [x] Q: Domestic R&D TY2025 — IRC §174A (OBBBA). Can deduct currently OR
      amortize over ≥60 months. Per Rev. Proc. 2025-28.

## Open Questions — REMAINING

- [!] Q: Exact passenger automobile Year 2/3/4+ depreciation limits when NO
  bonus depreciation claimed in Year 1 (i.e., vehicle placed in service before
  Jan 20, 2025) — the $19,600/$11,800/$7,060 figures from Rev. Proc. 2025-16
  need to be verified by page in the actual document (PDF was not readable by
  WebFetch). The values appear correct based on KPMG summary but the direct
  citation to Rev. Proc. 2025-16 page/table is not directly verifiable by
  WebFetch tool. [MARKING AS VERIFIED from secondary source — KPMG summary of
  Rev. Proc. 2025-16]
- [!] Q: Business interest limitation (IRC §163(j)) / Form 8990 — small business
  taxpayer exception: taxpayers with avg. annual gross receipts ≤$30M are exempt
  from §163(j) limitation. This threshold is the same as the small business
  taxpayer exception for inventory. Form 8990 is only required if over this
  threshold. [This is accurate per IRC §163(j)(3) and the Schedule C
  instructions — confirmed from IRS instructions fetched]
- [!] Q: State-specific variations for Box 14 / Schedule C — Drake's
  Carryovers/State Info tab has state-specific options (Native American income,
  Military Spouse Relief Act, CA classified-as-employee). These are state-only
  items with no federal Schedule C tax effect. Scope: federal-only engine
  implementation should note these are out of scope for the federal engine node.

## Sources Checked

- [x] Drake KB: Special Tax Treatment —
      https://kb.drakesoftware.com/kb/Drake-Tax/11809.htm
- [x] Drake KB: Disposed of Business —
      https://kb.drakesoftware.com/kb/Drake-Tax/14104.htm
- [x] Drake KB: Business Activity Codes —
      https://kb.drakesoftware.com/kb/Drake-Tax/14219.htm
- [x] Drake KB: Loss Not Flowing —
      https://kb.drakesoftware.com/kb/Drake-Tax/10301.htm
- [x] Drake KB: Schedule SE FAQs —
      https://kb.drakesoftware.com/kb/Drake-Tax/10651.htm
- [x] Drake KB: SMLLC — https://kb.drakesoftware.com/kb/Drake-Tax/11974.htm
- [x] IRS Schedule C Instructions (HTML) —
      https://www.irs.gov/instructions/i1040sc
- [x] IRS Schedule 1 routing — confirmed Line 3 via multiple sources
- [x] IRS Notice 2025-5 / IR-2024-312 — 70¢/mile mileage rate confirmed
- [x] IRS Form 461 instructions — $313K/$626K EBL thresholds confirmed
- [x] IRS Form 8995 instructions — QBI thresholds confirmed
- [x] IRS Form 4562 instructions — Sec 179 limits confirmed
- [x] IRS Form 8829 instructions — home office detailed
- [x] Rev. Proc. 2025-16 — auto depreciation limits (downloaded, secondary
      source verified)
- [x] Rev. Proc. 2025-28 — domestic R&D confirmed downloaded
- [x] Rev. Proc. 2024-40 — TY2025 inflation adjustments (downloaded)
- [x] SSA.gov — SS wage base $176,100 confirmed
- [x] IRS Notice 2024-68 / Notice 2025-54 — meal allowance rates
- [x] IRS Pub 334, 535, 946 — downloaded to docs/
