# TY2026 Form 982 cancellation-of-debt exclusion contract

Current official authority: [Form 982 (Rev. March 2018)](corpus/authorities/f982--2018.pdf),
SHA-256 `2ef53d44f52617e93b7fc2b987e84986fcde26b6a5cf45415f5679299d1e8678`,
and [instructions (Rev. December 2021)](corpus/authorities/i982--2021.pdf),
SHA-256 `638f899cf49c04265f20f5c3bacbc53f1d0270118a3311555c8551847a54b7a0`.
These are the IRS current products in the September 2026 snapshot; the
missing 2026 draft URL does not mean the form is unavailable. Recheck
superseding law, current products and selected 2026 MeF rules before filing.

## Per-debt source and election ledger

Preserve each 1099-C and underlying debt separately: debtor/creditor,
discharge and written-agreement dates, amount canceled, interest,
principal, debtor share, recourse status, liability and asset FMV just
before discharge, property FMV/basis, disposition, business/farm purpose,
bankruptcy case, insolvency worksheet and prior tax attributes. Determine
taxable discharge and any property gain/loss separately. The 1099-C box 2
amount alone is not necessarily Form 982 line 2: first classify any
non-income component, then apply the exclusion's limitation and record
only the amount **actually excluded** on line 2. Route the remainder to
the correct income/activity line, generally Schedule 1 line 8c for
nonbusiness cancellation income.

## Printed form and 2026 route

| Area | Calculation and output |
| --- | --- |
| Part I, 1a–1e and 2 | Record applicable bankruptcy, insolvency, qualified farm, qualified real-property business, or qualified principal-residence exclusion boxes. Insolvency is limited to the amount of insolvency immediately before discharge; farm and business-property exclusions have their own property/attribute limits. Line 2 is total COD excluded, not total 1099-C gross canceled debt. |
| 2026 principal residence | The 2021 instructions permit a post-2025 discharge only if subject to an arrangement entered into and evidenced in writing before January 1, 2026. Verify that date, qualified acquisition/improvement debt and the $750,000 ($375,000 MFS) limit. If the home is retained, line 10b reduces basis by the smaller of the excluded QPRI amount or the home's basis. A title 11 case uses 1a, and a nonbankrupt insolvent debtor can elect 1b instead of 1e. |
| Part II, 4–13 | Apply excluded amount to depreciable real-property basis, elected first basis reduction, NOL, general-business/minimum-tax credit, capital-loss, property basis, passive-loss/credit and foreign-tax-credit attributes in statutory order. Keep origin years and assets. Attach the required section 1017 basis-reduction description and any partnership consent; update future-year depreciation, capital gain, QBI and carryovers. |
| Part III | Corporate section 1082 consent is outside the individual 1040 path, but its widgets are in the common PDF and must not be accidentally filled for an individual. |

The QPRI written-agreement exception and Part II elections are filing facts;
do not infer them from a 1099-C. A separate Form 982 attachment is required
for a qualifying exclusion even when the excluded amount causes **zero**
current taxable COD income.

## Current code boundary

- Shared `f1099c` can route a debt as taxable or excluded. The excluded
  path forwards **gross** box 2 as `line2_excluded_cod`, not a verified
  allowed exclusion. It does not carry `written_agreement_date`; therefore
  its 2026 QPRI source cannot satisfy `form982`'s pre-2026 written-arrangement
  gate without separate facts. Multiple excluded debts lose per-debt
  exclusion/attribute details or are rejected.
- Shared `form982` validates the 2026 QPRI date and uses the indexed cap,
  but has no bankruptcy/farm/business-property/insolvency attribute ledger.
  It returns **no output when taxable excess is zero**, discarding the
  required fully excluded attachment and basis reduction. It also treats
  an excess over its cap as Schedule 1 income without reconciling other
  exclusion types and does not produce printed Part I/II lines.
- TY2025 MeF `IRS982` only serializes QPRI with a **2025** discharge date;
  it rejects other exclusion types. TY2025 PDF descriptor maps
  `line2_excluded_cod` to `f1_7` (printed **line 7**) and
  `insolvency_amount` to `f1_8` (printed **line 8**). The actual line 2
  widget is `f1_3`. The [current PDF inventory](pdf-fields-f982.csv)
  lists **27 terminal widgets**, including the five reason buttons,
  yes/no election, Part II lines and corporate fields. Build a new verified
  mapping. Form 982 has no TY2026 registry, PDF or MeF route.

## Build order and acceptance

1. Refresh current Form 982/instructions, 2026 COD law and MeF accepted
   form/rules; compare 2026 Schedule 1, Schedule D/Form 4797 and 1099-C
   destinations.
2. Build per-debt exclusion facts and allocation, including qualified
   amount, insolvency snapshot, discharge/property disposition split,
   QPRI written arrangement, elections and bankruptcy priority. Compute
   excluded line 2 and taxable remainder independently.
3. Apply Part II reductions to asset and carryforward ledgers, preserving
   future-year effects. Keep the Form 982 attachment even when current
   taxable excess is zero. Reconcile each 1099-C to excluded, taxable and
   non-income amounts and any property gain/loss exactly once.
4. Fill/render all applicable current widgets and required basis/consent
   statements; emit current `IRS982` and test XSD/rejects. Cover a 2026
   pre-agreement QPRI discharge, 2026 post-agreement rejection, retained
   home basis, bankruptcy, partial insolvency, farm/business-property
   exclusions, multiple debts, tax-attribute ordering, full exclusion,
   foreclosure with property gain/loss, and TY2025 regression.

This is a research and implementation contract, not registered TY2026
filing support.
