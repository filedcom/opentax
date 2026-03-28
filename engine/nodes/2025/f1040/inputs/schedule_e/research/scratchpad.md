# Schedule E — Scratchpad

## Purpose

Drake screen E captures rental real estate, royalty, partnership, S corporation,
estate, trust, and REMIC supplemental income and loss for Schedule E (Form
1040), Part I (rental/royalty) via three tabs: Property Info, Income/Expenses,
Prior Year Compare. Pages 2 for partnerships/S corps (E2), estates/trusts (E3),
and REMICs (E4) are entered via separate screens in Drake.

## Fields identified (from Drake — Property Info Tab)

**Header / Identification**

- TSJ indicator (Taxpayer / Spouse / Joint)
- Filing status (F field)
- State (ST)
- City
- PAN (Property Account Number)
- State Information links: DC, HI, MA, PA

**Activity Classification (radio buttons — one must be selected)**

- A: Active rental real estate (default)
- B: Other passive activity
- C: Real estate professional (>50% personal services in real property trades
  AND >750 hours)
- D: Nonpassive (not a passive activity)

**1099 Questions (answered on FIRST Schedule E screen only)**

- A: Did taxpayer make any payments in 2021 that would require filing Forms
  1099? (Yes/No)
- B: If "Yes," did or will taxpayer file all required Forms 1099? (Yes/No)

**Address and Type of Property**

- Street address
- City
- State, ZIP (U.S. ONLY)
- Province/State, Country, Postal Code (Foreign ONLY)
- Property type (checkboxes — select one):
  - 1 Single Family Residence
  - 2 Multi-Family Residence
  - 3 Vacation/Short-Term Rental
  - 4 Commercial
  - 5 Land
  - 6 Royalties
  - 7 Self-Rental
  - 8 Other — Describe

**Activity/At-Risk Flags**

- "Some investment is NOT at risk" checkbox → links to Form 6198
- Operating expenses carryover (dollar amount)
- Ownership percent (%)
- "To use the Tax Court method to allocate interest and taxes" checkbox + number
  of days owned if not 365
- "Property placed in service during [year]" checkbox
- "Property was disposed of in [year]" checkbox
- "Carry to 8960 line 4b" checkbox
- "This is taxpayer's main home or second home" checkbox
- "Qualified Joint Venture" checkbox

**Passive/At-Risk Carryforwards (from prior year)** Three columns: Regular Tax
Total | Regular Tax Pre-2018 | AMT

- Prior unallowed passive operating
- Prior unallowed passive 4797 Part I
- Prior unallowed passive 4797 Part II
- Prior unallowed at-risk losses
- Disallowed mortgage interest from [year] 8990
- Disallowed other interest from [year] 8990

**Pre-CARES Passive/At-Risk Carryforwards (NY and KY only)**

- Prior unallowed passive operating
- Prior unallowed passive 4797 Part 1
- Prior unallowed passive 4797 Part 2
- Prior unallowed at-risk losses
- Disallowed mortgage interest from [year] 8990
- Disallowed other interest from [year] 8990

**QBI Deduction Section**

- "This activity is a trade or business" (Y/N dropdown)
- "Rented to a 'specified service business'" checkbox
- Business aggregation number (BAN)
- W-2 wages paid
- Unadjusted basis of all qualified property immediately after acquisition
- Override calculated qualified business income (or loss)
- "Meets Section 199A rental 'safe harbor'" dropdown (A / B / C):
  - A: Separate rental enterprise
  - B: Residential rental enterprise grouping for safe harbor
  - C: Commercial rental enterprise grouping for safe harbor
- Section 179
- Section 1231 Gain/Loss

**State Use ONLY**

- LLC #
- Employer ID number (EIN)
- "Electing out of Business Interest Expense Limit" checkbox → links to SCH

## Fields identified (from Drake — Income/Expenses Tab)

- Line 2: Fair rental days (integer)
- Line 2: Personal use days (integer)
- Line 3: Rent income (dollar amount)
- Line 4: Royalties from oil, gas, mineral, copyright, or patent (dollar amount)

**Expenses (two columns: "Expenses attributable to rental unit" | "Expenses
attributable to entire property" + Override program calculation)**

- Line 5: Advertising
- Line 6: Auto and travel (links to AUTO screen) +/-
- Line 7: Cleaning and maintenance
- Line 8: Commissions
- Line 9: Insurance
- Line 10: Legal and other professional fees
- Line 11: Management fees
- Line 12: Interest — mortgage (links to Form 1098) +/-
- Line 13: Interest — other
- Line 14: Repairs
- Line 15: Supplies
- Line 16: Taxes +/-
- Line 17: Utilities
- Line 18: Depreciation ONLY (links to Form 4562) +/-
- Line 18: Depreciation adjustment (AMT) +/-
- Line 18: Depletion (DEPL link)
- Line 19: Other expenses (list) — up to ~6 rows with description + amount

**Multi-occupancy field**

- Taxpayer or spouse occupancy percentage (%)

## Fields identified (from Drake — Prior Year Compare Tab — read-only / manual entry for new clients)

Income:

- Rents received (prior year)
- Royalties received (prior year) Expenses:
- Advertising, Auto and travel, Cleaning and maintenance, Commissions,
  Insurance, Legal & professional fees, Management fees, Mortgage interest,
  Other interest, Repairs, Supplies, Taxes, Utilities, Depreciation expense or
  depletion, Other
- Allowed on prior-year return after Form 6198 and Form 8582 limitations

## Other Related Drake Screens (not the core "E" screen but feed it)

- Screen 4562: Depreciable assets (buildings, land, personal property)
- Screen 10: Additional Depreciation Elections (bonus depreciation opt-outs)
- Screen ELEC: Capitalization & De Minimis Election, Sec 469(c)(7)(A) single
  rental activity election
- Screen 1098: Mortgage interest (For = E to flow to Schedule E)
- Screen 8829: Business use of home
- Screen AUTO: Vehicle expenses
- Screen 6252: Installment sale income
- Screen 6198: Amount not at risk
- Screen 8582: Passive activity worksheet (auto-calculated)
- Screen E2: Partnerships and S Corps (K-1 data entry)
- Screen E3: Estates and Trusts (K-1 data entry)
- Screen E4: REMICs

## Open Questions

- [x] Q: What fields does Drake show for the E screen? → Fully documented above
- [x] Q: What are the exact Schedule E line numbers for TY2025 (verify against
      TY2025 instructions, not TY2021)? → Confirmed from f1040se.pdf (created
      5/6/25) and i1040se.pdf (Nov 12, 2025). Lines A, B, 1a, 1b, 2–22, 23a–e,
      24–26 (Part I); 27–32 (Part II); 33–37 (Part III); 38–39 (Part IV); 40–43
      (Part V).
- [x] Q: Where exactly does each Schedule E field flow on the 1040 (line
      numbers)? → Line 41 → Schedule 1 Line 5 → Form 1040 Line 8. All per-field
      routing documented in context.md.
- [x] Q: What are the TY2025 passive activity loss limits and MAGI thresholds
      for the $25K rental real estate special allowance? → $25,000/$12,500
      (MFS); phase-out $100K–$150K (Single/MFJ) / $50K–$75K (MFS lived apart).
      Confirmed from i8582.pdf (Nov 26, 2025).
- [x] Q: How is the $25,000 rental real estate special allowance phase-out
      calculated (MAGI $100K–$150K)? → $25,000 − 50% × (MAGI − $100,000).
      Step-by-step documented in context.md Step 6c (Form 8582 Lines 4–9).
- [x] Q: What are the exact Form 8582 line calculations for TY2025? → Fully
      documented in context.md Step 6 — Parts IV (Lines 1a–1d), II (Lines 4–9),
      III (Line 11). Confirmed from i8582.pdf (Nov 26, 2025).
- [x] Q: How does Schedule E Part I net income/loss flow to Schedule 1 Line 5? →
      Line 26 → Part V Line 41 → Schedule 1 Line 5 → Form 1040 Line 8. Confirmed
      from f1040se.pdf and i1040se.pdf.
- [x] Q: How does Schedule E Part II (partnerships/S corps) feed Schedule 1 Line
      5? → Entered on screen E2 (K-1 data entry), flows to Schedule E Lines
      27–32, totaled to Line 32 → Part V Line 41.
- [x] Q: How do passive losses carry to next year (Form 8582 Worksheet)? →
      Unallowed losses from Form 8582 Part VII col (c) carry forward; entered in
      prior_unallowed_passive_operating in next year's screen E. Documented in
      context.md Per-Field Routing.
- [x] Q: What are the QBI deduction rules for rental real estate? (Rev. Proc.
      2019-38 safe harbor) → Fully documented in context.md Step 10 and Edge
      Cases. Confirmed from rp-19-38.pdf (10 pages) and i8995a.pdf (Jan 26,
      2026). TY2025 thresholds: $394,600/$197,300 (W-2 wage limitation begins);
      $494,600/$247,300 (full limitation).
- [x] Q: What is the real estate professional test — exact hour rules? → >50% of
      total personal services in real property trades/businesses AND >750 hours
      in those activities. Each rental is separate activity unless
      single-activity election made. Confirmed from i1040se.pdf p.3, IRC
      §469(c)(7).
- [x] Q: How does vacation home (personal use days) affect deductibility (IRC
      §280A)? → Three rules: (1) <15 rental days: exclude all income, no
      deductions. (2) Personal use > 14 days OR > 10% of rental days: expense
      ceiling = gross rental income, ordered deduction. (3) Otherwise: all
      expenses deductible. Documented in context.md Step 1.
- [x] Q: What triggers Form 4797 vs Schedule D for rental property sales? →
      §1231 gain from rental property disposition → Form 4797 Part I → Schedule
      D Part II. §1250 recapture → ordinary income on Form 4797 Part III.
      Unrecaptured §1250 gain → 25% max rate. Documented in context.md Edge
      Case 5.
- [x] Q: What triggers Form 8960 (NIIT) for rental income? → Passive rental
      income generally subject to NIIT. carry_to_8960 checkbox routes net rental
      income to Form 8960 Line 4b. NIIT = 3.8% × lesser of NII or excess MAGI
      over threshold. Confirmed from i8960.pdf (Feb 4, 2026).
- [x] Q: How does Schedule E interact with Form 6198 (at-risk)? →
      some_investment_not_at_risk checkbox triggers Form 6198 computation. Loss
      limited to at-risk amount. Enters Schedule E Line 21 after limitation.
      Documented in context.md Step 5.
- [x] Q: What royalty income types go on Schedule E vs Schedule C? → Schedule E:
      oil/gas/mineral non-working interests, copyright/patent held as
      investment. Schedule C: self-employed author/musician/inventor, working
      interest in oil/gas (if material participation). Documented in context.md
      Edge Case 7.
- [x] Q: TY2025 standard mileage rate for vehicles? → 70 cents per mile.
      Confirmed from i1040se.pdf p.1 ("What's New"), Nov 12, 2025.

## Sources to check

- [x] Drake KB articles — reviewed
- [x] Drake In-Depth Schedule E PDF handout (2022 edition, Summer 2022) —
      reviewed pages 1-38
- [x] IRS Schedule E instructions for TY2025 (i1040se.pdf) — reviewed all 11
      pages, Nov 12, 2025
- [x] IRS Schedule E form for TY2025 (f1040se.pdf) — reviewed both pages,
      created 5/6/25
- [x] IRS Publication 527 (Residential Rental Property) TY2025 — downloaded
      (p527.pdf); key edge cases incorporated
- [x] IRS Publication 925 (Passive Activity and At-Risk Rules) TY2025 —
      downloaded (p925.pdf)
- [!] Rev Proc 2024-40 (TY2025 inflation adjustments) — NOT fetched; all
  Schedule E-relevant constants confirmed directly from TY2025 IRS instruction
  documents (i1040se.pdf, i8582.pdf, i8995a.pdf). No Schedule E constants are
  derived from Rev. Proc. 2024-40 (those are primarily for income tax brackets,
  standard deductions, and retirement limits — not §469 PAL thresholds which are
  statutory, not inflation-adjusted).
- [x] Rev. Proc. 2019-38 (Section 199A rental safe harbor) — reviewed all 10
      pages
- [x] IRS Form 8582 instructions (passive activity loss limitations) — reviewed
      all 16 pages, Nov 26, 2025
- [x] IRS Form 8995-A instructions (QBI deduction) — reviewed pages 1-5, Jan
      26, 2026. TY2025 thresholds confirmed.
