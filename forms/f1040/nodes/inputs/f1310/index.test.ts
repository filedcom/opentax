import { assertEquals, assertThrows } from "@std/assert";
import { ClaimantType, f1310 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f1310.compute({ taxYear: 2025 }, input as Parameters<typeof f1310.compute>[1]);
}

// =============================================================================
// 1. Schema Validation — required fields
// =============================================================================

Deno.test("f1310.inputSchema: missing deceased_name fails", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "Mary Smith",
    claimant_type: ClaimantType.SpouseFilingJointly,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1310.inputSchema: missing deceased_ssn fails", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    date_of_death: "2024-11-15",
    claimant_name: "Mary Smith",
    claimant_type: ClaimantType.SpouseFilingJointly,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1310.inputSchema: missing date_of_death fails", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    claimant_name: "Mary Smith",
    claimant_type: ClaimantType.SpouseFilingJointly,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1310.inputSchema: missing claimant_name fails", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_type: ClaimantType.SpouseFilingJointly,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1310.inputSchema: invalid claimant_type fails", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "Mary Smith",
    claimant_type: "invalid_type",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1310.inputSchema: court_certificate_attached and proof_of_death_attached are optional", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "Mary Smith",
    claimant_type: ClaimantType.SpouseFilingJointly,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Schema Validation — claimant type routing
// =============================================================================

Deno.test("f1310.inputSchema: SpouseFilingJointly claimant type accepted", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "Mary Smith",
    claimant_type: ClaimantType.SpouseFilingJointly,
  });
  assertEquals(parsed.success, true);
  if (parsed.success) {
    assertEquals(parsed.data.claimant_type, ClaimantType.SpouseFilingJointly);
  }
});

Deno.test("f1310.inputSchema: CourtAppointedRepresentative claimant type accepted with court_certificate_attached", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "Estate of Robert Smith",
    claimant_type: ClaimantType.CourtAppointedRepresentative,
    court_certificate_attached: true,
  });
  assertEquals(parsed.success, true);
  if (parsed.success) {
    assertEquals(parsed.data.claimant_type, ClaimantType.CourtAppointedRepresentative);
    assertEquals(parsed.data.court_certificate_attached, true);
  }
});

Deno.test("f1310.inputSchema: Other claimant type accepted with proof_of_death_attached", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "James Smith",
    claimant_type: ClaimantType.Other,
    proof_of_death_attached: true,
  });
  assertEquals(parsed.success, true);
  if (parsed.success) {
    assertEquals(parsed.data.claimant_type, ClaimantType.Other);
    assertEquals(parsed.data.proof_of_death_attached, true);
  }
});

// =============================================================================
// 3. Compute — administrative form produces no tax outputs
// =============================================================================

Deno.test("f1310.compute: produces no outputs for any valid claimant type", () => {
  for (const claimantType of Object.values(ClaimantType)) {
    const result = compute({
      deceased_name: "Robert Smith",
      deceased_ssn: "123-45-6789",
      date_of_death: "2024-11-15",
      claimant_name: "Claimant",
      claimant_type: claimantType,
    });
    assertEquals(result.outputs.length, 0, `Expected no outputs for claimant_type=${claimantType}`);
  }
});

// =============================================================================
// 4. Compute — throws on invalid or missing required fields
// =============================================================================

Deno.test("f1310.compute: throws on missing deceased_ssn", () => {
  assertThrows(() =>
    compute({
      deceased_name: "Robert Smith",
      date_of_death: "2024-11-15",
      claimant_name: "Mary Smith",
      claimant_type: ClaimantType.SpouseFilingJointly,
    }), Error);
});

Deno.test("f1310.compute: throws on invalid claimant_type", () => {
  assertThrows(() =>
    compute({
      deceased_name: "Robert Smith",
      deceased_ssn: "123-45-6789",
      date_of_death: "2024-11-15",
      claimant_name: "Mary Smith",
      claimant_type: "bad_value",
    }), Error);
});

Deno.test("f1310.compute: throws on missing required fields", () => {
  assertThrows(() => compute({}), Error);
});
