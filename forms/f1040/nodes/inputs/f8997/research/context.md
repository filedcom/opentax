# Form 8997 — Clean Research Summary

## What Form 8997 Is and Who Files It

Form 8997 is the "Initial and Annual Statement of Qualified Opportunity Fund (QOF) Investments." It is filed by any taxpayer (individual, corporation, partnership, estate, or trust) who holds a QOF investment at any point during the tax year — even if no disposition occurred. It is an annual tracking and disclosure form filed with the taxpayer's return.

**Purpose:** Inform the IRS of QOF investments and deferred gains held at the beginning and end of the year, new investments made during the year, and any dispositions (inclusion events) that triggered recognition of previously deferred gains.

## All Parts and Fields

### Part I — QOF Investments Held at Beginning of Year (Jan 1)
Each row represents one QOF investment already held at the start of the year. Columns:
1. Description of QOF investment (shares or partnership %)
2. QOF EIN
3. Date of investment (acquisition date)
4. Short-term deferred gain still tied to this investment
5. Long-term deferred gain still tied to this investment

### Part II — QOF Investments Made During the Year (New Deferrals)
Each row represents a new QOF investment made during the current tax year. Columns:
1. Description of QOF investment
2. QOF EIN
3. Date of investment
4. Short-term gain deferred by this investment
5. Long-term gain deferred by this investment

### Part III — QOF Investments Disposed of / Inclusion Events During Year
Each row represents a QOF investment that was fully or partially disposed of or otherwise triggered an inclusion event. Columns:
1. Description of QOF investment
2. QOF EIN
3. Date of investment (acquisition date)
4. Date of inclusion event / disposition
5. Short-term gain included (now taxable — recognized)
6. Long-term gain included (now taxable — recognized)

### Part IV — QOF Investments Held at End of Year (Dec 31)
Each row represents a QOF investment still held at year-end with deferred gain remaining. Columns:
1. Description of QOF investment
2. QOF EIN
3. Date of investment
4. Short-term deferred gain remaining
5. Long-term deferred gain remaining

## How Form 8997 Flows to Form 1040

Form 8997 is **primarily a reporting/tracking form**. In the vast majority of tax years, it produces **no direct tax computation output** — it simply tracks the running balance of deferred gains.

**When an inclusion event occurs (Part III has entries):**
- The included short-term or long-term gain must be reported on **Form 8949** using adjustment code "Q"
- From Form 8949, the gain flows through **Schedule D** to **Form 1040 Line 7** (capital gains)
- Character (ST vs LT) follows the original deferred gain's character

**10-Year Exclusion Election:**
- If QOF held 10+ years and taxpayer elects to step up basis to FMV at sale
- Appreciation beyond the original deferred gain is excluded from income
- Reported on Form 8949 with code "Q" and a negative adjustment for the excluded amount
- This is also reported in Part III with the included (after exclusion) amounts

**In this engine:** The f8997 input node routes included gains (Part III) directly to `schedule_d` as long-term or short-term transactions, mirroring what Form 8949 would do with code Q. Short-term included gains route as `is_long_term: false`; long-term included gains as `is_long_term: true`.

## TY2025 Relevant Facts

- The **December 31, 2026 hard deferral deadline** means all remaining deferred gains will become includible on TY2026 returns; TY2025 filers are still in the deferral window.
- No structural changes to the form for 2025 versus 2024.
- Rev Proc 2024-40 did not change Form 8997 mechanics.
- Taxpayers who made QOF investments in 2019-2020 are potentially hitting their 5- or 7-year step-up windows (those step-ups expired Dec 31, 2021 and Dec 31, 2026 respectively for the 10% and 15% basis adjustments — only the 10-year FMV election remains for 2025 filers).
- The 10-year FMV exclusion election is still available for investments made through 2026 if held to at least 2031.

## Schema Design for This Engine

- **Singleton** (`isArray: false`) — one form per taxpayer per year
- Four optional arrays of investment items (parts I–IV), each item capturing description, EIN, acquisition date, and deferred/included gain amounts
- Only Part III (inclusion events) produces outputs; all other parts are purely tracking
- Included LT gains → `schedule_d` as `is_long_term: true` transactions
- Included ST gains → `schedule_d` as `is_long_term: false` transactions
- If no Part III entries or all included amounts are zero → empty outputs
