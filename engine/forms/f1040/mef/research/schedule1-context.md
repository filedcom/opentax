# MeF IRS1040Schedule1 Form Builder — Spec

## Purpose
Maps computed engine fields from the `schedule1` node (in the `pending` dict) to MeF XML element names and builds the `<IRS1040Schedule1>` element.

## Function Signature
```ts
buildIRS1040Schedule1(fields: Record<string, unknown>): string
```

- Returns an `<IRS1040Schedule1>` XML element string.
- Returns empty string `""` if `fields` is empty or has no mappable fields.
- Only emits child elements for fields that are **present** in `fields` (not `undefined`, not `null`).
- All dollar amounts are integers (whole dollars). No cents.

## Field Map: Engine Key → MeF Element Name

| Engine Key | MeF Element | Notes |
|------------|-------------|-------|
| `line1_state_refund` | `StateLocalTaxRefundAmt` | Dollar amount |
| `line3_schedule_c` | `BusinessIncomeLossAmt` | Dollar amount; can be negative |
| `line7_unemployment` | `UnemploymentCompAmt` | Dollar amount |
| `line8i_prizes_awards` | `PrizeAwardAmt` | Dollar amount |
| `line8z_rtaa` | `RTAAPaymentsAmt` | Dollar amount |
| `line8z_taxable_grants` | `TaxableGrantsAmt` | Dollar amount |
| `line8z_substitute_payments` | `SubstitutePaymentsAmt` | Dollar amount |
| `line8z_attorney_proceeds` | `GrossProeedsToAttorneyAmt` | Dollar amount (note: IRS typo "Proe" not "Proc") |
| `line8z_nqdc` | `NQDCDistributionAmt` | Dollar amount |
| `line8z_other` | `OtherIncomeAmt` | Dollar amount |
| `line8z_golden_parachute` | `ExcessGoldenParachuteAmt` | Dollar amount |
| `line8c_cod_income` | `CancellationOfDebtAmt` | Dollar amount |
| `line17_schedule_e` | `RentalRealEstateIncomeLossAmt` | Dollar amount; can be negative |
| `line18_early_withdrawal` | `EarlyWithdrawalPenaltyAmt` | Dollar amount |
| `line24f_501c18d` | `Sec501c18dContributionAmt` | Dollar amount |

## Rules

1. **Sparse output** — only emit `<ElementName>value</ElementName>` for fields present in `fields`. Fields missing from the input are silently skipped.
2. **Zero is a valid value** — a field present with value `0` MUST be emitted. Zero ≠ absent.
3. **Negative values are valid** — `line3_schedule_c` (business loss) and `line17_schedule_e` (rental loss) can be negative integers. Emit as-is (e.g. `<BusinessIncomeLossAmt>-5000</BusinessIncomeLossAmt>`).
4. **All values are integers** — whole-dollar amounts. No decimal points in output.
5. **Unknown keys are ignored** — keys in `fields` not in the field map are silently dropped.
6. **Empty result** — if no mappable fields are present, return `""`.
7. **Element order** — emit in field map order (as listed above).

## Edge Cases

| Scenario | Expected |
|----------|----------|
| `fields = {}` | `""` |
| Only unknown keys in `fields` | `""` |
| `line7_unemployment = 0` | `<IRS1040Schedule1>` contains `<UnemploymentCompAmt>0</UnemploymentCompAmt>` |
| `line3_schedule_c = -5000` | `<BusinessIncomeLossAmt>-5000</BusinessIncomeLossAmt>` |
| `line17_schedule_e = -12000` | `<RentalRealEstateIncomeLossAmt>-12000</RentalRealEstateIncomeLossAmt>` |
| `line7_unemployment = 4800` | `<UnemploymentCompAmt>4800</UnemploymentCompAmt>` |
| All 15 fields present | All 15 child elements in field map order |
| `fields = { line7_unemployment: 4800, junk: 999 }` | Only `<UnemploymentCompAmt>4800</UnemploymentCompAmt>` emitted |
| Multiple `line8z_*` fields present | Each emits its own element in order |
