import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, self_employed_health_insurance } from "./index.ts";

const ctx = { taxYear: 2025, formType: "f1040" };

function compute(items: { premiums_paid: number }[]) {
  return self_employed_health_insurance.compute(ctx, {
    items,
    marketplace_ptc_premium_overlap: false,
  });
}

test("requires explicit Marketplace overlap review before routing", () => {
  assertThrows(
    () => inputSchema.parse({ items: [{ premiums_paid: 1_000 }] }),
    Error,
    "marketplace_ptc_premium_overlap",
  );
  assertThrows(
    () =>
      self_employed_health_insurance.compute(ctx, {
        items: [{ premiums_paid: 1_000 }],
        marketplace_ptc_premium_overlap: true,
      }),
    Error,
    "requires the Publication 974 deduction calculation",
  );
});

// 2025 Instructions for Form 7206: premiums for months eligible for a
// subsidized employer plan are left out of line 1; the rest go to Form 7206,
// which applies the business-earnings limit.
test("positive premiums route to Form 7206 less employer-plan-eligible months", () => {
  assertEquals(
    self_employed_health_insurance.compute(ctx, {
      items: [
        { premiums_paid: 3_000, employer_plan_eligible_month_premiums: 500 },
        { premiums_paid: 2_000 },
      ],
      marketplace_ptc_premium_overlap: false,
    }).outputs,
    [{ nodeType: "form7206", fields: { premium_only_premiums: 4_500 } }],
  );
});

test("returns empty outputs when premiums_paid is zero", () => {
  const result = compute([{ premiums_paid: 0 }]);
  assertEquals(result.outputs.length, 0);
});

test("TY2026 also routes positive premiums to Form 7206", () => {
  assertEquals(
    self_employed_health_insurance.compute(
      { taxYear: 2026, formType: "f1040" },
      { items: [{ premiums_paid: 1_000 }], marketplace_ptc_premium_overlap: false },
    ).outputs,
    [{ nodeType: "form7206", fields: { premium_only_premiums: 1_000 } }],
  );
  assertEquals(
    self_employed_health_insurance.compute(
      { taxYear: 2026, formType: "f1040" },
      { items: [{ premiums_paid: 0 }], marketplace_ptc_premium_overlap: false },
    ).outputs,
    [],
  );
});
