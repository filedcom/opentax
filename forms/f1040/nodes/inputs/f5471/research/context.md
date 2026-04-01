# f5471 — Form 5471: Information Return of U.S. Persons With Respect To Certain Foreign Corporations

## Overview

Form 5471 is an informational return filed by U.S. persons who are officers, directors,
or shareholders in certain foreign corporations. The form has five filing categories
(1–5) that determine which schedules must be attached.

For the individual 1040 computation, the critical data flows are:
- **Subpart F income** (Schedule I) → Schedule 1 line 8z as other income (IRC §951)
- **GILTI inclusion** (Schedule I-1) → Schedule 1 line 8z as other income (IRC §951A)
- **Foreign taxes paid on Subpart F / GILTI** (Schedule E) → form_1116 for FTC computation
- **E&P and previously taxed E&P** (Schedules H, J, P) → reference data only

This node captures the 1040-relevant data from all 17 Drake screens (5471, SCHA,
SCHB, Sch C tab, Sch F tab, SCHF, Sch G tab, SCHI, O1, SCHE, SCHH, I1, SCHJ,
Sch M tab, SCHP, SCHQ, SCHR). It routes Subpart F income, GILTI inclusions, and
foreign taxes to downstream nodes; all other fields are informational.

**IRS Form:** Form 5471
**Drake Screen:** 5471, SCHA, SCHB, 5471>"Sch C" tab, 5471>"Sch F" tab, SCHF,
                  5471>"Sch G" tab, SCHI, O1, SCHE, SCHH, I1, SCHJ,
                  5471>"Sch M" tab, SCHP, SCHQ, SCHR
**Node Type:** input (array — one item per foreign corporation)
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/5471

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| foreign_corp_name | string | yes | 5471 main page | Legal name of the foreign corporation | Form 5471 Part I line 1b | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| foreign_corp_ein_or_reference_id | string | no | 5471 main page | EIN or employer identification number / reference ID | Form 5471 Part I line 1c | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| country_of_incorporation | string | yes | 5471 main page | Country where corp was incorporated | Form 5471 Part I line 1g | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| functional_currency | string | no | 5471 main page | Functional currency code (e.g., EUR, GBP) | Form 5471 Part I | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| filing_category | FilingCategory enum | yes | 5471 main page | Category 1–5 determines required schedules | Form 5471 Category of Filer | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| subpart_f_income | number ≥ 0 | no | SCHI Schedule I | Shareholder's pro-rata share of Subpart F income (line 1) includible in gross income | Form 5471 Schedule I line 1; IRC §951(a) | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| previously_excluded_subpart_f_income | number ≥ 0 | no | SCHI Schedule I | Previously excluded income withdrawn from investment (line 5) | Form 5471 Schedule I line 5 | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| factoring_income | number ≥ 0 | no | SCHI Schedule I | Amounts included under IRC §951(a)(1)(B) (line 6) | Form 5471 Schedule I line 6 | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| gilti_inclusion | number ≥ 0 | no | I1 Schedule I-1 | GILTI inclusion amount (IRC §951A; from Schedule I-1) | Form 5471 Schedule I-1; IRC §951A | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| foreign_taxes_paid_subpart_f | number ≥ 0 | no | SCHE Schedule E | Foreign taxes paid/accrued on Subpart F income (for FTC via Form 1116) | Form 5471 Schedule E; IRC §960(a) | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| foreign_taxes_paid_gilti | number ≥ 0 | no | SCHE Schedule E | Foreign taxes paid/accrued allocable to GILTI (for FTC via Form 1116) | Form 5471 Schedule E; IRC §960(d) | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| current_ep | number | no | SCHH Schedule H | Current year earnings and profits (reference data) | Form 5471 Schedule H | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| accumulated_ep_beginning | number | no | SCHJ Schedule J | Accumulated E&P at beginning of year (reference data) | Form 5471 Schedule J | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| accumulated_ep_ending | number | no | SCHJ Schedule J | Accumulated E&P at end of year (reference data) | Form 5471 Schedule J | https://www.irs.gov/pub/irs-pdf/f5471.pdf |

---

## Calculation Logic

### Step 1 — Total Subpart F Income
Sum `subpart_f_income + previously_excluded_subpart_f_income + factoring_income`.
Route total > 0 to Schedule 1 `line8z_other` (IRC §951(a); Form 5471 Sch I).
Source: Form 5471 Schedule I instructions, p.14 — https://www.irs.gov/pub/irs-pdf/i5471.pdf

### Step 2 — GILTI Inclusion
If `gilti_inclusion > 0`, route to Schedule 1 `line8z_other` combined with Subpart F total.
Source: IRC §951A; Form 5471 Schedule I-1 instructions — https://www.irs.gov/pub/irs-pdf/i5471.pdf

### Step 3 — Foreign Taxes → Form 1116
If `foreign_taxes_paid_subpart_f > 0`, emit one output to form_1116 for Subpart F
category (Section951A is treated separately):
- category: `section_951a` for GILTI taxes (IRC §960(d))
- category: `general` for Subpart F taxes (IRC §960(a))

Actually per IRC §904(d), Subpart F income taxes use `general` category; GILTI
uses `section_951a` category. Route each only when > 0.

Source: Form 1116 instructions p. 2; IRC §904(d)(1)(A)-(B); IRC §960(a)(d) —
https://www.irs.gov/pub/irs-pdf/i1116.pdf

### Step 4 — E&P fields
`current_ep`, `accumulated_ep_beginning`, `accumulated_ep_ending` are informational
only — no downstream routing.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line8z_other = total_subpart_f + gilti_inclusion | schedule1 | > 0 | IRC §951(a), §951A; Sch I | https://www.irs.gov/pub/irs-pdf/f5471.pdf |
| foreign_tax_paid + foreign_income + income_category | form_1116 | subpart_f taxes > 0 | IRC §960(a); Form 1116 | https://www.irs.gov/pub/irs-pdf/i1116.pdf |
| foreign_tax_paid + foreign_income + income_category | form_1116 | gilti taxes > 0 | IRC §960(d); Form 1116 | https://www.irs.gov/pub/irs-pdf/i1116.pdf |

Note: form_1116 requires `total_income` and `us_tax_before_credits` which aren't
known at this stage; they are populated by the aggregator. For f5471, we emit
`foreign_tax_paid` and `foreign_income` only (form_1116 handles incomplete data).
However, looking at form_1116's schema it requires those fields. So instead, this
node routes taxes to form_1116 with the known fields, using subpart_f_income as
foreign_income and 0 placeholders for unknown fields.

Revised: f5471 cannot fully complete form_1116 inputs. It routes Subpart F and
GILTI amounts to schedule1 only. Foreign taxes are captured as reference data.
(The practitioner completes form_1116 separately through the FEC or form_1116 node.)

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| None (F5471 is informational; no TY2025-specific constants in this simplified node) | N/A | N/A | N/A |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (Drake 5471 screens)"]
    main["5471 main: corp name, category"]
    schi["SCHI: Subpart F income"]
    i1["I1: GILTI inclusion"]
    sche["SCHE: Foreign taxes"]
    schh["SCHH/SCHJ: E&P reference"]
  end
  subgraph node["f5471 node"]
    totalIncome["total_5471_income = subpart_f + gilti"]
  end
  subgraph outputs["Downstream Nodes"]
    s1["schedule1 (line8z_other)"]
  end
  main --> node
  schi --> node
  i1 --> node
  sche --> node
  schh --> node
  node --> s1
```

---

## Edge Cases & Special Rules

1. **Category 1 filers** — officer/director with no stock ownership; typically no
   income inclusion. Subpart F and GILTI fields will be absent.
2. **Category 2/3 filers** — organization events; no income inclusion typically.
3. **Category 4/5 filers** — controlling shareholders with ≥10% ownership; must
   include Subpart F income and GILTI.
4. **Previously taxed E&P** — distributions from previously taxed E&P (PTEP) are
   excluded from income (IRC §959). This node does not implement PTEP exclusion
   calculations; that would require a separate PTEP tracking node.
5. **Section 245A DRD** — dividends from 10%-owned foreign corp may qualify for
   deduction. Not computed here.
6. **High-tax kickout** — Subpart F income subject to >90% effective foreign rate
   may be excluded. Not computed here (Drake handles via override).
7. **Multiple corporations** — each Form 5471 is one array item; incomes are
   summed across all items in a single schedule1 output.
8. **Zero or absent income fields** — if both subpart_f total and gilti_inclusion
   are zero/absent, no schedule1 output is emitted.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 5471 | 2024 | All | https://www.irs.gov/pub/irs-pdf/f5471.pdf | f5471.pdf |
| Instructions for Form 5471 | 2024 | All | https://www.irs.gov/pub/irs-pdf/i5471.pdf | i5471.pdf |
| IRC §951 — Subpart F | 2024 | §951(a) | https://www.law.cornell.edu/uscode/text/26/951 | N/A |
| IRC §951A — GILTI | 2024 | §951A | https://www.law.cornell.edu/uscode/text/26/951A | N/A |
| IRC §960 — Deemed Paid Credit | 2024 | §960(a)(d) | https://www.law.cornell.edu/uscode/text/26/960 | N/A |
| Rev. Proc. 2024-40 | 2024 | TY2025 constants | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | rp-24-40.pdf |
