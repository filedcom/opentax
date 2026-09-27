# TY2026 calculation graph route gaps

The current dedicated registry declares **33 edges to targets it has not
registered**. `graph-route-gaps.csv` is generated from the executable registry
by running `deno run --allow-write forms/f1040/2026/build_route_gaps.ts` from
the repository root. Every target on these 33 edges exists in the TY2025 registry, but that
does not establish that their tax-year behavior or output lines are correct
for 2026. This inventory covers edges from the currently registered nodes;
it does not cover the remaining nodes in `node-coverage.csv`.

The planner orders registered nodes and ignores edges to absent ones. The
executor still deposits output values into the absent target's pending slot.
A wages-only 2026 run still deposits values into absent nodes, including EITC,
Schedule A, and Form 8962. Form 6251 and Schedule 8812 are now registered and can
send AMT through Schedule 2 to Form 1040. A successful core 1040
calculation therefore does not prove that every upstream route was consumed.

## Work order

1. **Income and adjustments:** connect the remaining income source inputs
   through Schedule B, Schedule 1, and AGI to the final 1040. The dedicated
   Schedule 1 sink and PDF now handle the 1099-INT box 2 penalty. The public
   1099-INT, 1099-G, 1098-E, simple 1099-DIV, and individual 1099-B/1099-DA
   routes are registered; other source lines remain open. The shared Schedule
   D node handles the 1099-DIV direct box 2a path and broker trades; the
   2026 Schedule D/Form 8949 PDF covers those filed trades. Review 2026
   forms and instructions for each source before registration, including
   capital gains, retirement distributions, Social Security, and foreign
   income. Reconcile each printed 1040 income line with the same amount in
   the AGI computation. The 2026 final 1040 and draft PDF now have the
   principal income amount fields through line 7a.
2. **Deduction dependency:** implement the Schedule A and QBI joint resolver
   described in `DEDUCTION-GRAPH.md`, then connect the charitable floor,
   SALT and overall limitations, Form 8995, and 2026 deduction choice.
3. **Tax and credits:** Form 8960 now routes 2026 NIIT to Schedule 2 line 6;
   Form 6251 routes computed AMT to line 2. Connect the remaining tax worksheets, then
   complete Form 8812, EITC, Form 2441, Schedule 3, Form 8962, and the
   credit-finalization path at the 2026 1040. Preserve the Schedule 2
   reordering and Schedule 3-A dependency; do not discard the current
   `credit_limit_schedule2_line1z` diagnostic before the full calculation
   replaces it.
4. **Cross-form W-2 routes:** audit the W-2 edges to Schedules A/C/SE,
   Forms 8839/8853/8880/8889/8959, the IRA deduction worksheet, and the
   remaining tax/credit nodes. Add their input and registry entries together
   with year-specific validation and output tests.
5. **Coverage gate:** regenerate the CSV after every registry expansion.
   Before product registration, every supported TY2025 node in
   `node-coverage.csv` needs a 2026 disposition and the active scenarios
   must leave no material values in unregistered pending targets. An
   unsupported 2026 branch must produce an explicit diagnostic. Then
   validate the full CLI, MeF, PDF, ATS, and TY2025 regression gates in
   `IMPLEMENTATION.md`.

The CSV is a static wiring inventory, not evidence that an edge emits a value
for every return. Inspect runtime pending records for each scenario when
closing a route; fields such as filing status and AGI can be deposited even
when a form is not ultimately filed.
