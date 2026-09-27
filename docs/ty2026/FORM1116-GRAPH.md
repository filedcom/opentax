# TY2026 foreign tax credit and Form 1116 contract

Source: pinned [2026 draft Form 1116](corpus/draft/f1116.pdf), SHA-256
`9899d7fbd5401ca26d5677cbc87e221c983c86f8f43130347e8f2329cc6c9779`.
The [2025 Form 1116 instructions](corpus/authorities/i1116--2025.pdf)
are a **prior-year comparator**: the expected 2026 draft instruction URL still
serves 2025. The [December 2022 Schedule B](corpus/authorities/f1116sb--2022.pdf)
and [instructions](corpus/authorities/i1116sb--2022.pdf) cover foreign tax
carryovers. The [December 2025 Schedule C](corpus/authorities/f1116sc--2025.pdf)
and [instructions](corpus/authorities/i1116sc--2025.pdf) cover foreign tax
redeterminations; its instructions explicitly apply to 2025 and subsequent
years until superseded. Recheck all revisions and 2026 Form 1116 instructions
before filing.

## Source-to-line graph

| Form area | Required source and calculation | Downstream or attachment |
| --- | --- | --- |
| Direct Schedule 3 election | Qualified payee statements such as 1099-INT/1099-DIV or K-1/K-3 may permit a small passive-credit election without Form 1116. The **2025** instruction comparator specifies all-passive statement income and $300/$600 tax limits; verify those conditions in 2026 instructions before using them. | If eligible and elected, send the source-backed foreign tax directly to Schedule 3 line 1, without a Form 1116 attachment or a carryover into/out of that elected year. Otherwise complete Form 1116. |
| Header, category and Part I | Keep one Form 1116 per separate category: §951A, branch, passive, general, §901(j), treaty re-sourcing, and lump-sum distributions. Preserve country/territory, gross foreign income, currency/source method, directly related expenses, apportioned deductions and losses. Use Schedule A/standard deduction and Form 2555 exclusion data once, by category. | Line 7 foreign taxable income feeds Part III line 15. Attach direct-expense and other required statements, including one per relevant country/category rather than a single aggregate tax number. |
| Part II | For each country record paid or accrued method/date, tax withheld by dividend/rent/interest/PTEP source, other tax, foreign-currency amount and U.S.-dollar conversion. The 2026 printed form has separate PTEP distribution/group columns. | Lines A–C total to line 8/Part III line 9. Multiple countries or tax character cannot be collapsed into one unspecified row. |
| Part III lines 10–17 | Add eligible carryover/carryback by category; reconcile Schedule B line 3 column (xiv), reductions, high-tax kickout and foreign-source adjustments. §951A has no line 10 carryover. | Line 14 available foreign tax and line 17 net foreign taxable income. Generate/consume/expire carryovers in the category ledger. |
| **2026 line 18** | Individual base = **Form 1040 line 11b − line 14 + Schedule 1-A line 43**, with form-instruction adjustments for preferential-rate income. This is printed on the 2026 draft. | Line 19 §904 fraction. Do not substitute a generic `taxable_income` field: Schedule 1-A must be added back on this form. |
| **2026 line 20** | **Form 1040 line 16 + Schedule 2 line 1z** for an individual, subject to the form's special rules for lump-sum distributions or Form 8978. | Lines 21–24 category limit. This tax base also matters to other credit-limit forms; use the same calculated 1040/Schedule 2 sources. |
| Part IV lines 25–35 | Transfer each category's line 24 to its own summary row, apply the total and any international-boycott reduction, and derive line 35. | **Schedule 3 line 1** and AMT foreign-tax-credit computation, then 1040 tax/credit finalization. Reconcile the Form 1116 category forms to the one Schedule 3 amount. |
| Schedule B (1116) | Per-category, per-origin-year amounts: prior carryover, corrections/redeterminations, current use, expiry, new excess, carryback and closing balance. Its two printed pages span the 10th preceding through current year. | Attachment when current instructions require it; line 3 column (xiv) feeds Form 1116 line 10. Do not lose opening balances when no current credit is usable. |
| Schedule C (1116) | Foreign tax redetermination with affected prior tax year, category, country, payment/refund/contested-tax facts and U.S. tax effect. | File its Part I–V as applicable and determine whether an amended prior-year return/Form 7204 is also required; do not insert a redetermination as ordinary current-year tax. |

The PDF inventories are [Form 1116, 130 widgets](pdf-fields-f1116.csv),
[Schedule B, 222 widgets](pdf-fields-f1116sb.csv), and [Schedule C, 256
widgets](pdf-fields-f1116sc.csv), all in their field trees. The 2026 Form
1116 draft PDF has a coversheet followed by two form pages. In the inventory,
line 18 is `Page2.f2_53[0]` and line 35 is `Page2.f2_70[0]`; the full field
names and coordinates are in the CSV. Map both pages, multiple category
copies, country rows and statements, and visually inspect a filled bundle.

## Current code boundary

- `form_1116` is **absent** from the 2026 registry although registered
  `f1099int`, `agi_aggregator` and `income_tax_calculation` declare edges to
  it. Other 2025 sources including 1099-DIV, foreign-earned income and K-1
  also point there and need source-specific TY2026 audits.
- Shared `form_1116/index.ts` groups six categories and simplifies the
  allowed credit to tax paid versus a foreign-taxable-income fraction. It
  lacks the printed lump-sum category, country-level Part II, Schedule B/C
  ledger, line 12/13 reductions, line 16 adjustments and all special
  preferential-rate rules. It defaults missing U.S. tax or taxable income
  to **zero**; that must not be treated as a completed filed computation.
- `income_tax_calculation` currently sends `taxable_income` and `tax` to
  Form 1116. The 2026 line 18/20 formulas above require different inputs,
  including Schedule 1-A line 43 and Schedule 2 line 1z. Feed these from the
  dedicated 2026 return graph after their prerequisites are finalized.
- Shared Form 1116 outputs target TY2025 Schedule 3 and Form 6251 objects.
  The 2026 Schedule 3 node has line 1, but no registered producer or tested
  AMT foreign-tax-credit handoff yet. Keep direct-election credit and filed
  Form 1116 credit mutually exclusive for the same source tax.
- The TY2025 PDF descriptor fills only **four numeric fields and six category
  checks**, with comments calling its field locations approximate. It does
  not represent a complete two-page Form 1116. The TY2025 MeF serializer
  rejects unsupported categories and has a direct-expense statement, but
  current TY2026 element names, category rules, document order and
  Schedule B/C attachment support remain unverified.

## Implementation and acceptance order

1. Audit each foreign income/tax producer and source statement. Choose
   credit versus deduction and, if credit, direct Schedule 3 election versus
   filed Form 1116 from documented facts. Confirm 2026 election thresholds
   and qualified statements when the instructions appear.
2. Create category/country/owner and origin-year ledger records. Build the
   full Part I/II and Schedule B/C paths before claiming carryovers or
   redeterminations. The preparer must see diagnostics for missing paid/
   accrued method, exchange rate, country, source income, deductions or
   opening carryover evidence.
3. Derive 2026 lines 18 and 20 from completed 1040, Schedule 1-A and
   Schedule 2 values; apply preferential-rate and special-category rules
   from the current instructions. Calculate Parts III/IV and send **line 35**
   to the dedicated 2026 Schedule 3 line 1 and AMT credit stage exactly once.
4. Render all required copies/continuations of Forms 1116 and Schedules
   B/C; match each PDF line to the source ledger and Schedule 3. Build MeF
   from the current TY2026 XSD and active business rules, including direct
   expense and redetermination statements.
5. Add independent cases for the direct-election threshold, two separate
   categories, two countries, preferential-rate dividends, Form 2555
   exclusion, a Schedule 1-A deduction that changes line 18, nonzero
   Schedule 2 line 1z, carryover use/expiry, AMT, and a foreign tax
   redetermination. Run TY2025 regressions on existing foreign-credit
   fixtures and retain explicit unsupported-case diagnostics until the
   whole filed path is present.
