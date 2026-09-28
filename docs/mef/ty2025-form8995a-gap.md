# TY2025 Form 8995-A coverage gap

Status: audit only. The registered `IRS8995A` field-map builder is not a
supported native MeF filing path. No tests, local XSD validation, filled-PDF
rendering, or IRS ATS were run for this audit.

## Schema and form check

The checked-in TY2025 v5.4 `Shared/IRS8995A/IRS8995A.xsd` begins with zero
or more `QBIDeductionInformationGrp` rows. Each row has a required trade or
business/person name, specified-service and aggregation indicators, and a
required EIN, SSN, or missing-EIN reason. Its line 2
`QualifiedBusinessIncomeAmt`, line 4 `AllocableShareW2WagesAmt`, and line 7
`AllocableShareUBIAQlfyPropAmt` are nested *inside that business row*.
The top-level form then carries line 16 and lines 21-40, including
`TaxableIncomeBeforeQBIDedAmt` (line 33), `NetCapitalGainAmt` (line 34),
and `QualifiedBusinessIncomeDedAmt` (line 39).

`forms/f1040/2025/mef/forms/f8995a.ts` instead emits 11 flat fields. Most
tags do not exist in the native form at all. `QualifiedBusinessIncomeAmt`
exists only inside a business row, and `NetCapitalGainAmt` is a top-level
field but is emitted before the required schema sequence. The builder
cannot be repaired by renaming a few tags.

The [2025 Form 8995-A](https://www.irs.gov/pub/irs-pdf/f8995a.pdf) requires
one Part I and Part II column per trade, business, or aggregation. Its
[instructions](https://www.irs.gov/pub/irs-pdf/i8995a.pdf) also require
Schedules A, B, C, and/or D when specified-service, aggregation, loss
netting, or agricultural-patron facts apply. Taxpayers below the 2025
threshold normally use Form 8995 instead of 8995-A.

## Source and calculation blockers

1. `forms/f1040/nodes/intermediate/forms/form8995a/index.ts` combines all
   non-SSTB QBI, SSTB QBI, wages, UBIA, and carryforwards into aggregate
   numbers. It emits only a Form 1040 deduction and a standard-deduction
   input, not a `form8995a` print-field record. The native builder therefore
   does not receive calculated lines 2-40.
2. The calculator has no per-business name, EIN/SSN, patron status, separate
   QBI, W-2 wages, UBIA, or per-business wage-limit result. Aggregation
   input lists group names and business names but not the amounts or tax IDs
   needed for the required XML rows and Schedule B.
3. SSTB values are scaled in aggregate, but no source-backed Schedule A
   business rows are retained. The prior QBI loss and REIT/PTP loss inputs
   are aggregates without the Schedule C ledger. A positive cooperative
   patron reduction and DPAD path has no source model or Schedule D.
4. The 2025 printed line 34 is net capital gain *increased by qualified
   dividends*. The input `net_capital_gain` is not documented as that
   combined amount, so using it unadjusted could overstate the income
   limitation. The node also does not prove Form 8995-A rather than the
   simpler Form 8995 is required in every direct-call case.
5. Existing `f8995a.test.ts` cases assert the flat, non-native tags. A
   rebuilt form needs source-to-business-row and source-to-final-line tests,
   plus explicit negative cases for missing identity or schedules. Do not
   retain the flat field map as a compatibility fallback or silently skip
   one of the two QBI forms in a central builder.

## Smallest safe rebuild boundary

Start with one identified non-SSTB, non-aggregated qualified trade or
business above the Form 8995-A filing threshold, with no prior QBI loss,
REIT/PTP loss, agricultural patron status, or pass-through special items.
Capture its legal name and tax ID, source-backed QBI, W-2 wages, UBIA,
taxable income before the QBI deduction, net capital gain plus qualified
dividends, and evidence that no other qualified business is present.
Calculate and retain Part II, applicable phase-in, and Part IV lines.
Emit the required nested native business group and ordered top-level
fields. Add the corresponding PDF row and verify its rendered values.
Broader SSTB, aggregation, loss-netting, and patron paths need their own
schedule models and attachments before filing.

The bounded route must pass the agreed single full calculation/test batch,
TY2025 local XSD and PDF checks, IRS business rules, and ATS acceptance
before coverage is claimed.
