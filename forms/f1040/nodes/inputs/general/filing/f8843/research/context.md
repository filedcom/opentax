# f8843 — Form 8843: Statement for Exempt Individuals

## Overview
Form 8843 is filed by aliens present in the US who want to exclude certain days from the Substantial Presence Test (SPT) because they qualify as "exempt individuals." Categories include students (F/J/M/Q visas), teachers/trainees (J/Q visas), foreign government officials (A/G visas), professional athletes in charity events, and those with a qualifying medical condition preventing departure. Pure disclosure — no tax computation.

**IRS Form:** 8843
**Drake Screen:** 8843
**Node Type:** input (per-item array — one per exempt individual)
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/13536

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| exempt_category | ExemptCategory enum | yes | Category | Category of exempt individual: STUDENT, TEACHER_TRAINEE, GOVERNMENT_OFFICIAL, ATHLETE, MEDICAL | Form 8843 Part I–IV; IRC §7701(b)(3)(D) | https://www.irs.gov/pub/irs-pdf/f8843.pdf |
| visa_type | string | no | Visa type | Visa classification (e.g., F-1, J-1, M-1, Q-1, A, G) | Form 8843 Parts II–III | https://www.irs.gov/pub/irs-pdf/i8843.pdf |
| country_of_citizenship | string | no | Country of citizenship | Taxpayer's country of citizenship | Form 8843 Part I line 1 | https://www.irs.gov/pub/irs-pdf/f8843.pdf |
| days_excluded_current_year | number (nonneg int) | yes | Days excluded | Number of days excluded from SPT count for the current year | Form 8843 Parts II–V; Reg. §301.7701(b)-3 | https://www.irs.gov/pub/irs-pdf/i8843.pdf |
| supervising_academic_institution | string | no | Academic institution | Name of supervising academic institution (required for students) | Form 8843 Part III; Reg. §301.7701(b)-3(b)(1) | https://www.irs.gov/pub/irs-pdf/i8843.pdf |

---

## Calculation Logic

### Step 1 — Disclosure only
Form 8843 is a pure disclosure/statement. compute() returns empty outputs.
Source: IRC §7701(b)(3)(D); Reg. §301.7701(b)-3; Form 8843 instructions

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | — | Statement only; no downstream computation | IRC §7701(b)(3)(D) | https://www.irs.gov/pub/irs-pdf/i8843.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Student exemption — max calendar years | 5 years | IRC §7701(b)(5)(D); Reg. §301.7701(b)-3(b)(1) | https://www.irs.gov/pub/irs-pdf/i8843.pdf |
| Teacher/trainee exemption — max years in 6-year period | 2 years | IRC §7701(b)(5)(E); Reg. §301.7701(b)-3(b)(2) | https://www.irs.gov/pub/irs-pdf/i8843.pdf |
| Max calendar days in a year | 366 | — | — |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    exempt_category
    visa_type
    country_of_citizenship
    days_excluded_current_year
    supervising_academic_institution
  end
  subgraph node["f8843 — Form 8843"]
  end
  subgraph outputs["Downstream"]
    NONE["(none — statement only)"]
  end
  inputs --> node --> NONE
```

---

## Edge Cases & Special Rules

1. Students (F/J/M/Q visa): Can exclude days for up to 5 calendar years total.
2. Teachers/trainees (J/Q visa): Can exclude days for at most 2 years in any 6-year period.
3. Government officials (A/G visa or listed in IRC §7701(b)(5)(B)): No year limit on exclusion.
4. Athletes in charity events: Must be a professional athlete, event must be for charity, and the alien must not otherwise be in the US (IRC §7701(b)(5)(C)).
5. Medical condition: Alien was unable to leave the US because of a medical condition or problem that arose while present in the US (IRC §7701(b)(3)(D)(ii)).
6. Must be filed even if no US income and no other filing obligation.
7. days_excluded_current_year must not exceed 366.
8. No monetary amounts — purely a day-count statement.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8843 | 2024 | All lines | https://www.irs.gov/pub/irs-pdf/f8843.pdf | f8843.pdf |
| Instructions for Form 8843 | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8843.pdf | i8843.pdf |
| IRC §7701(b)(3)(D) | current | Exempt individuals | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section7701 | — |
| IRC §7701(b)(5) | current | Exempt individual definitions | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section7701 | — |
| Reg. §301.7701(b)-3 | current | Exempt individual days | https://www.ecfr.gov/current/title-26/chapter-I/subchapter-F/part-301/section-301.7701(b)-3 | — |
