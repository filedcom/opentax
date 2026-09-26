import { assertEquals } from "@std/assert";
import { buildPending } from "./pending.ts";

Deno.test("MeF pending keeps finalized worksheet context", () => {
  const pending = buildPending({
    form8978_reporting_year: {
      schedule3_line6l: 500,
      schedule2_line17z_reduction: 100,
    },
    f1040: { line24_total_tax: 900 },
  });
  assertEquals(
    (pending as Record<string, unknown>).form8978_reporting_year,
    { schedule3_line6l: 500, schedule2_line17z_reduction: 100 },
  );
  assertEquals(pending.f1040?.line24_total_tax, 900);
});
