# Form 8888 — Allocation of Refund

## Overview
Metadata-only form. The [December 2025 Form 8888](https://www.irs.gov/pub/irs-prior/f8888--2025.pdf) allows a taxpayer to split a direct-deposit refund between two or three accounts; the refund-funded savings-bond purchase program was discontinued. No tax computation — produces zero outputs. Native MeF and PDF descriptors are written for complete, reconciled account facts. Focused cases, XSD validation and filled-PDF inspection remain unrun.

**IRS Form:** 8888
**Drake Screen:** 8888
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14040

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| account_1 | AccountSchema | Yes | Account 1 | First direct deposit account | Form 8888 Part I Line 1 | https://www.irs.gov/pub/irs-prior/f8888--2025.pdf |
| account_2 | AccountSchema | Yes | Account 2 | Second direct deposit account | Form 8888 Part I Line 2 | https://www.irs.gov/pub/irs-prior/f8888--2025.pdf |
| account_3 | AccountSchema | No | Account 3 | Third direct deposit account | Form 8888 Part I Line 3 | https://www.irs.gov/pub/irs-pdf/i8888.pdf |
| account_*.routing_number | string | Yes | Routing number | 9-digit U.S. routing number with valid prefix | Form 8888 lines 1b/2b/3b | https://www.irs.gov/pub/irs-prior/f8888--2025.pdf |
| account_*.account_number | string | Yes | Account number | 1-17 alphanumeric or hyphen characters | Form 8888 lines 1d/2d/3d | https://www.irs.gov/pub/irs-prior/f8888--2025.pdf |
| account_*.account_type | AccountType enum | Yes | Account type | checking or savings | Form 8888 lines 1c/2c/3c | https://www.irs.gov/pub/irs-prior/f8888--2025.pdf |
| account_*.amount | positive integer | Yes | Amount | At least $1 to this account | Form 8888 lines 1a/2a/3a | https://www.irs.gov/pub/irs-prior/f8888--2025.pdf |
| account_*.owner_name | string | Yes | Account owner | Filing preflight only; must match taxpayer or spouse name | Form 8888 instructions, account ownership | https://www.irs.gov/pub/irs-prior/f8888--2025.pdf |

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
| Minimum account deposit | $1 per account | December 2025 Form 8888 | https://www.irs.gov/pub/irs-prior/f8888--2025.pdf |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    accts["account_1/2/3\n(routing, account, amount)"]
  end
  subgraph node["f8888 (Refund Allocation)"]
    val["validate only\noutputs: []"]
  end
  accts --> val

---

## Edge Cases & Special Rules

1. **No computation outputs**: Purely metadata. IRS uses this to route the refund; no tax effect.
2. **Amounts must sum to refund**: MeF preflight requires line 5 to equal finalized Form 1040 line 35a exactly.
3. **Obsolete savings-bond keys reject**: The TY2025 source schema is strict; `savings_bond_amount` and bond owner fields cannot be silently discarded.
4. **Cannot split a balance due**: Form 8888 only applies when there is a refund. If a balance is owed, this form has no effect.
5. **Up to 3 accounts**: IRS accepts a maximum of 3 direct deposit accounts via Form 8888.
6. **No competing refund instruction**: A Form 1040 single-account direct deposit or Form 8379 injured-spouse allocation cannot accompany a split-deposit Form 8888.
7. **PDF map written, not yet validated**: The native XML uses the cached TY2025 v5.4 `IRS8888.xsd`. The PDF descriptor maps the canonical December 2025 AcroForm's 20 fields and 20 page-one widgets, leaves reserved line 4 blank, and retains only the first page. Filled visual and field-data checks remain part of the full batch.
8. **Ownership evidence limit**: The owner name is a user-provided preflight fact matched to the return, not an independent bank-account ownership confirmation.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8888 | Dec 2025 | All | https://www.irs.gov/pub/irs-prior/f8888--2025.pdf | Official IRS source |
