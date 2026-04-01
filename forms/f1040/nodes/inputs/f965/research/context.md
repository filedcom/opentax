# F965 — §965 Transition Tax (Forms 965-A, 965-C, 965-D, 965-E)

## Overview

This node captures §965 repatriation (transition) tax data for individual taxpayers under the Tax Cuts and Jobs Act (TCJA 2017). IRC §965 required U.S. shareholders of certain foreign corporations (CFCs and other specified foreign corporations) to include previously untaxed accumulated foreign earnings in gross income, creating a one-time "transition tax" for tax year 2017.

Individual taxpayers may elect to pay the net §965 tax liability in installments over 8 years under IRC §965(h). This node captures:
1. The current year's installment payment amount (from Form 965-A Part II, column (k))
2. Whether an installment election was made
3. Transfer agreement type (from Forms 965-C, 965-D, or 965-E)
4. S corporation deferral data (from Form 965-A Part III)

The current-year installment payment flows to **Schedule 2, line 9** (Net 965 tax liability from Form 965-A).

**IRS Form:** 965-A (Individual Report of Net 965 Tax Liability), 965-C, 965-D, 965-E
**Drake Screen:** 965A (primary), 965C, 965D, 965E
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A (no direct Drake KB article found)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| tax_year_of_inclusion | string | yes | Form 965-A Part I col (a) | Tax year of the original §965(a) inclusion (typically "2017") | IRC §965(a); Form 965-A Part I col (a) | https://www.irs.gov/forms-pubs/about-form-965-a |
| net_965_tax_liability | number (nonneg) | yes | Form 965-A Part I col (d) | Net §965 tax liability = tax with §965 amounts minus tax without §965 amounts | IRC §965(h)(1); Form 965-A Part I col (d) | https://www.irs.gov/instructions/i965a |
| installment_election | boolean | yes | Form 965-A Part I col (g) | Whether taxpayer elected to pay in installments under IRC §965(h) | IRC §965(h)(1); Form 965-A Part I col (g) | https://www.irs.gov/instructions/i965a |
| current_year_installment | number (nonneg) | yes | Form 965-A Part II col (k) | Current-year installment payment amount — flows to Schedule 2 line 9 | IRC §965(h); Form 965-A Part II col (k) | https://www.irs.gov/instructions/i965a |
| transfer_agreement_type | enum | no | Forms 965-C/D/E | Type of transfer agreement if liability was transferred: none, C (§965(h)(3)), D (§965(i)(2)), E (§965(i)(4)(D)) | IRC §965(h)(3), §965(i)(2), §965(i)(4)(D) | https://www.irs.gov/forms-pubs/about-form-965-a |
| s_corp_deferred_amount | number (nonneg) | no | Form 965-A Part I col (e); Part III col (g) | Total S corporation deferred §965 tax liability under IRC §965(i) | IRC §965(i); Form 965-A Part III col (g) | https://www.irs.gov/instructions/i965a |
| remaining_balance | number (nonneg) | no | Form 965-A Part II col (j) | Remaining unpaid installment balance at end of year (informational) | IRC §965(h); Form 965-A Part II col (j) | https://www.irs.gov/instructions/i965a |

---

## Calculation Logic

### Step 1 — Identify current-year installment payment

The installment payment schedule under IRC §965(h) is:
- Years 1–5: 8% of net §965 tax liability each year
- Year 6: 15%
- Year 7: 20%
- Year 8: 25%

The current year's actual payment is recorded on Form 965-A Part II, column (k). This is the amount that flows to Schedule 2 line 9.

Source: IRC §965(h)(1); Form 965-A Instructions (01/2021), Part II — https://www.irs.gov/instructions/i965a

### Step 2 — Route current-year installment to Schedule 2 line 9

The current-year payment from Form 965-A Part II column (k) is reported on **Schedule 2 (Additional Taxes), line 9**.

Source: Form 965-A Instructions (01/2021), Part II column (k); IRS Form 1040 Instructions — Schedule 2 Part II Line 9

### Step 3 — No adjustment for transfer agreements at this node

Transfer agreements (Forms 965-C, 965-D, 965-E) affect who owes the installment but do not change the amount flowing to Schedule 2. The transfer_agreement_type field is informational metadata for the return preparer.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line9_965_net_tax_liability | schedule2 | current_year_installment > 0 | IRC §965(h); Schedule 2 line 9 | https://www.irs.gov/instructions/i965a |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Installment years 1–5 rate | 8% per year | IRC §965(h)(1)(A) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section965 |
| Installment year 6 rate | 15% | IRC §965(h)(1)(B) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section965 |
| Installment year 7 rate | 20% | IRC §965(h)(1)(C) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section965 |
| Installment year 8 rate | 25% | IRC §965(h)(1)(D) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section965 |
| First installment deadline | Original return due date | IRC §965(h)(2) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section965 |

Note: The node does not compute the installment amount — the taxpayer provides the actual current-year payment from their Form 965-A. TY2025 is year 8 (final installment) of the original 2017 inclusion election.

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (Forms 965-A/C/D/E)"]
    A["tax_year_of_inclusion\nnet_965_tax_liability\ninstallment_election\ncurrent_year_installment\ntransfer_agreement_type\ns_corp_deferred_amount"]
  end
  subgraph node["f965 Node"]
    B["Routes current_year_installment\nto Schedule 2 line 9"]
  end
  subgraph outputs["Downstream Nodes"]
    C["schedule2\nline9_965_net_tax_liability"]
  end
  A --> B --> C
```

---

## Edge Cases & Special Rules

1. **TY2025 is year 8 (final installment)**: For taxpayers who made the §965(h) election in 2017, TY2025 is the 8th and final year (25% installment). The node does not enforce this — it accepts the current_year_installment as entered by the taxpayer.

2. **No installment election**: If installment_election is false, the full net_965_tax_liability was due in the year of inclusion (2017). By TY2025, any amounts owed would typically have been fully paid. The current_year_installment would be 0 in this case.

3. **Transfer agreements (965-C, 965-D, 965-E)**: When a taxpayer transfers their §965 liability via a transfer agreement, the transferee takes over the obligation. The transfer_agreement_type field records which form was filed, but does not change the amount flowing to Schedule 2. The transferee would report current_year_installment as their payment amount.

4. **S corporation deferrals (§965(i))**: S corp shareholders may defer their §965 liability under §965(i). The s_corp_deferred_amount is informational; the deferred amount does not flow to Schedule 2 until triggered (e.g., by a disposition of S corp stock).

5. **Zero installment**: If current_year_installment is 0 (fully paid, no installment election, or S corp deferral), no output is emitted.

6. **Multiple 965-A records**: A taxpayer may have multiple inclusion years if they had §965 amounts in both 2017 and 2018. Each year's installment is tracked separately on Form 965-A but all current-year payments are summed to Schedule 2 line 9.

7. **Annual reporting requirement**: Taxpayers must file Form 965-A annually as long as any §965 net tax liability or deferred liability remains. A 5% penalty applies for failure to report S corp deferred liabilities (Form 965-A Part IV).

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Instructions for Form 965-A | 2021 | All Parts | https://www.irs.gov/instructions/i965a | .research/docs/i965a.pdf |
| IRC §965 | 2017 (TCJA) | §965(a),(h),(i) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section965 | N/A |
| About Form 965-A | current | Overview | https://www.irs.gov/forms-pubs/about-form-965-a | N/A |
| IRS Q&A §965 Reporting | 2018 | Individual reporting | https://www.irs.gov/newsroom/questions-and-answers-about-reporting-related-to-section-965-on-2018-tax-returns | N/A |
