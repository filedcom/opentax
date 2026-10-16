# TY2025 Form 8995-A fractional parent amounts after loss netting

The existing two-business Schedule C loss route retained cent-valued source QBI and rounded each signed business row, but still required every percentage product on the parent to be an integer before filing. The actual public source with positive QBI301.25 and loss100.10 therefore failed at Form8995A even though its filed adjusted QBI201 produces an ordinary rounded deduction40. The before-change executor diagnostic is `/tmp/opentax-qbi-fractional-parent-before-oct6.log`.

[TY2025 Form1040 rounding instructions](https://www.irs.gov/instructions/i1040gi) permit whole-dollar return/schedule amounts and require cents to remain while adding source amounts for one line. The [TY2025 Form8995-A](https://www.irs.gov/pub/irs-prior/f8995a--2025.pdf) calculates separate 20%,50%,25% and2.5% monetary lines before additions and lesser-of comparisons. The shared loss calculator now rounds those parent monetary entries and uses their filed values downstream. Raw ScheduleC inputs, business QBI and aggregate graph income remain retained. A positive adjusted QBI whose20% amount rounds tozero retains its required parent and loss companion.

Independent complete-return oracles:

| Positive source QBI | Loss | Filed adjusted QBI | Filed20% | Wages | Filed50% /25% | Deduction |
|---:|---:|---:|---:|---:|---:|---:|
|301.25|100.10|201|40|100|50 /25|40|
|303.25|100.10|203|41|100|50 /25|41|
|399.25|100.10|299|60|101|51 /25|51|
|101.25|100.10|1|0|100|50 /25|0|

The test executes public sources, verifies unchanged raw business income, parent/companion/native/1040 joins, full local2025v5.4 XSD and complete filled packets, and rejects changed source cents and final deductions at native and direct PDF export. Typechecked full-return/source/XSD/PDF focus **1/0 (21s)** covers all four packets and source/return conflicts, `/tmp/opentax-8995a-fractional-parent-focus-v2-oct6.log`; six-module compatibility **48/0 (7s)**, `/tmp/opentax-8995a-fractional-parent-compat-oct6.log`. Initial test type diagnostic is retained separately; final tests do not skip type checking. All48 pages rendered and visually reviewed, `/tmp/opentax-8995a-fractional-parent-root-review-oct6.json`. Actual saved-source replay is terminal4/48 with exact wholepending/carry/origins/source/PDF and nativeXMLonlyReturnTs/fullXSD, `/tmp/opentax-8995a-fractional-parent-current-main-raw-oct6/report.json`. All16 new artifact files independently hash-preserved in `.state/research/form8995a-fractional-parent-oct6-preserved`; the prior cent-loss PDF/XML also remain unchanged and privately hash-preserved. The prior archive contains no source/pending snapshot, so no exact prior source replay is claimed. Wider businesses, SE-adjustment allocation, prior accepted loss imports, source authenticity and IRS acceptance remain open under the existing parent task.
