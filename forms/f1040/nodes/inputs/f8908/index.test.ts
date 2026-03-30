import { assertEquals, assertThrows } from "@std/assert";
import { f8908, itemSchema, ConstructionType, EnergyCertification } from "./index.ts";
import type { z } from "zod";

type F8908Item = z.infer<typeof itemSchema>;

function minimalItem(overrides: Partial<F8908Item> = {}): F8908Item {
  return {
    construction_type: ConstructionType.SingleFamily,
    energy_certification: EnergyCertification.EnergyStar50Pct,
    ...overrides,
  };
}

function compute(items: F8908Item[]) {
  return f8908.compute({ taxYear: 2025 }, { f8908s: items });
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_rejects_empty_array", () => {
  assertThrows(() => f8908.compute({ taxYear: 2025 }, { f8908s: [] }), Error);
});

Deno.test("schema_accepts_valid_item", () => {
  const result = f8908.inputSchema.safeParse({
    f8908s: [{
      construction_type: ConstructionType.ManufacturedHome,
      energy_certification: EnergyCertification.ZeroEnergyReady,
    }],
  });
  assertEquals(result.success, true);
});

// ── Credit Tiers ──────────────────────────────────────────────────────────────

Deno.test("energy_star_50pct_yields_2500_credit", () => {
  const result = compute([minimalItem({ energy_certification: EnergyCertification.EnergyStar50Pct })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2500);
});

Deno.test("zero_energy_ready_yields_5000_credit", () => {
  const result = compute([minimalItem({ energy_certification: EnergyCertification.ZeroEnergyReady })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 5000);
});

Deno.test("energy_star_45ach_yields_2500_credit", () => {
  const result = compute([minimalItem({ energy_certification: EnergyCertification.EnergyStar45Ach })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2500);
});

// ── Credit Amount Override ────────────────────────────────────────────────────

Deno.test("credit_amount_override_used_when_provided", () => {
  const result = compute([minimalItem({ credit_amount_override: 3500 })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 3500);
});

Deno.test("zero_credit_override_produces_no_output", () => {
  const result = compute([minimalItem({ credit_amount_override: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// ── Construction Types (informational — no effect on credit amount) ───────────

Deno.test("manufactured_home_energy_star_yields_2500", () => {
  const result = compute([minimalItem({
    construction_type: ConstructionType.ManufacturedHome,
    energy_certification: EnergyCertification.EnergyStar50Pct,
  })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2500);
});

Deno.test("multifamily_zero_energy_ready_yields_5000", () => {
  const result = compute([minimalItem({
    construction_type: ConstructionType.Multifamily,
    energy_certification: EnergyCertification.ZeroEnergyReady,
  })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 5000);
});

// ── Aggregation ───────────────────────────────────────────────────────────────

Deno.test("multiple_homes_aggregate", () => {
  // 2 × $2,500 + 1 × $5,000 = $10,000
  const result = compute([
    minimalItem({ energy_certification: EnergyCertification.EnergyStar50Pct }),
    minimalItem({ energy_certification: EnergyCertification.EnergyStar50Pct }),
    minimalItem({ energy_certification: EnergyCertification.ZeroEnergyReady }),
  ]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 10000);
});

Deno.test("home_address_is_optional", () => {
  const result = compute([minimalItem({ home_address: "123 Main St, Anytown, CA 90210" })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2500);
});

Deno.test("routes_to_schedule3", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});
