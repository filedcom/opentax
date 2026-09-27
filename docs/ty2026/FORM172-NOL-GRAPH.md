# TY2026 Form 172 and NOL carryforward contract

Source snapshot: the IRS [current Form 172 product page](https://www.irs.gov/forms-pubs/about-form-172)
still serves the December 2024 [form](corpus/authorities/f172--2024.pdf)
and [instructions](corpus/authorities/i172--2024.pdf). The PDFs are pinned
with hashes in the [manifest](corpus/manifest.json). Form 172 has a blank
calendar-year header and **109 fillable widgets across three pages**; the
[field inventory](pdf-fields-f172.csv) records each page and rectangle.
The PDF's 225 named field-tree entries include 116 nonterminal containers;
do not count or fill those as line widgets.
The 2026 draft URL serves that same older revision and remains `wrong-year`
in the manifest. Refresh the current product, 2026 Schedule 1 instructions,
and selected MeF release before treating the December 2024 booklet as final
2026 tax-law authority: its notes about the suspension of miscellaneous and
overall itemized deductions stop at 2025.

The public [TY2026 accepted-forms workbook](corpus/mef/accepted-forms.xlsx)
lists `Form 172` as **unbounded** for 1040 (row 43). The companion
[forms/attachments workbook](corpus/mef/forms-attachments.xlsx) lists
`IRS172` at form level (row 812) and a distinct
`NetOperatingLossCarryforwardDeductionStatement` at Schedule 1 line 8a
(row 397). These are public inventory entries, not final XSD element or
binary-attachment rules. The [IRS instructions](https://www.irs.gov/instructions/i172)
say to attach a Form 172 **for each NOL** to Form 1040 when a carryforward
NOL deduction applies, and to show the deduction as a negative Schedule 1
amount. Decide which NOL-year form instances and limitation statements the
selected 2026 schema requires; do not collapse them into one aggregate line.

## Source ledger and calculation order

| Record or step | Required 2026 result |
| --- | --- |
| Origin-year NOL | Keep taxpayer/spouse owner, loss year, original Form 172 Part I amount, farm versus nonfarm character, pre-2018 versus post-2017 limitation class, carryback/election history, amount used in each later year, and remaining balance. A 2026 Form 461 excess business loss creates a **2026-origin carryforward** for 2027 onward; its Schedule 1 line 8p addback is not a 2026 line 8a deduction. |
| Current-year source limits | Finish basis, [at-risk](FORM6198-GRAPH.md), [passive](FORM8582-GRAPH.md), [Form 461](FORM461-GRAPH.md) and other activity limits before deciding a 2026-origin NOL. Deducting a prior-year NOL is a separate pass after taxable income before NOL and QBI is known. Keep Form 982 attribute reductions in the origin/carryforward balance before applying it. |
| Limitation and ordering | The current instructions generally limit post-2017 NOL carryforwards to 80% of taxable income computed without NOL, QBI or §250 deductions, after older NOL use. Apply multiple NOLs in **origin-year order**, recording used and remaining amounts per item; an aggregate type total loses that sequence. Reconcile 2026 itemized/Schedule 1-A effects and any law change against current guidance. |
| Return handoff | Send only the allowed **positive deduction magnitude** to the 2026 Schedule 1 node's `line8a_nol_deduction`; it prints a negative line 8a and reduces the Schedule 1 line 9/1040 line 8 income. Reconcile the same NOL deduction with Form 8990 ATI, Form 6251 alternative-tax NOL and Form 8960 NIIT only under their own rules; none should silently reuse Schedule 1's value. |
| Farming exception | The December 2024 instructions describe a possible two-year farming-loss carryback and waiver election. Keep the farm amount, origin year, due-date/election evidence and amended-year returns separate. Part II's two prior-year columns and refigured itemized amounts are not a generic 2026 carryforward worksheet. Confirm the actual 2026 filing and MeF path before emitting a carryback attachment on the current-year return. |

The shared [TY2025 `nol_carryforward` node](../../forms/f1040/nodes/inputs/nol_carryforward/index.ts)
accepts a caller-supplied `current_year_taxable_income`, groups all NOLs
into only pre-2018/post-2017 totals, emits no per-origin-year balance and
produces no Form 172 document or PDF. Its `standard_deduction` output also
needs reconciliation with the TY2026 deduction-choice graph. That schema
cannot prove the printed Form 172, 80% computation, oldest-first depletion,
farming carryback or the next-year state. The 2026 Schedule 1 node already
has a line 8a input but no registered NOL source.

## Printed and filed form

- **Part I, lines 1–24:** line 1 begins with AGI minus standard or itemized
  deduction; lines 2–22 remove nonbusiness and capital-loss items; line 23
  includes other-year NOL deductions; a negative line 24 is the origin-year
  NOL. The current page-1 PDF's 15 header fields are `f1_01`–`f1_15`; its
  line 1–24 fields are sequentially `f1_16`–`f1_39` in the PDF hierarchy.
  Validate 2026 nonitemizer charity, Schedule 1-A and QBI treatment against
  current instructions rather than inserting them into line 1 by guesswork.
- **Part II, lines 1–33:** pages 2–3 provide second- and first-preceding-year
  columns, including modified taxable income, carryover, medical, mortgage,
  charitable and casualty recomputations. Render both columns only when the
  applicable carryback path requires them. The fields have no tooltip
  labels; use the [coordinate inventory](pdf-fields-f172.csv) plus visual
  inspection, and retain one form per origin-year NOL.
- **MeF:** build `IRS172` and any separately required line-8a limitation
  statement in the selected XSD order. Compare form count, document IDs,
  origin year, PDF, Schedule 1 line 8a, 1040 line 8 and carryforward ledger.
  The May v1 ZIP and public workbook cannot settle current schema details.

## Implementation and acceptance

1. Add an owner/origin-year NOL ledger and derive pre-NOL taxable income from
   the completed 2026 graph, rather than asking the user for a final number.
   Resolve Form 461/982 effects and deduction choice first. Keep separate
   regular-tax, AMT and NIIT facts.
2. Calculate per-NOL allowed use and next-year balance in oldest-first order;
   produce Schedule 1 line 8a once. Create required per-NOL Form 172 inputs
   and line-8a statement facts from the same ledger.
3. Fill all applicable current Form 172 PDF pages, then map `IRS172` and the
   statement to the selected TY2026 XSD/rules. Refresh to any superseding
   form/instructions and confirm 2026 §172/§67/§68 treatment before filing.
4. Test two NOL origins of different vintages; two post-2017 origins whose
   combined balance exceeds the 80% limit; an MFS owner change; a 2026
   Form 461 loss that becomes 2027 NOL; Form 982 attribute reduction; farm
   carryback/waiver; and a year with zero capacity. For each, verify source
   history, Form 172, limitation statement, Schedule 1, 1040, PDF, MeF and
   following-year balance. Run TY2025 regressions for shared graph changes.

This is an implementation contract, not a completed TY2026 filing route.
