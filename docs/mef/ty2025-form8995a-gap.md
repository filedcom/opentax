# TY2025 Form 8995-A coverage gap

Status: bounded one-business native `IRS8995A` MeF route written but unrun.
Local tests, XSD validation, filled-PDF rendering, and IRS ATS remain
outstanding.

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

The former 11 flat fields in `forms/f1040/2025/mef/forms/f8995a.ts` were
removed. The new descriptor emits a native business row followed by ordered
Part IV fields for one explicitly identified business. It rejects the old
aggregate-only payload rather than treating it as another API shape.

The [2025 Form 8995-A](https://www.irs.gov/pub/irs-pdf/f8995a.pdf) requires
one Part I and Part II column per trade, business, or aggregation. Its
[instructions](https://www.irs.gov/pub/irs-pdf/i8995a.pdf) also require
Schedules A, B, C, and/or D when specified-service, aggregation, loss
netting, or agricultural-patron facts apply. Taxpayers below the 2025
threshold normally use Form 8995 instead of 8995-A.

## Source and calculation blockers

1. The node now retains a `form8995a` pending record whenever QBI activity is
   present, even when its deduction is zero. The bounded descriptor requires
   a sourced business name and EIN, explicit per-business QBI, W-2 wages,
   and UBIA matching the aggregate calculator inputs, confirmation that
   this is the only non-SSTB non-patron business and that taxable income is
   the return-wide pre-QBI amount, and
   a single filer fully above the wage-limit phase-in range. It computes
   row lines 2-15 and top-level lines 16 and 28-40, skipping Part III as
   the printed form directs above the range. It reconciles line 39 to Form
   1040 line 13 and rejects simultaneous Form 8995 pending.
2. The broader calculator still aggregates non-SSTB QBI, SSTB QBI, wages,
   UBIA, and carryforwards. Aggregation
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
5. Focused node and serializer cases now assert a native row, final-line
   calculation, and missing-identity, alternate-schedule, and reconciliation
   failures. They are written but unrun. The shared MeF builder still has
   three old aggregate-only Form 8995-A fixtures for central reconciliation.
   No flat fallback or silent Form 8995/8995-A selection is provided.

## Smallest safe rebuild boundary

The written slice uses one identified non-SSTB, non-aggregated trade or
business above the entire phase-in range, with no prior loss, REIT/PTP,
agricultural patron, or pass-through special items. It requires explicit
zero net capital gain and confirmation of zero qualified dividends, so line
34 is not guessed from the older ambiguous aggregate input. Add the
corresponding PDF row and verify its rendered values.
Broader SSTB, aggregation, loss-netting, and patron paths need their own
schedule models and attachments before filing.

The bounded route must pass the agreed single full calculation/test batch,
TY2025 local XSD and PDF checks, IRS business rules, and ATS acceptance
before coverage is claimed.
