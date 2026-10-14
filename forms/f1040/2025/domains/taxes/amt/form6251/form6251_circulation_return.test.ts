import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { circulationInputs } from "./form6251_circulation.fixture.ts";

for (
  const [regular, amt, elected, amti, totalTax] of [
    [30000, 10000, false, 460000, 99350],
    [8000, 10000, false, 438000, 93190],
    [10000, 10000, true, 440000, 93750],
  ] as const
) {
  Deno.test(`circulation expense reaches complete return: ${regular}/${amt}/${elected}`, async () => {
    const result = f1040_2025.executeReturn(
      circulationInputs(regular, amt, elected),
    );
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending),
      filer = extractFilerIdentity(p.f1040!)!;
    // Independent 2025 rate worksheet: regular tax 37,067; AMT exemption
    // 88,100; 26% on the first 239,100 of excess, then 28%.
    assertEquals(p.schedule1?.line3_schedule_c, 0);
    assertEquals(p.f1040?.line11_agi, 200000);
    assertEquals(p.f1040?.line15_taxable_income, 184250);
    assertEquals(p.f1040?.line16_income_tax, 37067);
    assertEquals(p.form6251?.amti, amti);
    assertEquals(p.form6251?.exemption, 88100);
    assertEquals(p.form6251?.line11_amt, totalTax - 37067);
    assertEquals(p.schedule2?.line2_amt, totalTax - 37067);
    assertEquals(p.f1040?.line24_total_tax, totalTax);
    assertEquals(p.f1040?.line37_amount_owed, totalTax - 35000);
    assertEquals(p.form6251?.line2o_circulation_costs ?? 0, regular - amt);
    const bundle = await buildMefBundle(p, { filer, attachments: [] });
    if (regular !== amt) {
      assertStringIncludes(
        bundle.xml,
        `<CirculationCostAmt>${regular - amt}</CirculationCostAmt>`,
      );
    }
    assertEquals(p.f1040?.line17_additional_taxes, p.form6251?.line11_amt);
    for (
      const mutate of [
        (x: typeof p) => {
          x.schedule_c!.schedule_cs![0].part_v_other_expenses![0].amount += 1;
        },
        (x: typeof p) => {
          x.f59e!.f59es[0].circulation_schedule_c_expense!.owner_tin =
            "999999999";
        },
        (x: typeof p) => {
          x.f59e!.f59es[0].circulation_schedule_c_expense = undefined;
        },
        (x: typeof p) => {
          x.schedule1!.line3_schedule_c = 1;
        },
      ]
    ) {
      const changed = structuredClone(p);
      mutate(changed);
      await assertRejects(() =>
        buildMefBundle(changed, { filer, attachments: [] })
      );
    }
  });
}
