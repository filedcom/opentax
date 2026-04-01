# f114 — FBAR (Report of Foreign Bank and Financial Accounts)

## Overview
This node captures FinCEN Form 114 (FBAR) data. U.S. persons who have a financial interest in or signature authority over foreign financial accounts must file an FBAR if the aggregate value of those accounts exceeded $10,000 at any point during the calendar year. FBAR is NOT filed with the IRS — it is filed separately with FinCEN (Financial Crimes Enforcement Network) by April 15. This Drake screen captures the data for record-keeping alongside the 1040 return.

**IRS Form:** FinCEN Form 114 (FBAR)
**Drake Screen:** 114
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A (FinCEN, not IRS)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| has_foreign_accounts | boolean | yes | "Did taxpayer have foreign financial accounts?" | Master switch indicating foreign account ownership/signature authority | FinCEN Form 114, Part I | https://www.fincen.gov/sites/default/files/shared/FBAR%20Line%20Item%20Filing%20Instructions.pdf |
| max_aggregate_value | number | no | "Maximum aggregate value of all accounts" | Highest aggregate value of all foreign financial accounts during the year | FinCEN Form 114, Item 15 | https://www.fincen.gov/sites/default/files/shared/FBAR%20Line%20Item%20Filing%20Instructions.pdf |
| account_count | number | no | "Number of foreign accounts" | Total count of foreign financial accounts | FinCEN Form 114, Part II | https://www.fincen.gov/sites/default/files/shared/FBAR%20Line%20Item%20Filing%20Instructions.pdf |
| accounts | array | no | "Account details" | Per-account details for each foreign financial account | FinCEN Form 114, Part II/III | https://www.fincen.gov/sites/default/files/shared/FBAR%20Line%20Item%20Filing%20Instructions.pdf |
| accounts[].country | string | no | "Country" | Country where the account is held | FinCEN Form 114, Item 14 | https://www.fincen.gov/sites/default/files/shared/FBAR%20Line%20Item%20Filing%20Instructions.pdf |
| accounts[].institution_name | string | no | "Financial institution name" | Name of the foreign financial institution | FinCEN Form 114, Item 7 | https://www.fincen.gov/sites/default/files/shared/FBAR%20Line%20Item%20Filing%20Instructions.pdf |
| accounts[].account_type | enum | no | "Account type" | Type: bank / securities / other | FinCEN Form 114, Part II/III | https://www.fincen.gov/sites/default/files/shared/FBAR%20Line%20Item%20Filing%20Instructions.pdf |
| accounts[].max_value | number | no | "Maximum value during year" | Maximum value of this account during the year | FinCEN Form 114, Item 15 | https://www.fincen.gov/sites/default/files/shared/FBAR%20Line%20Item%20Filing%20Instructions.pdf |

---

## Calculation Logic

### Step 1 — No tax computation
FBAR is a disclosure/reporting requirement only. It does not directly affect federal income tax computation. The node stores the data for record-keeping and compliance tracking. No mathematical computation is required.

Source: FinCEN Form 114 instructions, General Information section — FBAR is filed with FinCEN, not the IRS, and produces no tax line entries.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (informational only) | f1040 | has_foreign_accounts = true — sets foreign_accounts_indicator flag | FinCEN Form 114; Schedule B Part III line 7a | https://www.irs.gov/instructions/i1040sab |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| FBAR_FILING_THRESHOLD | 10000 | FinCEN Form 114 instructions, "Who Must File" | https://www.fincen.gov/sites/default/files/shared/FBAR%20Line%20Item%20Filing%20Instructions.pdf |
| FBAR_DUE_DATE | April 15 | FinCEN Form 114 instructions, automatic extension to October 15 | https://www.fincen.gov/report-foreign-bank-and-financial-accounts |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    has_foreign_accounts
    max_aggregate_value
    account_count
    accounts["accounts[]"]
  end
  subgraph node["f114 — FBAR"]
    validate["validate has_foreign_accounts"]
  end
  subgraph outputs["Downstream Nodes"]
    f1040["f1040 (foreign_accounts_indicator)"]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **$10,000 threshold**: Filing is required if aggregate exceeds $10,000 at ANY point during the year, not just at year-end.
2. **Signature authority**: U.S. persons with signature authority (but no financial interest) also must file.
3. **Joint accounts**: Each U.S. person with interest must file separately.
4. **25+ accounts**: If taxpayer has 25+ accounts, only aggregate info is required (no per-account detail).
5. **Not filed with the 1040**: Drake captures this data for the preparer's records; actual filing is with FinCEN's BSA E-Filing system.
6. **Schedule B connection**: Foreign accounts existence must be disclosed on Schedule B Part III Line 7a of Form 1040.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| FinCEN Form 114 Line Item Filing Instructions | 2024 | General Information | https://www.fincen.gov/sites/default/files/shared/FBAR%20Line%20Item%20Filing%20Instructions.pdf | N/A |
| IRS Schedule B Instructions | 2025 | Part III | https://www.irs.gov/instructions/i1040sab | N/A |
