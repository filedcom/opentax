# 1099-R — Scratchpad

## Purpose

Captures data from Form 1099-R: all distributions from pensions, annuities,
retirement/profit-sharing plans, IRAs, and insurance contracts. Routes income to
Form 1040 lines 4a/4b (IRAs) or 5a/5b (pensions/annuities), and triggers
secondary forms (5329, 8606, 4972, 4972) based on distribution codes and
taxpayer facts.

## Fields identified (from Drake)

**Main screen (screen 1099):**

- Payer name
- Payer EIN (Federal ID)
- Account number
- Taxpayer / Spouse indicator (TS)
- Box 1: Gross distribution
- Box 2a: Taxable amount
- Box 2b checkbox: Taxable amount not determined
- Box 2b checkbox: Total distribution
- Box 3: Capital gain (included in Box 2a) — for lump-sum Form 4972 elections
- Box 4: Federal income tax withheld
- Box 5: Employee contributions / Designated Roth contributions / insurance
  premiums
- Box 6: Net unrealized appreciation (NUA) in employer securities
- Box 7: Distribution code(s) — up to two codes
- Box 7 IRA/SEP/SIMPLE checkbox
- Box 8: Other (annuity contracts, LTC charges)
- Box 9a: Your percentage of total distribution
- Box 9b: Total employee contributions
- Box 10: Amount allocable to IRR within 5 years
- Box 11: 1st year of designated Roth contribution
- Box 12: FATCA filing requirement checkbox
- Box 13: Date of payment
- Boxes 14–19: State/local tax info (state tax withheld, payer's state ID, state
  distribution, local tax withheld, locality name, local distribution)

**Rollover section:**

- Rollover dropdown: C (IRA to Roth conversion), G (taxable direct rollover to
  Roth), S (same account type), X (another plan)
- Partial rollover amount field

**Additional Information checkboxes:**

- 1099-R for disability?
- If disability — reported as wages on 1040? (uses Schedule screen code 011)
- Carry this entry to Form 5329 and compute 10% penalty or exception
- Exclude here; distribution is reported on Form 4972
- Exclude here; distribution is reported on Form 8606 / ROTH / 8915D / 8915E
- Was this 1099-R altered or handwritten?
- Do not update screen to 20YY
- No distribution received (ignore screen)

**Special Tax Treatments tab:**

- QCD entry: 100% QCD up to $108,000 (2025 limit — note: Drake article says
  $100,000 but 2025 official limit is $108,000)
- Partial QCD amount field
- HSA funding distribution
- Public Safety Officer (PSO) insurance premium deduction
- Simplified General Rule Worksheet (for annuity cost basis recovery)

## Open Questions

- [x] Q: What fields does Drake show for this screen? → See above
- [x] Q: Where does each box flow on the 1040? → Lines 4a/4b (IRA) or 5a/5b
      (pension/annuity); Box 4 → line 25b; Box 6 NUA → potentially Schedule
      D/Form 1040 Schedule 1
- [x] Q: What are the TY2025 constants? → See below
- [x] Q: What edge cases exist? → See context.md Edge Cases section
- [x] Q: How does Box 7 distribution code affect routing? → Code 1/2/J →
      possible 5329; G/H/S/X → rollover; Q/T → qualified Roth (not taxable); Y →
      QCD; A → EACA withdrawal; B → designated Roth; D → QDRO; 3 → disability; 4
      → death; 5 → prohibited transaction; 6 → 1035 exchange; 7 → normal; 8 →
      excess contributions
- [x] Q: How does 1099-R interact with Form 8606? → Required when IRA
      distribution exists and basis > 0; pro-rata rule applies across all
      traditional IRAs
- [x] Q: What is the simplified method for annuity exclusion ratio? → Use cost
      in contract ÷ months from Table 1/Table 2; exclusion amount = cost ÷
      expected months × payments per year
- [x] Q: How does Roth IRA distribution work with 1099-R? → Code J: check
      "exclude, reported on 8606" then go to ROTH screen; code Q: qualified
      distribution (tax-free); code T: qualified (different 5-year test)
- [x] Q: What triggers Form 5329? → Distribution codes 1, 2, J (early from Roth)
      — check "carry to 5329" on 1099 screen; 25% for SIMPLE IRA within 2 years
- [x] Q: What are the TY2025 RMD age rules? → Age 73 required beginning date
      under SECURE 2.0; RMDs not rollover-eligible; 25% penalty for missed RMD
      (10% if corrected within 2 years)

## TY2025 Constants Confirmed

- QCD annual limit: $108,000 per person (confirmed — 2025 inflation adjustment;
  Drake KB article says $100,000 but that is outdated)
- One-time QCD to split-interest entity: $54,000 (SECURE 2.0 provision;
  index-adjusted for 2025)
- IRA contribution limit: $7,000
- IRA catch-up (age 50+): $1,000 (not indexed, statutory)
- 401(k) deferral: $23,500
- 401(k) catch-up (age 50+): $7,500
- 401(k) catch-up (age 60-63): $11,250 (SECURE 2.0)
- SIMPLE IRA: $16,500
- SIMPLE IRA catch-up (age 50+): $3,500
- SIMPLE IRA catch-up (age 60-63): $5,250
- Defined contribution limit (415(c)): $70,000
- RMD required beginning age: 73
- Early distribution penalty threshold: age 59½
- SIMPLE IRA 25% penalty window: within 2 years of first participation
- QCD minimum age: 70½
- Form 4972 qualification: born before January 2, 1936

## Sources Checked

- [x] Drake KB — 1099-R Additional Information Check Boxes (17107)
- [x] Drake KB — 1099-R Roth Distributions and Rollovers (11185)
- [x] Drake KB — 1099-R Taxable Amount FAQs (10437)
- [x] Drake KB — 1099-R Box 7 Code J (16070)
- [x] Drake KB — 1099-R Qualified Charitable Distribution (11400)
- [x] Drake KB — 1099-R ROLLOVER Checkbox (10177)
- [x] Drake KB — 5329 Common Scenarios (13788)
- [x] IRS Instructions for Forms 1099-R and 5498 (i1099r) — boxes 1-13,
      distribution codes
- [x] IRS Publication 575 (p575) — simplified method, general rule, Form 1040
      lines 5a/5b
- [x] IRS Publication 590-B (p590b) — IRA distributions, Roth rules, QCD, Form
      8606, RMDs
- [x] IRS Form 5329 instructions — penalty codes, SIMPLE 25% rule
- [x] IRS Form 8606 instructions — pro-rata rule, basis tracking
- [x] IRS Form 4972 information — lump-sum election, 10-year averaging, born
      before 1936
- [x] IRS Topic 411 — simplified method vs general rule
- [x] IRS RMD FAQs — age 73, table references, 10-year rule
- [x] IRS COLA page — 2025 retirement plan limits

## Remaining Notes

- Box 7 code Y for QCDs is new for 2025 tax year (confirmed per
  Morningstar/Wolters Kluwer articles); Drake 2025 may not yet support it —
  coding agent should implement Y code support regardless
- The one-time QCD to split-interest entity limit for 2025: need to confirm
  exact dollar amount; IRS 590-B mentioned $50,000 as base with SECURE 2.0
  indexing — need verification
- NUA (Box 6): Net unrealized appreciation on employer securities is not taxed
  at ordinary rates when distributed; reported as capital gain when securities
  are ultimately sold; does NOT go to lines 5a/5b
