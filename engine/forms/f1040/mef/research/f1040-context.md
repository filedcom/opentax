# MeF IRS1040 Form Builder — Spec

## Purpose
Maps computed engine fields from the `f1040` node (in the `pending` dict) to MeF XML element names and builds the `<IRS1040>` element.

## Function Signature
```ts
buildIRS1040(fields: Record<string, unknown>): string
```

- Returns an `<IRS1040>` XML element string.
- Returns empty string `""` if `fields` is empty or has no mappable fields.
- Only emits child elements for fields that are **present** in `fields` (not `undefined`, not `null`).
- All dollar amounts are integers (whole dollars). No cents.

## Field Map: Engine Key → MeF Element Name

| Engine Key | MeF Element | Notes |
|------------|-------------|-------|
| `line1a_wages` | `WagesAmt` | Dollar amount |
| `line1e_taxable_dep_care` | `TaxableDependentCareExpnsesAmt` | Dollar amount |
| `line1i_combat_pay` | `CombatPayElectionAmt` | Dollar amount |
| `line2a_tax_exempt` | `TaxExemptInterestAmt` | Dollar amount |
| `line3a_qualified_dividends` | `QualifiedDividendsAmt` | Dollar amount |
| `line4a_ira_gross` | `TotalIRADistributionsAmt` | Dollar amount |
| `line4b_ira_taxable` | `TaxableIRADistributionsAmt` | Dollar amount |
| `line5a_pension_gross` | `TotalPensionsAndAnnuitiesAmt` | Dollar amount |
| `line5b_pension_taxable` | `TaxablePensionsAndAnnuitiesAmt` | Dollar amount |
| `line25a_w2_withheld` | `WithholdingTaxAmt` | Dollar amount |
| `line25b_withheld_1099` | `Form1099WithholdingAmt` | Dollar amount |
| `line12e_itemized_deductions` | `TotalItemizedOrStandardDedAmt` | Dollar amount |
| `line28_actc` | `AdditionalChildTaxCreditAmt` | Dollar amount |
| `line29_refundable_aoc` | `RefundableAOCreditAmt` | Dollar amount |
| `line38_amount_paid_extension` | `AmountPaidWithExtensionAmt` | Dollar amount |

## Rules

1. **Sparse output** — only emit `<ElementName>value</ElementName>` for fields present in `fields`. Fields missing from the input are silently skipped.
2. **Zero is a valid value** — a field present with value `0` MUST be emitted as `<ElementName>0</ElementName>`. Zero ≠ absent.
3. **All values are integers** — fields are whole-dollar amounts. No decimal points in output.
4. **Unknown keys are ignored** — keys in `fields` that are not in the field map are silently dropped.
5. **Empty result** — if no mappable fields are present, return `""` (no `<IRS1040>` wrapper emitted).
6. **Element order** — elements are emitted in field map order (as listed above), not insertion order of `fields`.

## Edge Cases

| Scenario | Expected |
|----------|----------|
| `fields = {}` | `""` |
| Only unknown keys in `fields` | `""` |
| `line1a_wages = 0` | `<IRS1040>` contains `<WagesAmt>0</WagesAmt>` |
| `line1a_wages = 50000` | `<IRS1040>` contains `<WagesAmt>50000</WagesAmt>` |
| `line1a_wages` absent, `line3a_qualified_dividends = 1500` | Only `<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>` emitted |
| All 15 fields present | All 15 child elements emitted in field map order |
| `fields = { line1a_wages: 50000, unknown_field: 999 }` | Only `<WagesAmt>50000</WagesAmt>` emitted |
| `line4a_ira_gross = 20000, line4b_ira_taxable` absent | Only `TotalIRADistributionsAmt` emitted |
