import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { circulationScheduleInputs } from "./form6251_circulation.fixture.ts";

for (
  const [year, elected, difference, tax] of [
    [2025, false, 20000, 99350],
    [2024, false, -10000, 90950],
    [2023, false, -10000, 90950],
    [2022, false, 0, 93750],
    [2025, true, 0, 93750],
    [2024, true, 0, 93750],
  ] as const
) {
  Deno.test(`circulation cost schedule reaches final return: ${year}/${elected}`, async () => {
    const result = f1040_2025.executeReturn(
      circulationScheduleInputs(year, elected),
    );
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending), f = p.f1040!;
    const filer = extractFilerIdentity(f)!;
    assertEquals(p.form6251?.line2o_circulation_costs ?? 0, difference);
    assertEquals(p.form6251?.amti, 440000 + difference);
    assertEquals(f.line16_income_tax, 37067);
    assertEquals(p.schedule2?.line2_amt, tax - 37067);
    assertEquals(f.line24_total_tax, tax);
    assertEquals(f.line37_amount_owed, tax - 35000);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertStringIncludes(
      prepared.bundle.xml,
      `<TotalTaxAmt>${tax}</TotalTaxAmt>`,
    );
    for (
      const change of [
        (x: typeof p) => {
          x.f59e!.f59es[0].circulation_cost_schedule!.cost_records[0].amount++;
        },
        (x: typeof p) => {
          x.f59e!.f59es[0].circulation_cost_schedule!.owner_tin = "999999999";
        },
        (x: typeof p) => {
          x.f59e!.f59es[0].remaining_unamortized++;
        },
        (x: typeof p) => {
          x.f59e!.f59es[0].amt_deduction = 9999;
        },
      ]
    ) {
      const altered = structuredClone(p);
      change(altered);
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
    }
  });
}
