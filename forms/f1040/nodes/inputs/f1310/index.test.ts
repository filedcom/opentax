import { assertEquals, assertThrows } from "@std/assert";
import { ClaimantType, f1310 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f1310.compute({ taxYear: 2025 }, input as Parameters<typeof f1310.compute>[1]);
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f1310.inputSchema: valid spouse claimant passes", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "Mary Smith",
    claimant_type: ClaimantType.SpouseFilingJointly,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f1310.inputSchema: valid court-appointed representative passes", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "Estate of Robert Smith",
    claimant_type: ClaimantType.CourtAppointedRepresentative,
    court_certificate_attached: true,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f1310.inputSchema: valid other claimant passes", () => {
  const parsed = f1310.inputSchema.safeParse({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "James Smith",
    claimant_type: ClaimantType.Other,
    proof_of_death_attached: true,
  });
  assertEquals(parsed.success, true);
});

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
// 2. Compute — No Tax Outputs
// =============================================================================

Deno.test("f1310.compute: spouse claimant returns no outputs", () => {
  const result = compute({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "Mary Smith",
    claimant_type: ClaimantType.SpouseFilingJointly,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f1310.compute: court-appointed claimant returns no outputs", () => {
  const result = compute({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "Estate Attorney",
    claimant_type: ClaimantType.CourtAppointedRepresentative,
    court_certificate_attached: true,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f1310.compute: other claimant returns no outputs", () => {
  const result = compute({
    deceased_name: "Robert Smith",
    deceased_ssn: "123-45-6789",
    date_of_death: "2024-11-15",
    claimant_name: "James Smith",
    claimant_type: ClaimantType.Other,
    proof_of_death_attached: true,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f1310.compute: all claimant types produce no outputs", () => {
  for (const claimantType of Object.values(ClaimantType)) {
    const result = compute({
      deceased_name: "Robert Smith",
      deceased_ssn: "123-45-6789",
      date_of_death: "2024-11-15",
      claimant_name: "Claimant Name",
      claimant_type: claimantType,
    });
    assertEquals(result.outputs, []);
  }
});

// =============================================================================
// 3. Hard Validation
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
