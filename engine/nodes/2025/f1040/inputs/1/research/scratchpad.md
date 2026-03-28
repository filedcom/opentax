# General Screen 1 (and Screen 2) — Scratchpad

## Purpose

Drake's General screen 1 (with screen 2 as alias) captures the top-of-return
taxpayer identification, address, filing status, digital assets question,
presidential election fund designation, and the dependent roster — everything
needed to set up a Form 1040 return before any income entry begins.

## Fields identified (from Drake)

### Screen 1 — Name, Address, Filing Status, General Info

**Taxpayer identification:**

- Filing status (dropdown, 5 options)
- Taxpayer first name, middle initial, last name, suffix
- Taxpayer SSN/ITIN
- Taxpayer date of birth
- Taxpayer occupation
- Deceased checkbox + date of death
- Taxpayer is blind checkbox (line 12d)
- Taxpayer born before Jan 2, 1961 (age 65+) checkbox (line 12d)

**Spouse identification (activated only for MFJ; some fields available for
MFS):**

- Spouse first name, middle initial, last name, suffix
- Spouse SSN/ITIN
- Spouse date of birth
- Spouse occupation
- Spouse deceased checkbox + date of death
- Spouse is blind checkbox (line 12d)
- Spouse born before Jan 2, 1961 (age 65+) checkbox (line 12d)
- Nonresident alien spouse checkbox
- Spouse is not filing a return checkbox
- Spouse has no U.S. income checkbox

**Address:**

- Street address (line 1)
- Apartment/suite number
- City
- State (auto-filled from ZIP, overridable)
- ZIP code (triggers city/state/county auto-fill)
- County (auto-filled, overridable)
- Foreign address fields: country, foreign state/province, foreign postal code
- P.O. Box (acceptable in lieu of street address)

**Address change / name change flags:**

- Address change checkbox (IRS uses for mailing future correspondence)
- Name change checkbox

**Residency:**

- Resident state (for state return routing; can select PY for part-year)

**Filing status special flags:**

- MFS/HOH lived apart for entire year checkbox (line 6d — lived apart from
  spouse for all 12 months or legally separated)
- U.S. residency checkbox ("main home was in the U.S. for more than half of
  2025") — new for 2025

**Dependent of another flag:**

- Taxpayer can be claimed as dependent by another checkbox (affects standard
  deduction)
- Spouse can be claimed as dependent by another checkbox

**Digital assets question:**

- Digital assets Yes/No checkbox (mandatory for all filers)

**Presidential Election Campaign Fund:**

- Taxpayer designates $3 to fund (checkbox)
- Spouse designates $3 to fund (checkbox, MFJ only)

**Phone and email (optional, for IRS contact):**

- Daytime phone number
- Evening phone number
- Email address

**Identity Protection PIN (entered on PIN screen, not screen 1):**

- Taxpayer IP PIN (6 digits)
- Spouse IP PIN (6 digits)

**Third Party Designee (entered on PREP screen):**

- Designee name
- Designee phone
- Designee PIN (5 digits)

### Screen 2 — Dependents

Per dependent (multiple instances allowed, up to 4 shown on Form 1040; overflow
on continuation sheet):

- Dependent first name, last name
- Dependent SSN/ATIN
- Relationship to taxpayer (dropdown/code)
- Date of birth
- Months lived in taxpayer's home (if less than 12)
- Residence location (new for 2025 — where lived)
- Full-time student status (new for 2025)
- Totally and permanently disabled status (new for 2025)
- Qualifying child for EIC (dropdown: blank = yes, X = no, S = SSN not valid for
  work)
- Child tax credit checkbox (SSN valid for work required)
- Other dependent credit checkbox
- Not a dependent (HOH qualifier only) — bottom of screen Additional Information
- Not a dependent (QSS qualifier only) — bottom of screen Additional Information
- Not a dependent (ACA household member) — bottom of screen, prior versions only
- Childcare expenses amount (for Form 2441)
- Dependent IP PIN (6 digits, bottom right of screen 2)

## Open Questions

- [x] Q: What fields does Drake show for this screen? → Listed above based on
      multiple KB sources
- [x] Q: What are all the filing status options and their IRS codes? → See
      resolved section below
- [x] Q: Where does each field flow on the 1040? → See context.md Per-Field
      Routing
- [x] Q: What are the TY2025 standard deduction amounts by filing status? → See
      resolved below
- [x] Q: How are dependents entered — what fields per dependent? → Resolved
      above
- [x] Q: What is the relationship between screen 1 and screen 2 (alias)? → Alias
      "2" is simply screen 2 (Dependents); both are on the General tab
- [x] Q: What triggers Child Tax Credit / Dependent Care from dependent entry? →
      CTC triggered by age < 17 + SSN valid for work; 2441 triggered by
      childcare expense amount on screen 2
- [x] Q: What are the rules for claiming a dependent (qualifying child vs
      qualifying relative)? → Resolved from Pub 501
- [x] Q: What are the SSN validation rules? → Resolved — SSN/ITIN required; ATIN
      accepted; SSN valid for work required for CTC
- [x] Q: What is the identity protection PIN field? → 6-digit PIN on the PIN
      screen (taxpayer/spouse); bottom right of screen 2 for dependents
- [x] Q: What edge cases exist for MFS? → Resolved — see Edge Cases
- [x] Q: What is the Third Party Designee section? → Entered on PREP screen (not
      screen 1), appears on Form 1040 page 2
- [x] Q: What are the rules for Head of Household filing status? → Resolved from
      Pub 501
- [x] Q: What are the rules for Qualifying Surviving Spouse filing status? →
      Resolved from Pub 501
- [x] Q: What are the TY2025 additional standard deduction amounts for age 65+
      and blindness? → Resolved — $2,000 single/HOH, $1,600 MFJ/QSS/MFS per
      qualifying condition
- [x] Q: What is the qualifying relative gross income limit for 2025? → $5,200
- [x] Q: What is the enhanced senior deduction for 2025? → $6,000 per eligible
      person (age 65+), $12,000 MFJ both eligible; phase-out starts at
      $75,000 AGI ($150,000 MFJ); on Schedule 1-A
- [x] Q: What is the dependent standard deduction limitation for 2025? → Greater
      of $1,350 or (earned income + $450), capped at filing status base amount
- [x] Q: How did the standard deduction increase from Rev Proc 2024-40 amounts?
      → OBBBA (One Big Beautiful Bill Act) added $750/$1,500/$1,125 to the
      inflation-adjusted base amounts

## Resolved Answers with Citations

### Filing Status Options (5)

1. **Single** — unmarried or legally separated on Dec 31
2. **Married Filing Jointly (MFJ)** — married; both spouses sign
3. **Married Filing Separately (MFS)** — married; each files own return
4. **Head of Household (HOH)** — unmarried; paid >50% of home for qualifying
   person; qualifying person lived with TP >6 months (except parent need not
   live with TP)
5. **Qualifying Surviving Spouse (QSS)** — spouse died in prior 2 years; has
   qualifying child; filed joint in year of death Source: IRS Pub 501 (2025),
   https://www.irs.gov/publications/p501

### TY2025 Standard Deductions

| Status | Base    | Source                    |
| ------ | ------- | ------------------------- |
| Single | $15,750 | 1040 Instructions (OBBBA) |
| MFS    | $15,750 | 1040 Instructions (OBBBA) |
| MFJ    | $31,500 | 1040 Instructions (OBBBA) |
| QSS    | $31,500 | 1040 Instructions (OBBBA) |
| HOH    | $23,625 | 1040 Instructions (OBBBA) |

Note: Rev Proc 2024-40 showed $15,000/$30,000/$22,500. OBBBA increased by
$750/$1,500/$1,125 respectively.

### Additional Standard Deduction (Age 65+ or Blind) — TY2025

- Single or HOH: +$2,000 per qualifying condition (age OR blind; $4,000 if both)
- MFJ, QSS, MFS: +$1,600 per qualifying condition per eligible spouse Source:
  Rev Proc 2024-40, confirmed by IRS Topic 551 and Pub 501

### Enhanced Senior Deduction — TY2025 (NEW — OBBBA)

- $6,000 per eligible taxpayer age 65+ (born before Jan 2, 1961)
- $12,000 if MFJ and both spouses are 65+
- AGI phase-out: starts at $75,000 ($150,000 MFJ)
- Claimed on Schedule 1-A Source: IRS 1040 Instructions 2025;
  https://www.irs.gov/instructions/i1040gi

### Qualifying Relative Gross Income Limit (2025)

$5,200 Source: IRS Pub 501 (2025); confirmed via search

### Dependent Standard Deduction Limitation (2025)

Greater of: (a) $1,350, or (b) earned income + $450 Capped at the applicable
basic standard deduction for the filer's status Source: IRS Topic 551

## Sources checked

- [x] Drake KB — Creating a New Return:
      https://kb.drakesoftware.com/kb/Drake-Tax/10221.htm
- [x] Drake KB — 1040 Dependent Not Showing:
      https://kb.drakesoftware.com/kb/Drake-Tax/10419.htm
- [x] Drake KB — Nonresident Alien Spouse:
      https://kb.drakesoftware.com/kb/Drake-Tax/11051.htm
- [x] Drake KB — 2025 Form 1040 Changes:
      https://kb.drakesoftware.com/kb/Drake-Tax/18910.htm
- [x] Drake KB — Third-Party Designee:
      https://kb.drakesoftware.com/kb/Drake-Tax/10820.htm
- [x] Drake KB — IP PIN FAQs:
      https://kb.drakesoftware.com/kb/Drake-Tax/12938.htm
- [x] Drake KB — 8812 CTC/ACTC/ODC:
      https://kb.drakesoftware.com/kb/Drake-Tax/18340.htm
- [x] Drake KB — EIC FAQs: https://kb.drakesoftware.com/kb/Drake-Tax/10886.htm
- [x] Drake KB — 2441 Dependent Care:
      https://kb.drakesoftware.com/kb/Drake-Tax/11750.htm
- [x] Drake KB — Disabled Dependent:
      https://kb.drakesoftware.com/kb/Drake-Tax/13172.htm
- [x] IRS 1040 Instructions (2025): https://www.irs.gov/instructions/i1040gi
- [x] IRS Pub 501 (2025): https://www.irs.gov/publications/p501
- [x] IRS Topic 551: https://www.irs.gov/taxtopics/tc551
- [x] IRS Digital Assets FAQ:
      https://www.irs.gov/filing/determine-how-to-answer-the-digital-asset-question
- [x] IRS IP PIN:
      https://www.irs.gov/identity-theft-fraud-scams/get-an-identity-protection-pin
- [x] Rev Proc 2024-40 (couldn't read PDF directly — confirmed via web sources)
