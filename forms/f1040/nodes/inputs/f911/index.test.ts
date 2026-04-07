import { assertEquals, assertThrows } from "@std/assert";
import { HardshipType, f911 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f911.compute({ taxYear: 2025 }, input as Parameters<typeof f911.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f911.inputSchema: all HardshipType enum values accepted", () => {
  for (const hardshipType of Object.values(HardshipType)) {
    const parsed = f911.inputSchema.safeParse({
      hardship_type: hardshipType,
      taxpayer_description: "Test description",
      requested_relief: "Test relief",
    });
    assertEquals(parsed.success, true);
  }
});

Deno.test("f911.inputSchema: optional contact_info accepted", () => {
  const parsed = f911.inputSchema.safeParse({
    hardship_type: HardshipType.EconomicHardship,
    taxpayer_description: "Levy causing hardship",
    requested_relief: "Release levy",
    contact_info: "555-555-1234",
  });
  assertEquals(parsed.success, true);
});

Deno.test("f911.inputSchema: missing hardship_type fails", () => {
  const parsed = f911.inputSchema.safeParse({
    taxpayer_description: "Description",
    requested_relief: "Relief",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f911.inputSchema: invalid hardship_type fails", () => {
  const parsed = f911.inputSchema.safeParse({
    hardship_type: "invalid_hardship",
    taxpayer_description: "Description",
    requested_relief: "Relief",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f911.inputSchema: missing taxpayer_description fails", () => {
  const parsed = f911.inputSchema.safeParse({
    hardship_type: HardshipType.EconomicHardship,
    requested_relief: "Relief",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f911.inputSchema: missing requested_relief fails", () => {
  const parsed = f911.inputSchema.safeParse({
    hardship_type: HardshipType.EconomicHardship,
    taxpayer_description: "Description",
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Compute — always returns no outputs (administrative form only)
// =============================================================================

Deno.test("f911.compute: all hardship types produce no outputs", () => {
  for (const hardshipType of Object.values(HardshipType)) {
    const result = compute({
      hardship_type: hardshipType,
      taxpayer_description: "Test description",
      requested_relief: "Test relief",
    });
    assertEquals(result.outputs, []);
  }
});

// =============================================================================
// 3. Hard validation — compute throws on bad input
// =============================================================================

Deno.test("f911.compute: throws on missing hardship_type", () => {
  assertThrows(() => compute({
    taxpayer_description: "Description",
    requested_relief: "Relief",
  }), Error);
});

Deno.test("f911.compute: throws on missing taxpayer_description", () => {
  assertThrows(() => compute({
    hardship_type: HardshipType.EconomicHardship,
    requested_relief: "Relief",
  }), Error);
});

Deno.test("f911.compute: throws on missing requested_relief", () => {
  assertThrows(() => compute({
    hardship_type: HardshipType.EconomicHardship,
    taxpayer_description: "Description",
  }), Error);
});

Deno.test("f911.compute: throws on invalid hardship_type", () => {
  assertThrows(() => compute({
    hardship_type: "not_valid",
    taxpayer_description: "Description",
    requested_relief: "Relief",
  }), Error);
});

// =============================================================================
// 4. Smoke test
// =============================================================================

Deno.test("f911.compute: smoke test — all fields populated returns empty outputs", () => {
  const result = compute({
    hardship_type: HardshipType.EconomicHardship,
    taxpayer_description: "The IRS placed a wage levy on my paychecks, leaving me unable to pay for food, housing, and medical expenses for my family. I have submitted a Collection Due Process hearing request but have not received a response.",
    requested_relief: "Immediately release the wage levy and work with me to establish a reasonable payment plan or Currently Not Collectible status.",
    contact_info: "555-123-4567 (best between 9am-5pm EST)",
  });
  assertEquals(result.outputs, []);
});
