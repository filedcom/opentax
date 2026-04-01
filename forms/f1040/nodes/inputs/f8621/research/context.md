# f8621 — Form 8621: Information Return by a Shareholder of a Passive Foreign Investment Company or Qualified Electing Fund

## Overview

Form 8621 is filed annually by US shareholders of Passive Foreign Investment Companies (PFICs) or Qualified Electing Funds (QEFs). A PFIC is a foreign corporation where ≥75% of gross income is passive OR ≥50% of assets produce passive income (IRC §1297). US shareholders must report their PFIC holdings and, depending on the taxation regime elected, may owe additional tax or include income.

Three taxation regimes exist:
1. **Excess Distribution (default)**: Special computation for distributions exceeding 125% of the average of prior 3 years. Allocated to prior years and taxed at highest rate plus interest charge. IRC §1291.
2. **Mark-to-Market (MTM)**: Annual recognition of gains/losses based on FMV change. Section 1296 election. IRC §1296.
3. **Qualified Electing Fund (QEF)**: Annual inclusion of taxpayer's pro-rata share of PFIC ordinary income and net capital gain. IRC §1293.

**IRS Form:** Form 8621
**Drake Screen:** 8621
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| company_name | string | Yes | Name of PFIC/QEF | Legal name of the foreign corporation | Form 8621 top | https://www.irs.gov/pub/irs-pdf/f8621.pdf |
| company_ein_or_ref | string | No | EIN or reference ID | EIN of PFIC or internal reference (optional) | Form 8621 top | https://www.irs.gov/pub/irs-pdf/f8621.pdf |
| country_of_incorporation | string | Yes | Country | Country where PFIC/QEF is incorporated | Form 8621 line A | https://www.irs.gov/pub/irs-pdf/f8621.pdf |
| regime | PficRegime enum | Yes | Taxation regime | EXCESS_DISTRIBUTION, MTM, or QEF | Form 8621 Parts II, III, IV | https://www.irs.gov/pub/irs-pdf/f8621.pdf |
| shares_owned | number | Yes | Shares owned | Number of shares owned at year end | Form 8621 Part I line 1a | https://www.irs.gov/pub/irs-pdf/f8621.pdf |
| fmv_at_year_end | number | Yes | FMV at year end | Fair market value of shares at end of tax year | Form 8621 Part I line 1b; IRC §1296(e) | https://www.irs.gov/pub/irs-pdf/f8621.pdf |
| total_distributions | number | No | Total distributions | Total distributions received during year | Form 8621 Part II line 6; IRC §1291 | https://www.irs.gov/pub/irs-pdf/f8621.pdf |
| excess_distribution_amount | number | No | Excess distribution | Amount of distribution exceeding 125% of prior 3-year average (IRC §1291(b)) | Form 8621 Part II line 15 | https://www.irs.gov/pub/irs-pdf/f8621.pdf |
| qef_ordinary_income | number | No | QEF ordinary income | Pro-rata share of PFIC ordinary income (QEF regime only; IRC §1293(a)(1)(A)) | Form 8621 Part III line 6a | https://www.irs.gov/pub/irs-pdf/f8621.pdf |
| qef_capital_gain | number | No | QEF net capital gain | Pro-rata share of PFIC net capital gain (QEF regime only; IRC §1293(a)(1)(B)) | Form 8621 Part III line 6b | https://www.irs.gov/pub/irs-pdf/f8621.pdf |
| mtm_gain_loss | number | No | MTM gain or loss | Mark-to-market gain or (loss) for year (MTM regime only; IRC §1296(a)) | Form 8621 Part IV line 9 | https://www.irs.gov/pub/irs-pdf/f8621.pdf |

---

## Calculation Logic

### Step 1 — Determine active regime
Branch on the `regime` field to determine computation path.

### Step 2a — Excess Distribution regime (IRC §1291)
- If `excess_distribution_amount` > 0, compute simplified tax. The excess distribution is subject to ordinary income tax at the highest rate (37% for TY2025) plus an interest charge.
- For simplicity, the node routes the `excess_distribution_amount` to Schedule 2 (additional taxes) as a pre-computed tax amount. The full §1291 computation (allocating to prior holding years) is complex and must be done on the form itself; the node routes the resulting tax.
- Non-excess portion of distributions: flows as ordinary income (not computed here — user inputs the excess separately).

### Step 2b — MTM regime (IRC §1296)
- `mtm_gain_loss` if positive (gain): routes to Schedule 1 as ordinary income (line8z_other).
- `mtm_gain_loss` if negative (loss): routes to Schedule 1 as a loss (negative, line8z_other), but only to the extent of prior MTM inclusions (simplified: route the net amount).

### Step 2c — QEF regime (IRC §1293)
- `qef_ordinary_income`: routes to Schedule 1 as other income (line8z_other).
- `qef_capital_gain`: routes to Schedule 1 as capital gain (line8z_other or to schedule_d — simplified: route as line8z_other for the node).

Source: Form 8621 instructions; IRC §§1291–1298.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line8_form5329_tax (excess dist tax, simplified) | schedule2 | regime = EXCESS_DISTRIBUTION AND excess_distribution_amount > 0 | IRC §1291; Schedule 2 line 8 | https://www.irs.gov/instructions/i8621 |
| line8z_other (MTM gain/loss) | schedule1 | regime = MTM AND mtm_gain_loss ≠ 0 | IRC §1296(a); Schedule 1 Line 8 | https://www.irs.gov/instructions/i8621 |
| line8z_other (QEF ordinary income + capital gain) | schedule1 | regime = QEF AND (qef_ordinary_income > 0 OR qef_capital_gain > 0) | IRC §1293; Schedule 1 Line 8 | https://www.irs.gov/instructions/i8621 |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Highest marginal tax rate (TY2025) | 37% | Rev. Proc. 2024-40, §3.01 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Excess distribution threshold | 125% of prior 3-year average | IRC §1291(b)(2)(C) | https://www.law.cornell.edu/uscode/text/26/1291 |
| PFIC passive income threshold | ≥75% of gross income | IRC §1297(a)(1) | https://www.law.cornell.edu/uscode/text/26/1297 |
| PFIC passive asset threshold | ≥50% of asset value | IRC §1297(a)(2) | https://www.law.cornell.edu/uscode/text/26/1297 |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per PFIC)"]
    user["company_name, regime, shares_owned, fmv_at_year_end, excess_distribution_amount, qef_ordinary_income, qef_capital_gain, mtm_gain_loss"]
  end
  subgraph node["f8621"]
    branch{"Regime?"}
    ed["Excess Distribution: route tax → schedule2"]
    mtm["MTM: route gain/loss → schedule1"]
    qef["QEF: route income → schedule1"]
  end
  subgraph outputs["Downstream Nodes"]
    s1["schedule1 (line8z_other)"]
    s2["schedule2 (line8_form5329_tax)"]
  end
  inputs --> node --> branch
  branch -->|EXCESS_DISTRIBUTION| ed --> s2
  branch -->|MTM| mtm --> s1
  branch -->|QEF| qef --> s1
```

---

## Edge Cases & Special Rules

1. **Excess Distribution tax**: The §1291 interest charge calculation is complex (requires per-year allocation). Simplified: route excess_distribution_amount × highest rate (37%) as a schedule2 tax. Users complete the actual interest charge on Form 8621.
2. **MTM loss limitation**: MTM losses are limited to prior year MTM inclusions. Simplified: route the full mtm_gain_loss (negative is a loss).
3. **Annual filing required**: Form 8621 must be filed even if there are no distributions (purely informational years).
4. **Multiple PFICs**: One item per PFIC. Multiple PFICs can appear in the array — each has its own regime.
5. **Mixed regimes**: Different PFICs can have different regimes; each routes independently.
6. **QEF with only capital gain**: Even if ordinary income = 0, the capital gain portion routes.
7. **Non-negative amounts**: shares_owned, fmv_at_year_end, total_distributions, excess_distribution_amount, qef_ordinary_income, qef_capital_gain must be ≥ 0.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8621 | 2024 | All | https://www.irs.gov/pub/irs-pdf/f8621.pdf | f8621.pdf |
| Instructions for Form 8621 | 2024 | All | https://www.irs.gov/instructions/i8621 | i8621.pdf |
| IRC §1291 | Current | Excess distribution computation | https://www.law.cornell.edu/uscode/text/26/1291 | N/A |
| IRC §1293 | Current | QEF inclusions | https://www.law.cornell.edu/uscode/text/26/1293 | N/A |
| IRC §1296 | Current | MTM elections | https://www.law.cornell.edu/uscode/text/26/1296 | N/A |
| IRC §1297 | Current | PFIC definition | https://www.law.cornell.edu/uscode/text/26/1297 | N/A |
| Rev. Proc. 2024-40 | 2024 | §3.01 — tax rate tables | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | rp-24-40.pdf |
