import { assertEquals, assertThrows } from "@std/assert";
import { f8611, RecaptureEventType } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    original_credit_amount: 0,
    year_credit_first_claimed: 2020,
    year_of_recapture_event: 2025,
    recapture_event_type: RecaptureEventType.DISPOSITION,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8611.compute({ taxYear: 2025 }, { f8611s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8611.inputSchema: valid minimal item passes", () => {
  const parsed = f8611.inputSchema.safeParse({
    f8611s: [{
      original_credit_amount: 10_000,
      year_credit_first_claimed: 2020,
      year_of_recapture_event: 2025,
      recapture_event_type: RecaptureEventType.DISPOSITION,
    }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8611.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8611.inputSchema.safeParse({ f8611s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8611.inputSchema: negative original_credit_amount fails", () => {
  const parsed = f8611.inputSchema.safeParse({
    f8611s: [{ original_credit_amount: -1000, year_credit_first_claimed: 2020, year_of_recapture_event: 2025, recapture_event_type: RecaptureEventType.DISPOSITION }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8611.inputSchema: applicable_fraction out of range (> 1) fails", () => {
  const parsed = f8611.inputSchema.safeParse({
    f8611s: [{ original_credit_amount: 10_000, year_credit_first_claimed: 2020, year_of_recapture_event: 2025, recapture_event_type: RecaptureEventType.DISPOSITION, applicable_fraction: 1.5 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8611.inputSchema: applicable_fraction of 0 passes", () => {
  const parsed = f8611.inputSchema.safeParse({
    f8611s: [{ original_credit_amount: 10_000, year_credit_first_claimed: 2020, year_of_recapture_event: 2025, recapture_event_type: RecaptureEventType.DISPOSITION, applicable_fraction: 0 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8611.inputSchema: invalid recapture_event_type fails", () => {
  const parsed = f8611.inputSchema.safeParse({
    f8611s: [{ original_credit_amount: 10_000, year_credit_first_claimed: 2020, year_of_recapture_event: 2025, recapture_event_type: "INVALID" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8611.inputSchema: all recapture event types are valid", () => {
  for (const eventType of Object.values(RecaptureEventType)) {
    const parsed = f8611.inputSchema.safeParse({
      f8611s: [{ original_credit_amount: 10_000, year_credit_first_claimed: 2020, year_of_recapture_event: 2025, recapture_event_type: eventType }],
    });
    assertEquals(parsed.success, true, `RecaptureEventType.${eventType} should be valid`);
  }
});

// =============================================================================
// 2. Recapture Fraction Calculation
// =============================================================================

Deno.test("f8611.compute: year 0 (same year) = 100% recapture", () => {
  // years_held = 0, recapture_fraction = 15/15 = 1.0
  const result = compute([minimalItem({
    original_credit_amount: 10_000,
    year_credit_first_claimed: 2025,
    year_of_recapture_event: 2025,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line10_lihtc_recapture, 10_000);
});

Deno.test("f8611.compute: year 5 = 10/15 recapture", () => {
  // years_held = 5, recapture_fraction = (15-5)/15 = 10/15
  const result = compute([minimalItem({
    original_credit_amount: 15_000,
    year_credit_first_claimed: 2015,
    year_of_recapture_event: 2020,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  const expected = 15_000 * (10 / 15);
  assertEquals(Math.abs((fields.line10_lihtc_recapture ?? 0) - expected) < 0.01, true);
});

Deno.test("f8611.compute: year 14 = 1/15 recapture", () => {
  // years_held = 14, recapture_fraction = 1/15
  const result = compute([minimalItem({
    original_credit_amount: 15_000,
    year_credit_first_claimed: 2010,
    year_of_recapture_event: 2024,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  const expected = 15_000 * (1 / 15);
  assertEquals(Math.abs((fields.line10_lihtc_recapture ?? 0) - expected) < 0.01, true);
});

// =============================================================================
// 3. 15-Year Safe Harbor
// =============================================================================

Deno.test("f8611.compute: exactly 15 years held — no recapture", () => {
  const result = compute([minimalItem({
    original_credit_amount: 10_000,
    year_credit_first_claimed: 2010,
    year_of_recapture_event: 2025,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8611.compute: more than 15 years held — no recapture", () => {
  const result = compute([minimalItem({
    original_credit_amount: 10_000,
    year_credit_first_claimed: 2005,
    year_of_recapture_event: 2025,
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Applicable Fraction
// =============================================================================

Deno.test("f8611.compute: applicable_fraction reduces recapture", () => {
  // years_held = 0, recapture_fraction = 1.0, applicable_fraction = 0.5
  // recapture = 10,000 × 0.5 × 1.0 = 5,000
  const result = compute([minimalItem({
    original_credit_amount: 10_000,
    year_credit_first_claimed: 2025,
    year_of_recapture_event: 2025,
    applicable_fraction: 0.5,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line10_lihtc_recapture, 5_000);
});

Deno.test("f8611.compute: applicable_fraction defaults to 1.0 when omitted", () => {
  const result = compute([minimalItem({
    original_credit_amount: 10_000,
    year_credit_first_claimed: 2025,
    year_of_recapture_event: 2025,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line10_lihtc_recapture, 10_000);
});

// =============================================================================
// 5. Prior Recapture Amounts
// =============================================================================

Deno.test("f8611.compute: prior_recapture_amounts reduces net recapture", () => {
  // years_held = 0, gross = 10,000 × 1.0 = 10,000, prior = 3,000 → net = 7,000
  const result = compute([minimalItem({
    original_credit_amount: 10_000,
    year_credit_first_claimed: 2025,
    year_of_recapture_event: 2025,
    prior_recapture_amounts: 3_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line10_lihtc_recapture, 7_000);
});

Deno.test("f8611.compute: prior_recapture_amounts equals gross — no output", () => {
  // gross = 10,000, prior = 10,000 → net = 0 → no output
  const result = compute([minimalItem({
    original_credit_amount: 10_000,
    year_credit_first_claimed: 2025,
    year_of_recapture_event: 2025,
    prior_recapture_amounts: 10_000,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8611.compute: prior_recapture_amounts exceeds gross — floors at zero, no output", () => {
  const result = compute([minimalItem({
    original_credit_amount: 10_000,
    year_credit_first_claimed: 2025,
    year_of_recapture_event: 2025,
    prior_recapture_amounts: 15_000,
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Output Routing
// =============================================================================

Deno.test("f8611.compute: routes to schedule2 line10_lihtc_recapture", () => {
  const result = compute([minimalItem({
    original_credit_amount: 10_000,
    year_credit_first_claimed: 2020,
    year_of_recapture_event: 2025,
  })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
});

Deno.test("f8611.compute: zero original_credit_amount — no output", () => {
  const result = compute([minimalItem({
    original_credit_amount: 0,
    year_credit_first_claimed: 2020,
    year_of_recapture_event: 2025,
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Multiple Buildings
// =============================================================================

Deno.test("f8611.compute: multiple buildings — recaptures summed", () => {
  // Building 1: 10,000, year 0 → 10,000 × 1.0 = 10,000
  // Building 2: 6,000, year 5 → 6,000 × (10/15) = 4,000
  const result = compute([
    minimalItem({ original_credit_amount: 10_000, year_credit_first_claimed: 2025, year_of_recapture_event: 2025 }),
    minimalItem({ original_credit_amount: 6_000, year_credit_first_claimed: 2020, year_of_recapture_event: 2025 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  const expected = 10_000 + 6_000 * (10 / 15);
  assertEquals(Math.abs((fields.line10_lihtc_recapture ?? 0) - expected) < 0.01, true);
});

Deno.test("f8611.compute: multiple buildings — only one schedule2 output", () => {
  const result = compute([
    minimalItem({ original_credit_amount: 10_000, year_credit_first_claimed: 2025, year_of_recapture_event: 2025 }),
    minimalItem({ original_credit_amount: 5_000, year_credit_first_claimed: 2021, year_of_recapture_event: 2025 }),
  ]);
  assertEquals(result.outputs.length, 1);
});

// =============================================================================
// 8. Hard Validation
// =============================================================================

Deno.test("f8611.compute: throws if year_of_recapture_event < year_credit_first_claimed", () => {
  assertThrows(() => compute([minimalItem({ original_credit_amount: 10_000, year_credit_first_claimed: 2025, year_of_recapture_event: 2020 })]), Error);
});

Deno.test("f8611.compute: same year (year_of_recapture = year_first_claimed) does not throw", () => {
  const result = compute([minimalItem({ original_credit_amount: 10_000, year_credit_first_claimed: 2025, year_of_recapture_event: 2025 })]);
  assertEquals(result.outputs.length, 1);
});

// =============================================================================
// 9. Smoke Test
// =============================================================================

Deno.test("f8611.compute: smoke test — multiple buildings with all fields", () => {
  const result = compute([
    minimalItem({
      original_credit_amount: 50_000,
      year_credit_first_claimed: 2018,
      year_of_recapture_event: 2025,
      recapture_event_type: RecaptureEventType.DISPOSITION,
      applicable_fraction: 0.8,
      prior_recapture_amounts: 5_000,
    }),
    minimalItem({
      original_credit_amount: 30_000,
      year_credit_first_claimed: 2022,
      year_of_recapture_event: 2025,
      recapture_event_type: RecaptureEventType.REDUCED_QUALIFIED_BASIS,
      applicable_fraction: 1.0,
      prior_recapture_amounts: 0,
    }),
    minimalItem({
      original_credit_amount: 20_000,
      year_credit_first_claimed: 2010,
      year_of_recapture_event: 2025,
      recapture_event_type: RecaptureEventType.NONCOMPLIANCE,
    }),
  ]);
  // Building 1: years_held=7, recapture_fraction=8/15, adjusted=50,000×0.8=40,000, gross=40,000×8/15≈21,333.33, net=21,333.33-5,000=16,333.33
  // Building 2: years_held=3, recapture_fraction=12/15=0.8, adjusted=30,000×1.0=30,000, gross=24,000, net=24,000
  // Building 3: years_held=15, no recapture (safe harbor)
  // Total ≈ 16,333.33 + 24,000 = 40,333.33
  const fields = fieldsOf(result.outputs, schedule2)!;
  const b1_gross = 50_000 * 0.8 * (8 / 15);
  const b1_net = b1_gross - 5_000;
  const b2_gross = 30_000 * 1.0 * (12 / 15);
  const expected = b1_net + b2_gross;
  assertEquals(Math.abs((fields.line10_lihtc_recapture ?? 0) - expected) < 0.01, true);
});
