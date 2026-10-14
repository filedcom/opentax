# Form 8609 — Research Context (Clean Summary)

## What Is Form 8609?

Form 8609 (Low-Income Housing Credit Allocation and Certification) is issued by a state or local housing credit agency (HCA) to the owner of a qualified low-income residential rental building. It certifies the annual housing credit dollar amount allocated to the building under IRC §42.

Key points:
- One Form 8609 is issued per building (not per project)
- Each building gets a unique Building Identification Number (BIN)
- The HCA completes Part I; the building owner certifies Part II
- This is an ALLOCATION/CERTIFICATION form — not filed annually with the 1040

## Tax Credit Flow (for the engine)

```
Form 8609 (allocation, per building)
  ↓
Form 8609-A (annual statement, filed each year of compliance period)
  ↓
Form 8586 (Low-Income Housing Credit computation — aggregates all buildings)
  ↓
Form 3800 (General Business Credit, line 4d)
  ↓
Schedule 3 line 7 (General Business Credit → engine: line6z_general_business_credit)
  ↓
Form 1040 line 20 (nonrefundable credits)
```

## Key Fields (from Form 8609 / engine perspective)

Per building (itemSchema):
- `annual_credit_amount` (required): The annual credit dollar amount for this building's 10-year credit period. This is the key figure — pre-computed as credit_percentage × qualified_basis. Comes from Form 8609 line 1b or Form 8609-A line 4.
- `building_id` (optional string): The BIN (Building Identification Number) assigned by the HCA. Informational.
- `credit_percentage` (optional): The applicable credit percentage (typically 4% or 9%). From Form 8609 line 2. Informational.
- `qualified_basis` (optional): The qualified basis of the building. From Form 8609 line 3a or 8a. Informational.

## Routing Decision

The task instructions specify routing to `schedule3.line6b_low_income_housing_credit`. The actual 2025 Schedule 3 does NOT have a standalone line 6b for low-income housing credit (line 6b is for the plug-in motor vehicle credit via Form 8936). The correct IRS path is via Form 3800 → Schedule 3 line 7 (GBC).

However, the engine uses the `line6z_general_business_credit` field on Schedule 3 for all GBC-routed credits. Following the task instructions, `line6b_low_income_housing_credit` is added to schedule3 as a dedicated engine label for this credit, consistent with how `line6b_child_tax_credit` exists as an internal field not directly corresponding to a printed line.

## TY2025 Facts

- IRC §42 governs the credit
- Credit rates: ~9% for new construction (not bond-financed), ~4% for acquisition/rehab or bond-financed
- Credit period: 10 years (annual credit × 10 years)
- Compliance period: 15 years
- Individual taxpayers may be subject to passive activity limitations (Form 8582)
- The engine captures the annual credit amount per building; aggregation across buildings occurs in compute()
