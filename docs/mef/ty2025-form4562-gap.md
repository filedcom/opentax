# TY2025 Form 4562 coverage gap

Status: audit only. Do not treat the registered `IRS4562` builder or PDF
descriptor as a supported filing path. No test, XSD, PDF render, or IRS ATS
validation was run for this audit.

## Source and schema check

- The checked-in TY2025 v5.4 `IRS4562.xsd` starts with optional
  `BusinessOrActivityTxt`, then Part I lines 1-13, Part II lines 14-16,
  Part III nested GDS/ADS rows, Part IV totals, and Parts V-VI. Its
  corresponding native fields include `Section179ExpenseDeductionAmt`
  (line 12), `SpecialAllowanceAmt` (line 14), and
  `MACRSDedForAstInSrvcBfrPYAmt` (line 17). None of the 12 tags in
  `forms/f1040/2025/mef/forms/f4562.ts` appears as a direct child of
  `IRS4562` in this schema. Even a single populated field from the current
  builder therefore yields structurally invalid native XML.
- The [2025 Form 4562](https://www.irs.gov/pub/irs-pdf/f4562.pdf) distinguishes
  cost, elected cost, current deduction, and next-year carryover on lines 2,
  6-13; line 14 is the *allowance*, not its qualifying basis; and Part III
  requires property-class rows rather than one flat basis/period/year trio.
  The [2025 instructions](https://www.irs.gov/pub/irs-pdf/i4562.pdf) put
  pass-through section 179 amounts on line 6 with the relevant Schedule K-1
  source, and require the taxpayer-level business-income limit on line 11.

## Why no bounded native path is ready yet

1. `forms/f1040/nodes/intermediate/forms/form4562/index.ts` computes one
   combined deduction and routes it to Schedule 1, an AGI aggregator, and
   Form 6251. It never returns a `form4562` print-field output. The MeF
   descriptor consequently receives raw pending inputs, not a reconciled
   version of lines 1-22.
2. The node accepts one `section_179_cost` and `section_179_elected`, but no
   asset description, K-1 provenance per amount, activity identifier, or
   per-business allocation. The instructions permit a summary election and
   separate activity forms, but a combined amount cannot be assigned to the
   correct form or line 6 property row from these inputs.
3. `computeSection179` allows an elected amount to exceed the supplied cost
   and allows a positive deduction without a supplied nonnegative business
   income limit. It adds upstream K-1 amounts, direct election, and carryover
   before applying a single cap, while the printed lines 8-13 require
   distinct tentative deduction, carryover, allowed deduction, and next-year
   carryover. Mapping this aggregate to line 12 would hide those gaps.
4. Bonus inputs are qualifying *basis* and election flags. The node computes
   the actual allowance but does not expose it to the serializer. Mapping
   either basis to `SpecialAllowanceAmt` would overstate line 14.
5. The one MACRS basis/period/year input lacks a property class, asset-level
   service date for the current year, and convention/method for many rows.
   The node can calculate selected rates, but the form's nested GDS and ADS
   rows cannot be reconstructed for a general return. Prior depreciation
   needs its separate line 17, not a current-year 19a row.
6. `forms/f1040/2025/pdf/forms/f4562.ts` maps raw bonus basis into a line-14
   field and multiple generic MACRS inputs into one 19a row. Its comments
   also shift the official Part I line numbers. It needs an independently
   verified 2025 AcroForm mapping after the print fields are defined.

## Smallest safe rebuild

Start with one explicitly identified, nonlisted business asset and one
business activity. Capture the source document, activity, qualifying
section 179 cost, elected amount, taxpayer-level line-11 limit, prior-year
line-13 carryover, bonus eligibility/election, placed-in-service date, and
MACRS class/convention. Compute and retain separate TY2025 lines 1-22, route
the allowed amount to its actual business schedule, then emit ordered native
XSD fields and fill the matching PDF. Keep K-1 passthrough, multiple assets,
multiple activities, listed property, and ADS outside that first bounded
path until their source and allocation models exist. The old flat XML builder
must not be used as a compatibility fallback.

Before claiming this form, add source-to-calculation, calculation-to-MeF,
negative missing-source, local XSD, and filled-PDF cases, then include them in
the agreed single full batch and IRS business-rule/ATS gates.
