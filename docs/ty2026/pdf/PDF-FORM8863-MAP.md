# Current TY2026 Form 8863 draft mapping

`forms/f1040/2026/pdf/form8863.ts` replays retained education sources and checks
Form 1040 lines 11b, 18 and 29 plus Schedule 3 lines 2 and 3. See the
[current source contract](../graphs/EDUCATION-CURRENT.md) for supported cases
and remaining gates. Attachment sequence is 50, after Schedule 8812.

The pinned draft has three physical pages: a cover and two form pages, with
77 fields. The builder verifies the hash and inventory, fills fresh copies,
flattens them, removes all annotations/AcroForm and copies only the form pages.
Output is always a development draft, never filing-ready.

| Page | Field leaves | Source |
| --- | --- | --- |
| 1 | f1_1 through f1_4 | Filer name and split primary TIN |
| 1 | f1_5 through f1_9 | Lines 1 through 5 |
| 1 | f1_10/f1_11 | Line 6, three-decimal ratio |
| 1 | f1_12 through f1_21 | Lines 7 through 16; skip 8 when under-24 restriction applies; skip 11–17 when line 10 is zero |
| 1 | f1_22/f1_23, f1_24/f1_25 | Line 17 ratio and lines 18/19 |
| 1 | c1_1 | Under-24 nonrefundable restriction |
| 2 | f2_1 through f2_8 | Return name/TIN and student name/TIN |
| 2 | f2_9/f2_10, f2_11 through f2_19 | First institution name/address/EIN digits |
| 2 | f2_20/f2_21, f2_22 through f2_30 | Second institution name/address/EIN digits |
| 2 | c2_1 through c2_4 | Current receipt and prior 1098-T box 7, separately for each school |
| 2 | c2_5 through c2_8 | Supported AOTC eligibility answers |
| 2 | f2_31 through f2_34, or f2_35 | Student AOTC lines 27–30 or LLC line 31 |

The 2026 student-name leaf is `f2_5`, unlike the legacy 2025 `f2-5`.
Part III repeats per student; more than two institutions create another page 2
filled only through line 22. Long text that cannot fit at six points is rejected
rather than silently clipped. Current school addresses are domestic only.

Ten synthetic QA pages cover AOTC, LLC, two students/three institutions and
under-24 refundability. Automated tests also check destination disagreement,
phaseout omission, page counts, extracted values and absence of interactive
fields. Final authority refresh and complete MeF/ATS remain required.
