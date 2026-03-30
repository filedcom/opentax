# Form 8997 Research — Raw Notes

## Sources
- IRS About Form 8997: https://www.irs.gov/forms-pubs/about-form-8997
- IRS PDF 2025: https://www.irs.gov/pub/irs-pdf/f8997.pdf (128KB, binary)
- IRS Invest in QOF: https://www.irs.gov/credits-deductions/businesses/invest-in-a-qualified-opportunity-fund
- Wolters Kluwer finalized form article
- Drake KB article 15713 (text not directly accessible)
- IRS Opportunity Zones FAQ

## Key Raw Notes

### What is Form 8997?
- "Initial and Annual Statement of Qualified Opportunity Fund (QOF) Investments"
- Filed by ANY taxpayer who holds a QOF investment during the tax year — even if no disposition occurred
- Files: individuals, C corps, S corps, partnerships, estates, trusts

### The Four Parts (from Wolters Kluwer + IRS)
**Part I** — QOF investments held at BEGINNING of tax year (Jan 1)
  - EIN of QOF
  - Acquisition date
  - Description (shares / partnership %)
  - Short-term deferred gain amount
  - Long-term deferred gain amount

**Part II** — New QOF investments MADE DURING the year / capital gains deferred
  - EIN of QOF
  - Date of investment
  - Description
  - Short-term deferred gain amount
  - Long-term deferred gain amount

**Part III** — QOF investments DISPOSED OF during the year (inclusion events)
  - EIN of QOF
  - Date acquired
  - Date of disposition/inclusion event
  - Description
  - Short-term gain included (now taxable)
  - Long-term gain included (now taxable)

**Part IV** — QOF investments held at END of tax year (Dec 31)
  - EIN of QOF
  - Acquisition date
  - Description
  - Short-term deferred gain (still deferred)
  - Long-term deferred gain (still deferred)

### Deferral Mechanics
- Invest capital gain proceeds in QOF within 180 days of gain realization
- Deferred gain is NOT recognized until inclusion event OR Dec 31, 2026, whichever is earlier
- CRITICAL: Dec 31, 2026 is the HARD DEADLINE — all remaining deferred gains become includible
- For TY2025 returns: gains deferred before 2026 still defer; gains deferred in 2025 that hit 2026 wall will be includible on TY2026 returns

### Inclusion Events
- Sale, gift, or liquidation of QOF interest
- Transfer to a non-qualifying person
- Any event that reduces/terminates qualifying investment
- When inclusion event occurs: report gain on Form 8949 with adjustment code "Q"
  - Includible gain = LESSER of (deferred gain) OR (FMV of QOF investment - basis)
  - Goes to Schedule D as capital gain (long-term if held > 1 year)

### 10-Year Exclusion
- If QOF held 10+ years: elect to step up basis to FMV at date of sale
- Result: EXCLUDE any post-acquisition appreciation (only the deferred gain is taxable at inclusion)
- Reported on Form 8949 with adjustment code "Q" for excluded amount
- The exclusion amount flows as a negative adjustment on Form 8949

### Flow to 1040
- Form 8997 is primarily a TRACKING/DISCLOSURE form
- Does NOT directly compute a tax line on Form 1040
- When inclusion event occurs → Form 8949 → Schedule D → Form 1040 Line 7
- The included gain character follows original gain (ST or LT)

### TY2025 Specifics
- December 31, 2026 deferral deadline applies
- TY2025 filers: still in deferral period (not yet hitting 2026 wall)
- Any inclusion events in TY2025 get reported in Part III
- Rev Proc 2024-40 did not materially change the Form 8997 structure

### Schema Design Decisions
- This is a SINGLETON (non-array) form — one per taxpayer, not per investment
- But it has MULTIPLE investments within each part (arrays of items per part)
- The form itself is one filing; individual QOF entries are sub-items
- For routing: if Part III (disposed investments) has includible gains → route to schedule_d
- If no Part III entries or all gains are zero → no outputs (purely tracking)
- Keep it as inputSchema with per-part arrays of investment items
