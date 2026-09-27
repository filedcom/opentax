# TY2026 QBI and cooperative filing contract

The 2026 [Form 8995](corpus/draft/f8995.pdf), [Form 8995-A](corpus/draft/f8995a.pdf),
[Form 8995-A Schedule A](corpus/draft/f8995aa.pdf), and [Form 8995
instructions](corpus/draft/i8995.pdf) are pinned in the manifest. The
continuous-use [Form 1099-PATR](corpus/authorities/f1099ptr--2025.pdf) and
[instructions](corpus/authorities/i1099ptr--2025.pdf) expressly apply to 2025
and later years until superseded. Forms 8995-A
[Schedules B](corpus/authorities/f8995ab--2022.pdf),
[C](corpus/authorities/f8995ac--2022.pdf), and
[D](corpus/authorities/f8995ad--2022.pdf) are still posted as December 2022
continuous-use forms. The latest [Form 8995-A instructions](corpus/authorities/i8995a--2025.pdf)
are **2025 only**, so use them as a comparator for the cooperative mechanism,
not proof of a 2026 limit or filing rule. The 2026 Form 8995 draft instruction
title and new $400 paragraph say 2026, but several internal page footers still
say 2025; verify the final revision before release.

## First decision: which QBI form?

The printed 2026 Form 8995 permits simplified computation only when pre-QBI
taxable income is at or below $201,750 (MFS $201,775, MFJ $403,500) **and the
filer is not a patron of an agricultural or horticultural cooperative**.
Otherwise use Form 8995-A. An ATS cover-sheet patron answer is a form-choice
fact, not an amount of qualified payments, QBI, wages, or cooperative DPAD.
Form 8995-A Part I has a patron checkbox for **each** trade, business, or
aggregation. Its Schedule D reduces the component for qualified payments; its
Part IV line 38 adds a separately passed-through section 199A(g) deduction.
These are different calculations and must remain separate.

The [deduction resolver](DEDUCTION-GRAPH.md) must supply actual taxable income
**before** QBI and the net-capital-gain/qualified-dividend limit. Its chosen
standard/itemized result and Schedule A overall limit depend on the QBI
result. Resolve that dependency once and send the same final QBI amount to
1040 line 13b, Form 6251, validation, PDF, and MeF.

## Form 1099-PATR source shape and current mismatch

| Current continuous-use box | Meaning and destination | Shared [f1099patr node](../../forms/f1040/nodes/inputs/f1099patr/index.ts) |
| --- | --- | --- |
| 1, 2, 3, 5 | Potential taxable cooperative distributions. Classify personal purchases, capital/depreciable asset basis reductions, redemption timing, and business activity before routing to Schedule F/C/E or other income. | Sums nonbusiness distributions to Schedule 1; business amounts have no downstream output. It lacks classification/basis evidence. |
| 4 | Federal backup withholding to Form 1040 withholding. | Sends to the TY2025 final 1040 node; the 2026 node/withholding line needs a year-specific route. |
| **6** | Cooperative's **section 199A(g) deduction passed through**, designated in written notice; candidate for Form 8995-A line 38 subject to its cap. | Incorrectly named `box6_dpad` and described as expired; produces no output. |
| 7 | Qualified payments under section 199A(b)(7), used for the patron reduction decision and allocation. | Captured as informational only; produces no output. |
| **8** | Section 199A(a) qualified items from non-SSTB activity, subject to business/item eligibility review. | Incorrectly named `box8_qualified_written_notice`; produces no QBI output. |
| **9** | Section 199A(a) qualified items from SSTB activity. | Incorrectly named `box9_section199a_deduction`; produces no QBI output. |
| 10–12 | Passed-through credits/other deductions requiring separately typed downstream facts. | Absent. |
| **13** | Specified agricultural/horticultural cooperative checkbox. | Absent; the node cannot select Form 8995-A from the source record. |

The 1099-PATR instructions say boxes 7–9 are informational for the section
199A(a) calculation. Do not add those box amounts to taxable income a second
time. Reconcile them to the underlying distributions and the business's QBI
items. A qualified-payment amount in box 7 can trigger the patron reduction
for a business claiming QBI; an actual Schedule D line 2 still needs the QBI
**allocable** to those payments, plus allocable W-2 wages. Neither is the
whole Form 1099-PATR box 7 by definition. Preserve payer TIN, recipient/owner,
business key, and any cooperative attachment or written notice.

## Calculation and attachment route

| Stage | Printed rule / output | Required input and current gap |
| --- | --- | --- |
| Per-business QBI | Determine allowed QBI after attributable half-SE tax, self-employed health insurance, retirement contributions, gain/loss exclusions, and released suspended losses. Keep each business and cooperative payment allocation separate. | Current [Form 8995](../../forms/f1040/nodes/intermediate/forms/form8995/index.ts) collapses businesses to totals, can estimate pre-QBI income from a standard deduction, and has no patron election. [Form 8995-A](../../forms/f1040/nodes/intermediate/forms/form8995a/index.ts) also aggregates QBI, wages, and UBIA into one combined amount. |
| Schedule D (8995-A) | For each patron business: line 2 QBI allocable to qualified payments; line 3 = 9% of line 2; line 4 allocable W-2 wages; line 5 = 50% of line 4; line 6 = smaller of lines 3/5. Send line 6 to matching Form 8995-A Part II line 14. Multiple schedule pages if more than three activities. | No current input, calculator, PDF descriptor, or MeF serializer for this schedule. A patron with no allocable W-2 wages may have zero reduction, but that must be an evidenced amount. |
| Form 8995-A Parts I–III | Check patron per activity, calculate 20% QBI and W-2/UBIA limits, apply the $201,750/$201,775/$403,500 thresholds and $75,000/$150,000 phase-in ranges, then subtract Schedule D line 6 on Part II line 14. SSTB Phase-in Schedule A and loss-netting Schedule C are distinct per-activity attachments when applicable. | The shared advanced node has no patron fields or Part I rows and does not emit filed lines, Schedule A/C/D, or per-business loss allocation. The `qbi_aggregation` node records a group but emits no financial output or Schedule B. |
| Form 8995-A Part IV | Line 33 is pre-QBI taxable income, 34 net capital gain plus qualified dividends, 37 the income-limited QBI component, 38 cooperative section 199A(g) DPAD capped at line 33 less line 37, 39 their sum, 40 the new active-QBI minimum if eligible, and 41 the greater of 39/40 to 1040 line 13b. Keep line 42 REIT/PTP carryforward. | Current node has no DPAD, minimum, line 14 patron reduction, or filed-line record. It may drop a DPAD-only case because its activity check looks only at QBI/REIT/carryforwards. |
| Form 8995 simplified | Lines 1i–5 aggregate business QBI; 6–10 REIT/PTP; 11–15 income limit; new line 16 active-QBI minimum; 17 final deduction; 18–19 carryforwards. This form is unavailable to a cooperative patron under its printed instruction. | Current simple node lacks the minimum and can return uncapped QBI when income facts are missing. Require finalized pre-QBI income before selecting and computing either form. |

The 2026 draft Form 8995 instructions give a $400 minimum when aggregate QBI
from materially participated qualified businesses reaches at least $1,000;
the draft Forms 8995 and 8995-A print new minimum lines 16 and 40. Record
material participation and eligible aggregate QBI separately from general
QBI. The 2026 Form 8995-A instructions are still unavailable; reconcile the
final instructions and active MeF rules before treating this as a filing-ready
calculation. Do not infer material participation merely from a Form 4835
active-participation checkbox.

## PDF and MeF build targets

The generated field inventories capture canonical names, tooltip, physical
page, rectangle, and field-tree membership: [Form 8995](pdf-fields-f8995.csv)
has **36** terminal fields; [Form 8995-A](pdf-fields-f8995a.csv) has **114**;
the 2026 [Schedule A (8995-A)](pdf-fields-f8995aa.csv) has **67**. All are in
their AcroForm field trees. The three December 2022 Schedules B/C/D are XFA
forms, so their PDF production path needs a separate render/fill decision and
visual verification. A final 2026 revision can change any widget.

The [TY2025 Form 8995-A PDF descriptor](../../forms/f1040/2025/pdf/forms/f8995a.ts)
maps only eleven values. Its `taxable_income` field points to what the 2026
AcroForm tooltip identifies as **Part I row A business name**; the rest of the
old map is likewise unsuitable. Build the 2026 descriptor from the new
inventories and a filed-line model, including Schedule D for patrons and B/C
when needed. Render every physical page and reconcile its line values to the
calculation, including continuation pages.

The [TY2025 MeF serializer](../../forms/f1040/2025/mef/forms/f8995a.ts)
emits eleven aggregate inputs and no Schedule D. The locally downloaded May
TY2026 v1 package includes `IRS8995A` and separate `IRS8995AScheduleA/B/C/D`
documents, but v1 is not the current validation target. Obtain the authorized
current package, map complete activity rows, computed lines, attachment
references and active rules, then validate the **same** result used by PDF and
1040. See [MeF version drift](MEF-V1-DRIFT.md).

## Build order and acceptance

1. Correct the 1099-PATR box model for the current continuous-use form, with
   payer/recipient identity, activity allocation, boxes 6–13, duplicate-income
   prevention, and source statement evidence. Keep TY2025 behavior verified
   before changing shared code. Add source-backed Schedule F/C/E routes and
   owner-specific withholding. Do not register the current mislabelled input
   as a TY2026 route.
2. Add per-business QBI facts, allowable losses/carryforwards, W-2 wages,
   UBIA, patron status, qualified-payment allocation, cooperative DPAD notice,
   and aggregation detail. Calculate Schedule D, then A/B/C as applicable,
   then Form 8995-A Parts I–IV. Keep Form 8995 for eligible nonpatrons.
3. Connect both QBI form calculations to the joint 2026 deduction resolver;
   remove the shared node's estimated-income/uncapped path from the 2026
   filing route. Emit one final `qbi_deduction` to 1040 line 13b and all other
   downstream consumers. Preserve carryforwards by type and origin year.
4. Create and reconcile 2026 PDF and current-MeF components for every filed
   attachment. Test a nonpatron simplified case; patron with zero and nonzero
   Schedule D reduction; passed-through DPAD; $400 minimum boundaries;
   threshold/phase-in edges including MFS; SSTB Schedule A; multiple-business
   loss-netting Schedule C; aggregation Schedule B; and REIT/PTP carryovers.
5. For [ATS scenario 3](ATS-SCENARIO-03.md), the cover sheet says the farmer
   is a patron of a specified agricultural cooperative, so the form-choice
   route is Form 8995-A. The packet has **no Form 1099-PATR, qualified-payment
   statement, allocable W-2 wages, or 199A(g) notice**. Keep those facts
   missing and request/mark explicit ATS-only assumptions before asserting a
   numeric QBI deduction. Schedule F profit $4,207 is not a substitute for
   Schedule D line 2; the farm's half-SE deduction may reduce QBI.
6. For [ATS scenario 2](ATS-SCENARIO-02.md), the cover says the taxpayers are
   specified-cooperative patrons and concludes they do not qualify for QBI.
   Patron status by itself calls for the Form 8995-A/Schedule D analysis; the
   packet supplies no 1099-PATR, qualified-payment statement, or cooperative
   allocation. Reconcile that conclusion with the statutory-employee Schedule
   C activity and its actual QBI facts before emitting zero or a deduction.

Release requires a current 2026 Form 8995-A instruction set and MeF
schema/rules, complete activity-level calculation, and matching 1040/PDF/XML
output. The pinned 2025 instructions are only a comparator where 2026
instructions have not yet been published.
