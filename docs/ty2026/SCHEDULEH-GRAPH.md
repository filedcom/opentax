# TY2026 Schedule H calculation and attachment contract

Sources: pinned [2026 draft Schedule H](corpus/draft/f1040sh.pdf) and
[2026 draft instructions](corpus/draft/i1040sh.pdf) (SHA-256
`685fa1486b3a6e5712c5552da3ef0eb5f7b245dec3d3f28e642e37efe15dbf1e`).
The draft is three physical PDF pages: an IRS cover followed by two printed
pages with 72 AcroForm widgets. ATS [scenario 1](ATS-SCENARIO-01.md) has
$4,100 of household wages subject to Social Security and Medicare tax and
checks line 9 **No**, so its Part II FUTA page remains blank.

| Decision or line | 2026 source meaning | Calculation and route |
| --- | --- | --- |
| A | Any one household employee paid at least $3,000 cash wages during 2026 | Yes triggers Social Security/Medicare lines 1–8, then tests FUTA on line 9. The threshold is per employee; total payroll alone cannot answer it. |
| B/C | Withheld federal income tax; or all employees' cash wages at least $1,000 in a 2025/2026 quarter | If A is No, B may trigger line 7; C may require FUTA only. Capture all three answers explicitly. |
| 1–8 | Social Security wages, Medicare wages, Additional Medicare wages, withheld income tax | Lines 2/4/6 use 12.4%, 2.9%, and 0.9%. Line 8 adds those taxes and withholding. Account for the per-employee Social Security wage base and $200,000 Additional Medicare threshold before entering aggregated wages. |
| 9 | $1,000 quarterly FUTA test | No sends line 8 to Schedule 2 line 17a; Yes continues to Part II. |
| 10–12, Section A | State contributions paid to one state, on time, with all FUTA wages state-taxable | Record state name, contributions, and wages capped at $7,000 per employee; line 16 is 0.6% of FUTA wages. All three Yes answers are required for Section A. |
| Section B | A No answer on any of 10–12, late state contributions, or credit reduction state | Requires per-state wage, rate-period, contribution, and credit-reduction details. The shared TY2025 calculator has year-specific CA/VI assumptions and explicitly rejects Section B for 2026. Do not reuse that path without current-year rates and final instructions. |
| 25–27 | Line 25 = line 8 except the C-only FUTA case, when it is zero; line 26 adds FUTA; 1040 filers answer line 27 Yes | Route line 26 to **2026 Schedule 2 line 17a** and from there to Form 1040 line 23. The shared TY2025 node instead emits `line9_household_employment`, which the 2026 Schedule 2 does not consume. |

The dedicated 2026 source needs employee-level evidence for thresholds and
wage-base caps, employer EIN, A/B/C and 9 answers, and Part II facts. It must
self-emit all filed line values so the two printed pages and XML serialize the
same calculation. Start with the line 9 No path used by ATS scenario 1, then
Section A, then implement Section B with a dated credit-reduction table. Until Section B's
2026 rates are verified, an eligible Section B return must receive an explicit
diagnostic.

Current slice: `nodes/schedule_h.ts` accepts entered, already-qualified Part I
wage amounts and explicit filing/FUTA answers. It computes Part I and Section A,
emits Schedule 2 line 17a, and rejects Section B with a named diagnostic.
`pdf/schedule_h.ts` fills both printed pages of the pinned draft and reconciles
the calculated tax to Schedule 2. The ATS line 9 No page and a Section A page
were rendered and visually checked. Employee payroll records, relationship
exclusions, the Social Security wage-base calculation, and quarter-level FUTA
evidence are still needed to derive the form entries from source facts. XML
attachment and active MeF rules also remain open.

## Completion checks

1. From the scenario's $4,100 taxable wages, independently compute line 2
   ($508 after whole-dollar rounding) and line 4 ($119), then reconcile line
   8 ($627), Schedule 2 line 17a, and Form 1040 line 23. The packet's annual
   $4,100 alone does not establish quarterly FUTA liability; honor the
   checked line 9 answer and record the missing employee/quarter detail as a
   fixture limitation.
2. Exercise an A-No/B-Yes income-withholding-only case and a C-Yes FUTA-only
   case. The latter must put zero on line 25 so no FICA tax is duplicated.
3. Render both printed pages, all relevant answer boxes, and the state/FUTA
   amounts. Reopen the flattened PDF to check that no fields or widgets remain.
4. Add the current TY2026 MeF Schedule H attachment and active business-rule
   checks from the selected SOR package. Keep the May v1 package as research
   material only.
