import { assertEquals, assertThrows } from "@std/assert";
import { IncidentType, f14039 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f14039.compute({ taxYear: 2025 }, input as Parameters<typeof f14039.compute>[1]);
}

// =============================================================================
// 1. Input Validation — required fields and type constraints
// =============================================================================

Deno.test("f14039.inputSchema: valid filing_disruption incident passes", () => {
  const parsed = f14039.inputSchema.safeParse({
    incident_type: IncidentType.FilingDisruption,
    identity_theft_description: "Someone filed a fraudulent return using my SSN",
    date_of_incident: "2025-01-15",
  });
  assertEquals(parsed.success, true);
});

Deno.test("f14039.inputSchema: valid other incident type passes", () => {
  const parsed = f14039.inputSchema.safeParse({
    incident_type: IncidentType.Other,
    identity_theft_description: "My SSN was used to open a fraudulent bank account",
  });
  assertEquals(parsed.success, true);
});

Deno.test("f14039.inputSchema: with optional police_report_number passes", () => {
  const parsed = f14039.inputSchema.safeParse({
    incident_type: IncidentType.FilingDisruption,
    identity_theft_description: "Fraudulent return filed",
    police_report_number: "2025-RPT-12345",
    date_of_incident: "2025-02-01",
  });
  assertEquals(parsed.success, true);
});

Deno.test("f14039.inputSchema: missing incident_type fails", () => {
  const parsed = f14039.inputSchema.safeParse({
    identity_theft_description: "Description here",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f14039.inputSchema: invalid incident_type fails", () => {
  const parsed = f14039.inputSchema.safeParse({
    incident_type: "bad_type",
    identity_theft_description: "Description here",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f14039.inputSchema: missing identity_theft_description fails", () => {
  const parsed = f14039.inputSchema.safeParse({
    incident_type: IncidentType.FilingDisruption,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f14039.inputSchema: all IncidentType enum values are valid", () => {
  for (const incidentType of Object.values(IncidentType)) {
    const parsed = f14039.inputSchema.safeParse({
      incident_type: incidentType,
      identity_theft_description: "Test description",
    });
    assertEquals(parsed.success, true);
  }
});

// =============================================================================
// 2. Compute — always returns no outputs (informational only)
// =============================================================================

Deno.test("f14039.compute: filing_disruption incident returns no outputs", () => {
  const result = compute({
    incident_type: IncidentType.FilingDisruption,
    identity_theft_description: "Someone filed a fraudulent return using my SSN",
    date_of_incident: "2025-01-15",
  });
  assertEquals(result.outputs, []);
});

Deno.test("f14039.compute: other incident type returns no outputs", () => {
  const result = compute({
    incident_type: IncidentType.Other,
    identity_theft_description: "My SSN was used for employment fraud",
  });
  assertEquals(result.outputs, []);
});

Deno.test("f14039.compute: all incident types produce no outputs", () => {
  for (const incidentType of Object.values(IncidentType)) {
    const result = compute({
      incident_type: incidentType,
      identity_theft_description: "Test description",
    });
    assertEquals(result.outputs, []);
  }
});

Deno.test("f14039.compute: with police_report_number returns no outputs", () => {
  const result = compute({
    incident_type: IncidentType.FilingDisruption,
    identity_theft_description: "Fraud alert",
    police_report_number: "2025-123",
    date_of_incident: "2025-03-01",
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 3. Hard validation rules
// =============================================================================

Deno.test("f14039.compute: throws on missing incident_type", () => {
  assertThrows(() => compute({
    identity_theft_description: "Description",
  }), Error);
});

Deno.test("f14039.compute: throws on missing identity_theft_description", () => {
  assertThrows(() => compute({
    incident_type: IncidentType.FilingDisruption,
  }), Error);
});

Deno.test("f14039.compute: throws on invalid incident_type", () => {
  assertThrows(() => compute({
    incident_type: "not_a_valid_type",
    identity_theft_description: "Description",
  }), Error);
});

Deno.test("f14039.compute: throws on empty input", () => {
  assertThrows(() => compute({}), Error);
});

// =============================================================================
// 4. Smoke test — full population
// =============================================================================

Deno.test("f14039.compute: smoke test — all fields populated returns empty outputs", () => {
  const result = compute({
    incident_type: IncidentType.FilingDisruption,
    identity_theft_description: "I received a notice that a tax return was filed using my SSN before I filed my own return. I did not file the prior return.",
    police_report_number: "2025-RPT-98765",
    date_of_incident: "2025-02-14",
  });
  assertEquals(Array.isArray(result.outputs), true);
  assertEquals(result.outputs.length, 0);
});
