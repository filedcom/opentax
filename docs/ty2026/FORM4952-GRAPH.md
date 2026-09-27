# TY2026 Form 4952 investment-interest contract

Source snapshot: [draft 2026 Form 4952 with **instructions on printed pages
3–4**](corpus/draft/f4952.pdf), SHA-256
`3ddbc607b62b1b17e03df6059120b0f91a7691808657442136fda08db5ef7c41`.
The missing `i4952--dft.pdf` URL is expected: this draft embeds the
instructions. [Publication 550 (2025)](corpus/authorities/p550--2025.pdf),
SHA-256 `83552968a07e63d1c81e5b4f311fc0e54728b5ff9654b5a0d2ba6292c5574317`,
is a **prior-year comparator** for investment-property classification and
interest allocation. Verify final 2026 form/instructions, current Pub. 550,
Schedule D/AMT worksheets and MeF XSD/rules before filing.

## Interest, income and election records

Keep debt/use-of-proceeds and investment-asset IDs, ownership, interest paid
or accrued, K-1 source, prior-year regular and AMT disallowed interest,
gross ordinary investment income, qualified dividends, net disposition gain,
net capital gain, other investment expenses, tax-exempt/private-activity-bond
income and interest, and the line-4g election. Interest on a mixed-use loan
must be allocated among investment, personal, trade/business, passive,
residence and capitalized uses before Form 4952 or
[Form 8990](FORM8990-GRAPH.md). A passive-activity interest item normally
belongs with [Form 8582](FORM8582-GRAPH.md), and business activity interest
may face [Form 6198](FORM6198-GRAPH.md) and Form 8990. Preserve K-1 entity
and activity IDs so one expense is not deducted through both forms.

The **election to count qualified dividends/net capital gain as investment
income** requires an explicit amount and, optionally, an allocation between
capital gain and dividends. That elected portion loses the preferential
qualified-dividend/capital-gain rate in the Schedule D Tax Worksheet; the
2026 instructions say a capital-gain election generally needs IRS consent
to revoke. Keep the original dividend and gain amounts on Form 1040 and
Schedule D, then adjust only the tax worksheet's preferential-rate base.
Coordinate with [Form 1116](FORM1116-GRAPH.md) when the election allocation
changes the foreign-tax-credit limit or effective tax after credits.

## Printed form and filed routes

| Part / lines | Calculation and reconciliation |
| --- | --- |
| I, 1–3 | Current 2026 investment interest plus **2025 Form 4952 line 7** carryforward equals total interest. Do not mix in §163(j) business-interest carryforward or interest linked to tax-exempt income. |
| II, 4a–4h | Gross income from investment property, **excluding** disposition gains at 4a; identify qualified dividends within it at 4b; add net property-disposition gain at 4d and net capital-gain slice at 4e. The 4g elected amount cannot exceed qualified dividends plus 4e. Its default attribution is capital gain first; the dotted-line election beside 4e can shift some to dividends. Line 4h recombines ordinary income, nonpreferential gain and elected preferential income. Capital loss carryovers and mutual-fund distributions enter the disposition net by the instruction's rules, not simply gross Form 1099-DIV box 2a. |
| II/III, 5–8 | Subtract allowable non-interest investment expenses at line 5, floor net investment income at line 6, carry line 7 disallowed interest into 2027 and deduct the smaller of lines 3/6 at line 8. The 2026 instructions generally send an individual's line 8 to **Schedule A line 9**, but separate an amount on Form 6198 line 4, royalty-related interest to Schedule E, and an amount attributable to a nonpassive trade/business to its source schedule. Reconcile those portions to the single Form 4952 total. |
| AMT/tax worksheet | Recompute investment interest for AMT, including applicable private-activity-bond interest and different prior carryforward; reconcile the Form 6251 line 2c adjustment and separate AMT future balance. The line-4g election enters the **Schedule D Tax Worksheet line 3** and changes Form 1040 line 16 tax. Do not infer AMT adjustments from regular-tax totals. |

The draft instructions' filing exception allows an individual to omit Form
4952 only if the specified simple income-exceeds-interest conditions hold,
there are no other deductible investment expenses and no prior carryover.
Model that filing decision separately from a zero computed deduction.

## Current code boundary

- Shared `form4952` has a substantial 2025-calculation surface, including
  1099/K-1 sources, Form 8814, the line-4g election and AMT refigure facts.
  However, its `compute` calls `calculateAmtForm4952` whenever line 3 is
  nonzero, so it **requires an explicit AMT refigure even for an ordinary
  regular-tax case**. It sends the **entire** line 8 to shared Schedule A
  line 9, missing the printed Form 6198/Schedule E/business allocations.
  Its single regular/AMT carryforward totals lack debt, source and year.
- The source totals may aggregate Form 1099/K-1 income without a canonical
  investment-versus-business/passive classification, and the preferential
  election must reconcile with all [Schedule D](CAPITAL-GAIN-GRAPH.md) and
  qualified-dividend tax worksheet inputs, not just the Form 4952 result.
  The TY2025 MeF serializer only emits numeric line tags; it does not prove
  the current 2026 schema, filing exception or required election annotation.
- The TY2025 PDF descriptor maps all 15 numeric form lines; the [2026 draft
  inventory](pdf-fields-f4952.csv) has **17 terminal widgets**, all in the
  field tree: name/ID plus those 15 fields. It contains one printed form
  page, a blank page and two printed instruction pages, after the draft
  cover. Confirm field positions and the dotted-line election annotation
  by rendering. `form4952` is absent from the TY2026 registry/PDF builder
  and has no TY2026 MeF or current validation route.

## Build order and acceptance

1. Pin final 2026 Form 4952 and current Pub. 550, Schedule D/6251/1116
   instructions and MeF XSD/rules. Confirm the filing exception, line-4g
   election treatment and any statement annotation in the selected release.
2. Build source-keyed interest classification and regular/AMT carryforward
   records. Derive investment gross income, qualified dividends, net
   disposition gain and allowable investment expenses from the same
   1099/K-1/transaction ledger used by Schedule B/D and Form 8960. Apply
   activity at-risk/passive limits where required before routing line 8.
3. Compute the printed form and route the allowed line-8 portions to
   Schedule A line 9, Form 6198, Schedule E or the owning business source.
   Feed the explicit line-4g election and capital-gain/dividend allocation
   to the Schedule D Tax Worksheet and AMT refigure. Avoid requiring AMT
   input when no AMT adjustment can arise, while still retaining a verified
   AMT branch when relevant.
4. Fill/render the 17 widgets and election notation; emit current 2026 MeF
   and any statement from the same line record. Reconcile PDF, XML,
   Schedule A/D/6251/1116, Form 1040 tax and 2027 regular/AMT carryovers.
   Run TY2025 regressions for shared calculation changes.
5. Test the simple no-Form-4952 filing exception, ordinary interest income,
   qualified-dividend and net-capital-gain elections with both allocation
   choices, capital-loss carryover, K-1 investment versus passive interest,
   mixed-use borrowing, royalty/business source deductions, Form 6198
   disallowance, foreign-credit interaction and an AMT/private-activity-bond
   refigure. Verify tax-rate and carryforward changes as well as line 8.

This is the TY2026 source and implementation contract, not filed support.
