# TY2026 Schedule SE calculation, output, and ATS contract

Sources: pinned [2026 draft Schedule SE](corpus/draft/f1040sse.pdf), SHA-256
`a59fa5dcf2f0a8a5a71c46aa3837e9e8e605eeecc0a666bcb784a368900d141c`,
and [2026 draft instructions](corpus/draft/i1040sse.pdf), SHA-256
`8c6b42b7d5852813bd03030c05afcd7d3126f3271a463ed007918165a0e388d3`.
Both are drafts. The form PDF has a coversheet plus two printed pages; its
AcroForm has 27 terminal fields. The printed form and its field tooltips were
checked against rendered pages on 2026-09-27.

## Owner and source contract

One Schedule SE combines an individual's farming and nonfarming earnings;
spouses with earnings require separate Schedules SE. Keep an owner key/SSN on
each source and each resulting Schedule SE. Aggregate multiple businesses for
the same owner, including applicable partnership K-1 box 14 amounts, before
calculating tax. Farm rentals reported on Form 4835 by a landlord without
material participation are excluded from SE earnings, even when the Form 4835
active-participation answer is Yes. See [Form 4835](FORM4835-GRAPH.md).

| Source fact | Printed destination / decision | Current graph gap |
| --- | --- | --- |
| Schedule F line 34 and farm K-1 box 14 code A | Regular method line 1a; use for the farm-optional eligibility net-profit test even when line 1a is skipped. | [Schedule F](../../forms/f1040/nodes/intermediate/forms/schedule_f/index.ts) emits to Schedule SE only for net profit at least $400, suppressing optional-method cases with a smaller profit or loss. Partnership and owner aggregation need verification. |
| CRP receipts when the filer received Social Security retirement/disability benefits | Regular line 1b is a negative amount; the would-be line 1b reduces net farm profit for the optional eligibility test. | The [shared Schedule SE node](../../forms/f1040/nodes/intermediate/forms/schedule_se/index.ts) has no CRP input. |
| Schedule F line 9 and farm K-1 box 14 code B | Gross farm income for Part II line 15 and its eligibility test. | No gross-farm field reaches Schedule SE; line 34 profit is not a substitute. |
| Schedule C line 31, nonfarm K-1 box 14 code A, and other includible SE income | Regular line 2, except when the nonfarm optional method is elected. | Shared node has Schedule C profit only; classify K-1 and special-income cases by owner. |
| Schedule C line 7 and nonfarm K-1 box 14 code C | Gross nonfarm income for optional line 17 and its eligibility test. | No gross-nonfarm field or election-history input. |
| W-2 Social Security wages/tips, Form 4137 line 10, Form 8919 line 10, railroad tier 1 compensation | Lines 8a–8d and remaining Social Security wage base. | Shared node covers the first three numeric fields; verify railroad and per-owner aggregation. |
| Church employee income, minister/Form 4361 facts | Line A and lines 5a–5b, plus exemptions and the $100 church-income test. | Not represented by the shared calculation. |

Use separate explicit farm and nonfarm optional-method elections. The farm
method is available if gross farm income is **at most $11,340** *or* net farm
profits are **less than $8,186**. It has no lifetime-use limit. The nonfarm
method requires net nonfarm profits below $8,186 **and** below 72.189% of
gross nonfarm income, at least $400 actual SE earnings in two of the prior
three years, and fewer than five prior uses. Both methods share the $7,560
maximum; when both are used, nonfarm line 17 is limited by line 16 after farm
line 15. The instructions add a lower bound tied to actual nonfarm earnings;
verify it before accepting a both-method return. Never infer an election from
profit amount alone.

## Printed calculation and routes

| Line | TY2026 calculation or routing |
| --- | --- |
| 1a–2 | Farm profit, negative CRP adjustment, and nonfarm profit. Skip 1a/1b if farm optional is elected; skip 2 if nonfarm optional is elected. Keep these underlying amounts available for eligibility and income-tax routes. |
| 3–4a | Sum filed regular lines. Apply 92.35% to positive line 3; otherwise carry line 3. |
| 14–15 | Line 14 preprints $7,560. Elected farm line 15 is `min(max(0, gross farm income × 2/3), 7,560)`. Check the eligibility test first. |
| 16–17 | If nonfarm optional is elected, line 16 is $7,560 less line 15; line 17 is the allowed two-thirds gross nonfarm amount under that remaining cap and the instruction's actual-earnings floor. |
| 4b–6 | Line 4b is lines 15 + 17; line 4c is line 4a + line 4b. The $400 stop test applies to **line 4c**, not just regular-method line 4a. Church employee income has the printed exception and line 5b calculation. Line 6 is 4c + 5b. |
| 7–11 | Line 7 is the **$184,500** 2026 Social Security wage base. Subtract lines 8a–8c to get line 9, floored at zero. Line 10 is 12.4% of the smaller of lines 6 and 9; line 11 is 2.9% of line 6. Observe the printed skip when line 8a already reaches the wage base. |
| 12–13 | Line 12 = 10 + 11, to 2026 Schedule 2 line 4, line 21 and 1040 line 23. Line 13 = half of line 12, to 2026 Schedule 1 line 15, line 26 and 1040 line 10; also reconcile the QBI deduction attribution. |

Line 6 also feeds Form 8959's self-employment income, using the **same
owner-specific** result. Optional methods can change earned income for EIC,
ACTC and dependent-care credit, the self-employed health-insurance limit, AGI,
and the QBI-related half-SE deduction. Verify those downstream consumers
against the 2026 instructions; do not route line 15 gross election amount as
Schedule F income. Schedule F line 34 remains the income-tax profit.

## Current code and build order

1. Add an owner-keyed 2026 source/election shape. Schedule F must send gross
   line 9 and net line 34 even when net is below $400; include farm K-1 and CRP
   facts, and classify Form 4835 separately. Do not change TY2025 routes as a
   side effect. Add nonfarm gross, earnings history, church/ministry and
   railroad facts for the full TY2025-supported surface.
2. Implement the two eligibility tests and lines 1a–17 in one 2026 Schedule
   SE node (or a shared node only after both years' contracts are proved).
   Retain a filed-line record rather than only five downstream totals. Reject
   incomplete election history and incompatible source/owner combinations.
   The existing shared node uses only regular method and stops when its line
   4a is below $400; [TY2026 registry](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2026/registry.ts)
   does not yet contain Schedule SE.
3. Route the calculated lines to the dedicated 2026 Schedule 1 and 2 sinks,
   AGI, Form 8959, QBI, and earned-income credit consumers. Reconcile a
   spouse's separate Schedule SE before combining Schedule 2/1 amounts.
4. Create a 2026 PDF filler using the map below, render both printed pages,
   and check the line 1a/1b blank state when farm optional is elected. The
   [TY2025 filler](../../forms/f1040/2025/pdf/forms/schedule_se.ts) uses
   `f1_1` for Schedule C profit, but 2026 `f1_1` is the **person's name**;
   copying that map would put money into the name field.
5. Diff `IRS1040ScheduleSE.xsd` and rules in the **current authorized** 2026
   MeF package. The local May v1 XSD already names `OptionalMethodAmt` for
   4b and `SETaxFarmOptionalMethodAmt` for 15, but these are only research
   leads, not final element/order evidence. The [TY2025 serializer](../../forms/f1040/2025/mef/forms/schedule_se.ts)
   emits only five input amounts and has no optional or computed lines.
   Validate complete owner-separated XML returns against the selected XSD and
   active rules, then compare emitted PDF, XML, and calculation fields.

### 2026 draft AcroForm map

For example, `Page1.f1_1[0]` expands to
`topmostSubform[0].Page1[0].f1_1[0]`; `Page2.f2_2[0]` expands to
`topmostSubform[0].Page2[0].f2_2[0]`. The draft PDF's first physical page
is a coversheet; `Page1`/`Page2` refer to the two printed form pages.

| PDF field | Printed content | PDF field | Printed content |
| --- | --- | --- | --- |
| `Page1.f1_1[0]` | Name | `Page1.f1_2[0]` | SSN |
| `Page1.c1_1[0]` | Form 4361 checkbox A | `Page1.f1_3[0]` | 1a |
| `Page1.f1_4[0]` | 1b | `Page1.f1_5[0]` | 2 |
| `Page1.f1_6[0]` | 3 | `Page1.f1_7[0]` | 4a |
| `Page1.f1_8[0]` | 4b | `Page1.f1_9[0]` | 4c |
| `Page1.f1_10[0]` | 5a | `Page1.f1_11[0]` | 5b |
| `Page1.f1_12[0]` | 6 | `Page1.f1_13[0]` | Preprinted 7 |
| `Page1.f1_14[0]` | 8a | `Page1.f1_15[0]` | 8b |
| `Page1.f1_16[0]` | 8c | `Page1.f1_17[0]` | 8d |
| `Page1.f1_18[0]` | 9 | `Page1.f1_19[0]` | 10 |
| `Page1.f1_20[0]` | 11 | `Page1.f1_21[0]` | 12 |
| `Page1.f1_22[0]` | 13 | `Page2.f2_1[0]` | Preprinted 14 |
| `Page2.f2_2[0]` | 15 | `Page2.f2_3[0]` | 16 |
| `Page2.f2_4[0]` | 17 | | |

Preprinted lines 7 and 14 have AcroForm fields but should preserve their
official amounts unless a final IRS form changes them. The checkbox state
options are `1` and `Off`. Confirm every physical page and widget after PDF
fill; the field map alone does not prove a rendered return.

## ATS scenario 3 acceptance

The [18-page packet](ATS-SCENARIO-03.md) elects only the farm optional method.
Its Schedule F line 9 gross is $9,233 and line 34 profit is $4,207. The first
eligibility branch passes ($9,233 ≤ $11,340). Its **unrounded** line 15 is
`2/3 × 9,233 = 6,155⅓`, under $7,560. With no other SE income established in
the packet, skip regular farm lines 1a/1b, put the elected amount on 4b, and
derive lines 4c, 6, 10–13. The printed packet leaves these computed lines
blank: use independent arithmetic and select a whole-dollar rounding rule
from the current 1040/MeF instructions before asserting exact filed dollars.
Keep the $11,908 Form 4835 profit out of this Schedule SE. Test the attachment
and owner SSN in PDF and XML, not just the 1040 total.

Additional decisive fixtures: farm loss plus elected method; gross farm income
above $11,340 but net profits below $8,186; gross and net on either side of
their strict/non-strict thresholds; both optional methods and cap sharing;
nonfarm five-use/history failure; CRP with Social Security benefits; wages at
and over the Social Security cap; two spouses with separate businesses.
