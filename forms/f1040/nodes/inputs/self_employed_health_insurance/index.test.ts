import { assertEquals } from "@std/assert";
import { self_employed_health_insurance } from "./index.ts";

const ctx = { taxYear: 2025, formType: "f1040" };

function compute(items: { premiums_paid: number }[]) {
  return self_employed_health_insurance.compute(ctx, { items });
}

Deno.test("routes premiums_paid to schedule1 line17_se_health_insurance", () => {
  const result = compute([{ premiums_paid: 1_000 }]);
  const s1 = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 1_000);
});

Deno.test("routes premiums_paid to agi_aggregator line17_se_health_insurance", () => {
  const result = compute([{ premiums_paid: 1_000 }]);
  const agi = result.outputs.find((o) => o.nodeType === "agi_aggregator");
  assertEquals(agi?.fields.line17_se_health_insurance, 1_000);
});

Deno.test("sums multiple items", () => {
  const result = compute([{ premiums_paid: 3_000 }, { premiums_paid: 2_000 }]);
  const s1 = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 5_000);
});

Deno.test("returns empty outputs when premiums_paid is zero", () => {
  const result = compute([{ premiums_paid: 0 }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("returns two outputs (schedule1 and agi_aggregator) for nonzero premiums", () => {
  const result = compute([{ premiums_paid: 500 }]);
  assertEquals(result.outputs.length, 2);
});
