# Form 1099-PATR — Taxable Distributions Received From Cooperatives

## Overview

Form 1099-PATR is issued by cooperatives to patrons (members) who received distributions of
$10 or more during the tax year. The form covers patronage dividends, nonpatronage
distributions, per-unit retain allocations, redemptions of nonqualified written notices, and
informational fields for §199A qualified cooperative deductions.

This node captures all boxes from one or more 1099-PATR forms. For non-business patrons,
taxable distributions (boxes 1–3 combined) flow to **Schedule 1 line 8z** (other income).
Federal income tax withheld (box 4) flows to **Form 1040 line 25b**. Business patrons
(farmers, self-employed) have their boxes 1–3 amounts excluded from the Schedule 1 routing
(they are reported on Schedule F or Schedule C — deferred to those nodes).

Box 7 (qualified payments) is informational for the §199A deduction worksheet (Form 8995/8995-A).
Box 9 (§199A(g) deduction) represents a cooperative-level DPAD-replacement deduction —
deferred to Form 8995/8995-A. Box 6 (DPAD) is a legacy field that expired after 2017.

**IRS Form:** 1099-PATR
**Drake Screen:** 99P
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/2025/1099-PATR

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| box1_patronage_dividends | number ≥ 0 | no | Box 1 | Patronage dividends paid in money or qualified check; includible in gross income under IRC §1385(a)(1) | IRC §1385(a)(1); Form 1099-PATR instructions Box 1 | https://www.irs.gov/instructions/i1099patr |
| box2_nonpatronage_distributions | number ≥ 0 | no | Box 2 | Nonpatronage distributions from an exempt farmers' cooperative under IRC §521; includible in gross income | IRC §1385(a)(3); Form 1099-PATR instructions Box 2 | https://www.irs.gov/instructions/i1099patr |
| box3_per_unit_retain | number ≥ 0 | no | Box 3 | Per-unit retain allocations paid in money or qualified check; includible in gross income under IRC §1385(a)(2) | IRC §1385(a)(2); Form 1099-PATR instructions Box 3 | https://www.irs.gov/instructions/i1099patr |
| box4_federal_withheld | number ≥ 0 | no | Box 4 | Federal income tax withheld (backup withholding at 24%); flows to Form 1040 line 25b | IRC §3406; Form 1099-PATR instructions Box 4 | https://www.irs.gov/instructions/i1099patr |
| box5_redeemed_nonqualified | number ≥ 0 | no | Box 5 | Amount redeemed on nonqualified written notices of allocation; includible in gross income in year of redemption | IRC §1385(b); Form 1099-PATR instructions Box 5 | https://www.irs.gov/instructions/i1099patr |
| box6_dpad | number ≥ 0 | no | Box 6 | Domestic production activities deduction (DPAD) passed through from cooperative; **expired after 12/31/2017** — legacy field only | IRC §199 (repealed by TCJA §13305 eff. 2018); Form 1099-PATR instructions Box 6 | https://www.irs.gov/instructions/i1099patr |
| box7_qualified_payments | number ≥ 0 | no | Box 7 | Qualified payments from a specified agricultural or horticultural cooperative; used to compute patron's §199A deduction reduction on Form 8995/8995-A | IRC §199A(b)(7); Form 1099-PATR instructions Box 7 | https://www.irs.gov/instructions/i1099patr |
| box8_qualified_written_notice | number ≥ 0 | no | Box 8 | Qualified written notices of allocation and other nonqualified allocations at stated dollar amount; informational | IRC §1388(c); Form 1099-PATR instructions Box 8 | https://www.irs.gov/instructions/i1099patr |
| box9_section199a_deduction | number ≥ 0 | no | Box 9 | Section 199A(g) deduction passed through from cooperative to patron; reduces patron's QBI deduction on Form 8995/8995-A | IRC §199A(g); Form 1099-PATR instructions Box 9 | https://www.irs.gov/instructions/i1099patr |
| payer_name | string | no | Payer name | Name of the cooperative issuing the form | Form 1099-PATR instructions | https://www.irs.gov/instructions/i1099patr |
| payer_tin | string | no | Payer TIN | EIN of the cooperative | Form 1099-PATR instructions | https://www.irs.gov/instructions/i1099patr |
| account_number | string | no | Account number | Patron's account number with the cooperative | Form 1099-PATR instructions | https://www.irs.gov/instructions/i1099patr |
| trade_or_business | boolean | no | Trade or business | Whether distributions are from a trade or business (e.g., farming). True → boxes 1/2/3 route to Schedule F or C, not Schedule 1 | IRC §1385; Pub. 225 | https://www.irs.gov/pub/irs-pdf/p225.pdf |

---

## Calculation Logic

### Step 1 — Classify items by business use

Separate items into:
- **Non-business items**: `trade_or_business !== true` (false or omitted)
- **Business items**: `trade_or_business === true`

Source: IRC §1385(a); Pub. 225 (Farmer's Tax Guide) — cooperative distributions from a
farming trade or business are reported on Schedule F, not as other income on Schedule 1.

### Step 2 — Sum taxable distributions for non-business items

For non-business items, sum across all items:
```
other_income = sum(box1_patronage_dividends) + sum(box2_nonpatronage_distributions) + sum(box3_per_unit_retain)
```

If `other_income > 0`, emit one output to `schedule1.line8z_other_income`.

Source: IRC §1385(a)(1)–(3); Form 1040 Schedule 1 instructions, line 8z.

### Step 3 — Sum federal withholding across all items

```
total_withheld = sum(box4_federal_withheld)   // across ALL items (business and non-business)
```

If `total_withheld > 0`, emit one output to `f1040.line25b_withheld_1099`.

Source: IRC §3406; Form 1040 instructions line 25b.

### Step 4 — Business item routing (deferred)

When `trade_or_business === true`:
- Box 1 patronage dividends → Schedule F (farm income) or Schedule C
- Box 2 nonpatronage distributions → Schedule F or Schedule C
- Box 3 per-unit retain allocations → Schedule F or Schedule C

This routing is **deferred** in the current implementation — the Schedule F / Schedule C
nodes handle these fields when they exist.

### Step 5 — Informational fields (no current-year output)

- **Box 5** (redeemed nonqualified written notices): includible in gross income but
  currently not separately routed — treated the same as box 1 in future implementations.
  Current implementation captures the field but does not emit an output.
- **Box 6** (DPAD): expired after 2017; no output emitted regardless of value.
- **Box 7** (qualified payments): informational for Form 8995/8995-A §199A deduction
  reduction; deferred to that node.
- **Box 8** (qualified written notices): informational; no current-year income output.
- **Box 9** (§199A(g) deduction): passed through to patron; deferred to Form 8995/8995-A.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line8z_other_income | schedule1 | Sum of boxes 1+2+3 for non-business items > 0 | IRC §1385(a); Schedule 1 instructions line 8z | https://www.irs.gov/instructions/i1040s1 |
| line25b_withheld_1099 | f1040 | Total box 4 withheld > 0 (all items) | IRC §3406; Form 1040 instructions line 25b | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf |

**Not yet routed (deferred):**
- Box 1/2/3 for business items → Schedule F / Schedule C
- Box 7 qualified payments → Form 8995 / Form 8995-A (§199A reduction)
- Box 9 §199A(g) deduction → Form 8995 / Form 8995-A

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Backup withholding rate | 24% | IRC §3406(a)(1); unchanged for TY2025 (Rev Proc 2024-40 §3.07 confirms no change) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| 1099-PATR filing threshold (payer obligation) | $10 | IRC §6044(a)(1); Form 1099-PATR instructions | https://www.irs.gov/instructions/i1099patr |

Note: The §199A income thresholds ($197,300 single / $394,600 MFJ for TY2025 per Rev Proc 2024-40 §3.22) apply to Form 8995/8995-A when routing box 7 and box 9. They are not applied in this node.

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (one or more 1099-PATR items)"]
    b1["Box 1: Patronage Dividends"]
    b2["Box 2: Nonpatronage Distributions"]
    b3["Box 3: Per-Unit Retain"]
    b4["Box 4: Federal Withheld"]
    b5["Box 5: Redeemed Nonqualified (informational)"]
    b6["Box 6: DPAD (expired)"]
    b7["Box 7: Qualified Payments (informational)"]
    b8["Box 8: Qualified Written Notices (informational)"]
    b9["Box 9: §199A(g) Deduction (informational)"]
    tob["trade_or_business flag"]
  end
  subgraph node["f1099patr"]
    classify["Classify: business vs. non-business"]
    sumNonBiz["Sum boxes 1+2+3 (non-business only)"]
    sumWH["Sum box 4 (all items)"]
  end
  subgraph outputs["Downstream Nodes"]
    s1["schedule1.line8z_other_income"]
    f1040["f1040.line25b_withheld_1099"]
    deferred["Form 8995/8995-A (deferred)\nSchedule F/C (deferred)"]
  end
  b1 --> classify
  b2 --> classify
  b3 --> classify
  b4 --> sumWH
  tob --> classify
  classify --> sumNonBiz
  sumNonBiz -->|"> 0"| s1
  sumWH -->|"> 0"| f1040
  b7 --> deferred
  b9 --> deferred
```

---

## Edge Cases & Special Rules

1. **Empty item produces no outputs**: An item with no dollar amounts (only `payer_name`, `payer_tin`, etc.) emits zero outputs.

2. **trade_or_business defaults to non-business**: When `trade_or_business` is omitted or `false`, the item's boxes 1/2/3 route to Schedule 1 other income. This is the correct default for non-farmer patrons (e.g., consumer co-op members).

3. **Mixed business and non-business items**: When a taxpayer has two 1099-PATRs — one from a farming co-op (business) and one from a consumer co-op (non-business) — only the non-business amounts route to Schedule 1. The node aggregates them separately.

4. **Box 4 withheld applies across all items**: Withholding (box 4) flows to Form 1040 line 25b regardless of whether the item is business or non-business.

5. **Box 6 DPAD is legacy only**: Any value in box 6 is captured in the schema but never emitted. The DPAD was repealed by the Tax Cuts and Jobs Act for tax years after 2017. Cooperatives may still show this field on older forms or amended returns, but it has no effect.

6. **Box 5 (redeemed nonqualified notices) is not separately routed**: In the current implementation, box 5 is captured in the schema but not included in the `schedule1Output` calculation. A future enhancement should include box 5 in the boxes 1+2+3 sum for non-business items, as it is includible in gross income under IRC §1385(b).

7. **Box 7 qualified payments affect §199A deduction reduction**: This is a patron-level deduction reduction (IRC §199A(b)(7)) — not income. It reduces the §199A deduction on Form 8995 line 7 or Form 8995-A. Currently deferred.

8. **Box 9 §199A(g) deduction is cooperative-level passthrough**: The cooperative computes a DPAD-analog deduction and passes it to patrons. The patron reports it on Form 8995 or 8995-A. Currently deferred.

9. **Multiple 1099-PATR forms**: All non-business boxes 1+2+3 are summed into a single Schedule 1 output. All box 4 withholding is summed into a single Form 1040 output. The schema requires at least one item.

10. **$10 threshold is a payer obligation, not a patron exclusion**: Cooperatives are required to file 1099-PATR if total distributions to a patron are $10 or more. Amounts below $10 may still be taxable if received — this node does not enforce a $10 minimum.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 1099-PATR Instructions | 2025 | All boxes | https://www.irs.gov/instructions/i1099patr | .research/docs/i1099patr.pdf |
| IRC §1385 — Amounts Included in Patron's Gross Income | N/A (statutory) | §1385(a)(1)–(3), (b) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1385 | N/A |
| IRC §1388 — Definitions | N/A (statutory) | §1388(c) qualified written notices | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1388 | N/A |
| IRC §199A — Deduction for Qualified Business Income | N/A (statutory) | §199A(b)(7), §199A(g) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section199A | N/A |
| IRS Pub. 225 — Farmer's Tax Guide | 2024 (TY2025) | "Cooperatives" | https://www.irs.gov/pub/irs-pdf/p225.pdf | .research/docs/p225.pdf |
| Form 1040 Schedule 1 Instructions | 2025 | Line 8z (Other Income) | https://www.irs.gov/instructions/i1040s1 | .research/docs/i1040s1.pdf |
| Form 1040 Instructions | 2025 | Line 25b (Federal Tax Withheld) | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf | .research/docs/i1040gi.pdf |
| Rev Proc 2024-40 | 2024 | §3.07 (backup withholding), §3.22 (§199A thresholds) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
| Drake KB — 1099-PATR screen (99P) | 2025 | 1099-PATR data entry | https://kb.drakesoftware.com/Site/Browse/2025/1099-PATR | N/A |
