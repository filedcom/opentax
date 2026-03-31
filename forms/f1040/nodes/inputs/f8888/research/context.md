# Form 8888 — Allocation of Refund (Including Savings Bond Purchases)

## Overview
Metadata-only form. Allows taxpayers to split a refund across up to 3 bank accounts and/or purchase US Series I savings bonds. No tax computation — produces zero outputs. The node validates and stores the refund routing instructions.

**IRS Form:** 8888
**Drake Screen:** 8888
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14040

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| account_1 | AccountSchema | No | Account 1 | First direct deposit account | Form 8888 Part I Line 1 | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| account_2 | AccountSchema | No | Account 2 | Second direct deposit account | Form 8888 Part I Line 2 | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| account_3 | AccountSchema | No | Account 3 | Third direct deposit account | Form 8888 Part I Line 3 | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| account_*.routing_number | string | No | Routing number | 9-digit bank routing number | Form 8888 | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| account_*.account_number | string | No | Account number | Bank account number | Form 8888 | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| account_*.account_type | AccountType enum | No | Account type | checking or savings | Form 8888 | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| account_*.amount | number (≥0) | No | Amount | Dollar amount to deposit into this account | Form 8888 | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| savings_bond_amount | number (≥0) | No | Bond purchase | Amount to use for purchasing Series I savings bonds | Form 8888 Part II | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| bond_owner_name | string | No | Bond owner | Name of primary bond owner | Form 8888 Part II | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| bond_coowner_name | string | No | Co-owner/beneficiary | Co-owner or beneficiary name | Form 8888 Part II | https://www.irs.gov/pub/irs-pdf/i8888.pdf |

---

## Calculation Logic

### Step 1 — Validate and store
`inputSchema.parse(rawInput)` — no computation performed.
Returns `{ outputs: [] }`.
Source: Form 8888 instructions — https://www.irs.gov/pub/irs-pdf/i8888.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | — | Form 8888 produces no tax-computation outputs | Form 8888 instructions | https://www.irs.gov/pub/irs-pdf/i8888.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Maximum direct deposit accounts | 3 | Form 8888 instructions; statutory | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| Minimum savings bond purchase | $50 (multiples of $50) | TreasuryDirect rules | https://www.treasurydirect.gov |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    accts["account_1/2/3\n(routing, account, amount)"]
    bonds["savings_bond_amount\nbond owner names"]
  end
  subgraph node["f8888 (Refund Allocation)"]
    val["validate only\noutputs: []"]
  end
  accts & bonds --> val

---

## Edge Cases & Special Rules

1. **No computation outputs**: Purely metadata. IRS uses this to route the refund; no tax effect.
2. **Amounts must sum to refund**: The combined amounts across all accounts + savings bonds must equal the total refund. Enforced by IRS processing, not by the node.
3. **Savings bonds in multiples of $50**: TreasuryDirect requires bond purchases in multiples of $50. Minimum $50.
4. **Cannot split a balance due**: Form 8888 only applies when there is a refund. If a balance is owed, this form has no effect.
5. **Up to 3 accounts**: IRS accepts a maximum of 3 direct deposit accounts via Form 8888.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8888 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8888.pdf | .research/docs/i8888.pdf |
