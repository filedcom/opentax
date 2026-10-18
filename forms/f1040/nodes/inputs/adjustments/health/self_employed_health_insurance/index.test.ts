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

test("premium-only claims cannot bypass the Form 7206 business limit", () => {
  assertThrows(
    () => compute([{ premiums_paid: 1_000 }]),
    Error,
    "identified Form 7206 plan",
  );
  assertThrows(
    () => compute([{ premiums_paid: 3_000 }, { premiums_paid: 2_000 }]),
    Error,
    "identified Form 7206 plan",
  );
});

test("returns empty outputs when premiums_paid is zero", () => {
  const result = compute([{ premiums_paid: 0 }]);
  assertEquals(result.outputs.length, 0);
});

test("TY2026 also routes positive premiums to Form 7206", () => {
  assertThrows(
    () =>
      self_employed_health_insurance.compute(
        { taxYear: 2026, formType: "f1040" },
        { items: [{ premiums_paid: 1_000 }], marketplace_ptc_premium_overlap: false },
      ),
    Error,
    "Form 7206",
  );
  assertEquals(
    self_employed_health_insurance.compute(
      { taxYear: 2026, formType: "f1040" },
      { items: [{ premiums_paid: 0 }], marketplace_ptc_premium_overlap: false },
    ).outputs,
    [],
  );
});
