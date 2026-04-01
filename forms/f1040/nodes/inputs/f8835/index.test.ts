import { assertEquals, assertThrows } from "@std/assert";
import { EnergyType, f8835 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    energy_type: EnergyType.Wind,
    kwh_produced: 1_000_000,
    kwh_sold: 1_000_000,
    facility_placed_in_service_date: "2023-01-01",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8835.compute({ taxYear: 2025 }, { f8835s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8835.inputSchema: valid minimal item passes", () => {
  const parsed = f8835.inputSchema.safeParse({ f8835s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f8835.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8835.inputSchema.safeParse({ f8835s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8835.inputSchema: negative kwh_produced fails", () => {
  const parsed = f8835.inputSchema.safeParse({
    f8835s: [minimalItem({ kwh_produced: -1 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8835.inputSchema: negative kwh_sold fails", () => {
  const parsed = f8835.inputSchema.safeParse({
    f8835s: [minimalItem({ kwh_sold: -1 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8835.inputSchema: invalid energy_type fails", () => {
  const parsed = f8835.inputSchema.safeParse({
    f8835s: [minimalItem({ energy_type: "INVALID_TYPE" })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8835.inputSchema: all valid energy types pass", () => {
  for (const type of Object.values(EnergyType)) {
    const parsed = f8835.inputSchema.safeParse({ f8835s: [minimalItem({ energy_type: type })] });
    assertEquals(parsed.success, true, `Expected ${type} to pass`);
  }
});

// =============================================================================
// 2. Hard Validation
// =============================================================================

Deno.test("f8835.compute: throws when kwh_sold > kwh_produced", () => {
  assertThrows(
    () => compute([minimalItem({ kwh_produced: 500_000, kwh_sold: 600_000 })]),
    Error,
  );
});

Deno.test("f8835.compute: kwh_sold equals kwh_produced — does not throw", () => {
  const result = compute([minimalItem({ kwh_produced: 1_000_000, kwh_sold: 1_000_000 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 3. Credit Rate Per Energy Type
// =============================================================================

Deno.test("f8835.compute: WIND full rate (wage+apprenticeship met) = $0.028/kWh", () => {
  // 1,000,000 kWh × $0.028 = $28,000
  const result = compute([minimalItem({
    energy_type: EnergyType.Wind,
    kwh_sold: 1_000_000,
    meets_prevailing_wage: true,
    meets_apprenticeship: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 28_000);
});

Deno.test("f8835.compute: SOLAR full rate = $0.028/kWh", () => {
  const result = compute([minimalItem({
    energy_type: EnergyType.Solar,
    kwh_sold: 1_000_000,
    meets_prevailing_wage: true,
    meets_apprenticeship: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 28_000);
});

Deno.test("f8835.compute: GEOTHERMAL full rate = $0.028/kWh", () => {
  const result = compute([minimalItem({
    energy_type: EnergyType.Geothermal,
    kwh_sold: 1_000_000,
    meets_prevailing_wage: true,
    meets_apprenticeship: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 28_000);
});

Deno.test("f8835.compute: BIOMASS_CLOSED full rate = $0.028/kWh", () => {
  const result = compute([minimalItem({
    energy_type: EnergyType.BiomassClosed,
    kwh_sold: 1_000_000,
    meets_prevailing_wage: true,
    meets_apprenticeship: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 28_000);
});

Deno.test("f8835.compute: BIOMASS_OPEN half rate = $0.014/kWh", () => {
  // 1,000,000 × $0.014 = $14,000
  const result = compute([minimalItem({
    energy_type: EnergyType.BiomassOpen,
    kwh_sold: 1_000_000,
    meets_prevailing_wage: true,
    meets_apprenticeship: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 14_000);
});

// =============================================================================
// 4. Wage/Apprenticeship Multiplier
// =============================================================================

Deno.test("f8835.compute: WIND without wage/apprenticeship — reduced rate $0.0056/kWh", () => {
  // 1,000,000 × $0.0056 = $5,600
  const result = compute([minimalItem({
    energy_type: EnergyType.Wind,
    kwh_sold: 1_000_000,
    meets_prevailing_wage: false,
    meets_apprenticeship: false,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 5_600);
});

Deno.test("f8835.compute: WIND with wage only (no apprenticeship) — reduced rate", () => {
  const result = compute([minimalItem({
    energy_type: EnergyType.Wind,
    kwh_sold: 1_000_000,
    meets_prevailing_wage: true,
    meets_apprenticeship: false,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 5_600);
});

Deno.test("f8835.compute: BIOMASS_OPEN without requirements — reduced rate $0.0028/kWh", () => {
  // 1,000,000 × $0.0028 = $2,800
  const result = compute([minimalItem({
    energy_type: EnergyType.BiomassOpen,
    kwh_sold: 1_000_000,
    meets_prevailing_wage: false,
    meets_apprenticeship: false,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 2_800);
});

Deno.test("f8835.compute: no wage/apprenticeship flags (omitted) — reduced rate", () => {
  // Neither flag provided → defaults to reduced rate
  const result = compute([minimalItem({
    energy_type: EnergyType.Wind,
    kwh_sold: 1_000_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 5_600);
});

// =============================================================================
// 5. Zero kWh Sold — No Output
// =============================================================================

Deno.test("f8835.compute: kwh_sold = 0 — no output", () => {
  const result = compute([minimalItem({ kwh_sold: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Aggregation — Multiple Facilities
// =============================================================================

Deno.test("f8835.compute: multiple facilities — credits summed", () => {
  // Wind: 1,000,000 × $0.028 = $28,000 (wage+apprenticeship)
  // BiomassOpen: 1,000,000 × $0.014 = $14,000 (wage+apprenticeship)
  // Total: $42,000
  const result = compute([
    minimalItem({
      energy_type: EnergyType.Wind,
      kwh_sold: 1_000_000,
      meets_prevailing_wage: true,
      meets_apprenticeship: true,
    }),
    minimalItem({
      energy_type: EnergyType.BiomassOpen,
      kwh_sold: 1_000_000,
      meets_prevailing_wage: true,
      meets_apprenticeship: true,
    }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 42_000);
});

Deno.test("f8835.compute: one facility with zero kWh and one with kWh — only one contributes", () => {
  const result = compute([
    minimalItem({ kwh_sold: 0 }),
    minimalItem({
      energy_type: EnergyType.Solar,
      kwh_sold: 500_000,
      meets_prevailing_wage: true,
      meets_apprenticeship: true,
    }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 14_000); // 500000 × $0.028
});

// =============================================================================
// 7. Output Routing
// =============================================================================

Deno.test("f8835.compute: routes to schedule3 line6z_general_business_credit", () => {
  const result = compute([minimalItem({
    meets_prevailing_wage: true,
    meets_apprenticeship: true,
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
});

Deno.test("f8835.compute: does not route to schedule2", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f8835.compute: smoke test — multiple energy types, mixed requirements", () => {
  const result = compute([
    minimalItem({
      energy_type: EnergyType.Wind,
      kwh_produced: 5_000_000,
      kwh_sold: 4_000_000,
      meets_prevailing_wage: true,
      meets_apprenticeship: true,
      facility_placed_in_service_date: "2022-06-01",
    }),
    minimalItem({
      energy_type: EnergyType.BiomassOpen,
      kwh_produced: 2_000_000,
      kwh_sold: 1_500_000,
      meets_prevailing_wage: false,
      meets_apprenticeship: false,
      facility_placed_in_service_date: "2020-03-15",
    }),
  ]);
  // Wind: 4,000,000 × $0.028 = $112,000
  // BiomassOpen no-req: 1,500,000 × $0.0028 = $4,200
  // Total: $116,200
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 116_200);
});
