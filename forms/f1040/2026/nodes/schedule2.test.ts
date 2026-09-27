import { assertEquals, assertThrows } from "@std/assert";
import { schedule2_2026 } from "./schedule2.ts";

const context = { taxYear: 2026, formType: "f1040" };

Deno.test("2026 Schedule 2 sends filed totals to Form 1040", () => {
  const result = schedule2_2026.compute(context, {
    line16a_form4137_tip_tax: 153,
    line17c_w2_uncollected_fica: 50,
  });
  const f1040 = result.outputs.find((item) => item.nodeType === "f1040");
  const schedule2 = result.outputs.find((item) =>
    item.nodeType === "schedule2"
  );
  const f8812 = result.outputs.find((item) => item.nodeType === "f8812");
  assertEquals(f1040?.fields.line17_additional_taxes, 0);
  assertEquals(f1040?.fields.line23_other_taxes, 203);
  assertEquals(f1040?.fields.schedule2_line20, 203);
  assertEquals(schedule2?.fields.line16c_additional_fica, 153);
  assertEquals(schedule2?.fields.line17c_w2_uncollected_fica, 50);
  assertEquals(f8812?.fields.auto_schedule2_line16c, 153);
  assertEquals(f8812?.fields.auto_schedule2_line17c, 50);
});

Deno.test("2026 Schedule 2 rejects a 2025 context and empty activity", () => {
  assertThrows(
    () =>
      schedule2_2026.compute(
        { taxYear: 2025, formType: "f1040" },
        { line16a_form4137_tip_tax: 153 },
      ),
    Error,
    "requires f1040:2026",
  );
  assertEquals(schedule2_2026.compute(context, {}).outputs, []);
});
