import { assertEquals, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { BiofuelType } from "../../../../../nodes/inputs/credits/business/f6478/index.ts";

const base = pdfReviewFixtures.find((f) => f.id === "single-w2-refund")!;
Deno.test("Form6478 public empty sources preserve the complete baseline1040", () => {
  const baseline = f1040_2025.executeReturn(base.inputs);
  assertEquals(baseline.diagnostics, []);
  for (const f6478 of [{}, { fuel_entries: [] }]) {
    const r = f1040_2025.executeReturn({ ...base.inputs, f6478 });
    assertEquals(r.diagnostics, []);
    assertEquals(r.pending.f1040, baseline.pending.f1040);
  }
});
Deno.test("Form6478 public legacy gallons produce an explicit ineligible diagnostic", () => {
  for (const fuel_type of Object.values(BiofuelType)) {
    for (const gallons of [0, 1000]) {
      const r = f1040_2025.executeReturn({
        ...base.inputs,
        f6478: { fuel_entries: [{ fuel_type, gallons }] },
      });
      assertStringIncludes(
        JSON.stringify(r.diagnostics),
        "TY2025 Form 6478 production gallons are not eligible",
      );
      assertEquals(r.pending.f1040?.line20_nonrefundable_credits ?? 0, 0);
    }
  }
});
Deno.test("Form6478 public unmodeled pass-through allocation is rejected", () => {
  const r = f1040_2025.executeReturn({
    ...base.inputs,
    f6478: { line3_pass_through_credit: 2000 },
  });
  assertStringIncludes(JSON.stringify(r.diagnostics), "Unrecognized key");
  assertEquals(r.pending.f1040?.line20_nonrefundable_credits ?? 0, 0);
});
