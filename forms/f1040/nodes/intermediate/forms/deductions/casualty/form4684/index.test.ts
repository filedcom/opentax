import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { form4684, PersonalCasualtyKind, personalSectionA } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form4684.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── Section A — Personal-Use Property ───────────────────────────────────────

function property(overrides: Record<string, unknown> = {}) {
  return {
    property_type: "House",
    city: "Anchorage",
    state: "AK",
    zip: "99501",
    acquired_date: "2000-01-01",
    basis: 15_000,
    insurance: 2_000,
    fmv_before: 14_000,
    fmv_after: 2_000,
    ...overrides,
  };
}

const fire = {
  description: "Fire",
  casualty_date: "2025-01-01",
  kind: PersonalCasualtyKind.FederallyDeclaredDisaster,
  fema_declaration_number: "EM-1234",
  properties: [property()],
};
const monsoon = {
  description: "Monsoon",
  casualty_date: "2025-02-01",
  kind: PersonalCasualtyKind.QualifiedDisaster,
  fema_declaration_number: "EM-2345",
  qualified_disaster_confirmed: true as const,
  properties: [property({
    property_type: "Shed",
    basis: 12_000,
    fmv_before: 11_000,
    fmv_after: 6_000,
  })],
};
const hurricane = {
  description: "Hurricane",
  casualty_date: "2025-03-01",
  kind: PersonalCasualtyKind.NotFederallyDeclared,
  properties: [property({
    property_type: "Barn",
    basis: 8_000,
    insurance: 0,
    fmv_before: 7_000,
    fmv_after: 3_000,
  })],
};

// 2025 Form 4684 lines 2-12 per casualty: line 9 is the smaller of basis or
// the value decline, less reimbursement; line 11 is $100, or $500 for a
// qualified disaster loss. Line 14 adds line 12 of the federally declared
// forms (Worksheet 1-1 adds a non-federal loss only up to line 13 gains).
// Line 15 is the smaller of line 14 less line 13 or the qualified disaster
// line 12; line 16 is line 14 less lines 13 and 15.
test("Section A: three casualties give lines 12, 14, 15 and 16", () => {
  const summary = personalSectionA([fire, monsoon, hurricane]);
  assertEquals(summary.forms.map((form) => form.line12), [9_900, 2_500, 3_900]);
  assertEquals(summary.forms.map((form) => form.line11), [100, 500, 100]);
  assertEquals(summary.line13, 0);
  assertEquals(summary.line14, 12_400);
  assertEquals(summary.line15, 2_500);
  assertEquals(summary.line16, 9_900);
});

// Line 15 goes to Schedule A line 16 and, for a non-itemizer, increases the
// standard deduction (2025 Instructions for Form 1040, Line 12e, Exception 5);
// line 16 is limited by 10% of AGI on Schedule A.
test("Section A routes line 15 and line 16", () => {
  const result = compute({ personal_casualties: [fire, monsoon, hurricane] });
  const scheduleA = result.outputs.filter((o) => o.nodeType === "schedule_a")
    .map((o) => o.fields);
  assertEquals(scheduleA, [
    { form4684_line16_loss: 9_900 },
    { net_qualified_disaster_loss: 2_500 },
  ]);
  assertEquals(
    findOutput(result, "standard_deduction")?.fields,
    { net_qualified_disaster_loss: 2_500 },
  );
});

// "Do not complete the rest of this section if all of your casualty or theft
// losses are subject to the $500 reduction" (2025 Form 4684, line 15).
test("Section A stops at line 15 when every loss is a qualified disaster loss", () => {
  const summary = personalSectionA([monsoon]);
  assertEquals(summary.line15, 2_500);
  assertEquals(summary.line16, undefined);
  assertEquals(
    findOutput(compute({ personal_casualties: [monsoon] }), "schedule_a")
      ?.fields,
    { net_qualified_disaster_loss: 2_500 },
  );
});

test("a loss not attributable to a federally declared disaster deducts nothing without gains", () => {
  const result = compute({ personal_casualties: [hurricane] });
  assertEquals(result.outputs.length, 0);
});

// Worksheet 1-1: a non-federal loss offsets personal casualty gains (line 13);
// line 13 equal to line 14 enters zero on line 15 and stops.
test("Worksheet 1-1 lets a non-federal loss offset a casualty gain", () => {
  const gain = {
    ...hurricane,
    description: "Theft",
    properties: [property({ basis: 1_000, insurance: 4_000 })],
  };
  const summary = personalSectionA([hurricane, gain]);
  assertEquals(summary.line13, 3_000);
  assertEquals(summary.line14, 3_000);
  assertEquals(summary.line15, 0);
  assertEquals(summary.line16, undefined);
});

test("a net personal casualty gain is refused", () => {
  const gain = { ...fire, properties: [property({ basis: 1_000, insurance: 20_000 })] };
  assertThrows(() => personalSectionA([gain]), Error, "Schedule D");
});

test("a federally declared or qualified disaster needs its FEMA number and confirmation", () => {
  assertThrows(
    () => compute({ personal_casualties: [{ ...fire, fema_declaration_number: undefined }] }),
    Error,
    "FEMA declaration number",
  );
  assertThrows(
    () => compute({ personal_casualties: [{ ...monsoon, qualified_disaster_confirmed: undefined }] }),
    Error,
    "qualified_disaster_confirmed",
  );
  assertThrows(
    () => compute({ personal_casualties: [{ ...hurricane, fema_declaration_number: "DR-1234" }] }),
    Error,
    "no FEMA number",
  );
});

// ─── Business Property Losses ────────────────────────────────────────────────

test("business §1231 property loss routes to form4797", () => {
  // Business property FMV decline: $30,000, basis: $50,000, no insurance
  // Loss = min($30,000, $50,000) = $30,000
  const result = compute({
    business_fmv_before: 80_000,
    business_fmv_after: 50_000,
    business_basis: 50_000,
    business_insurance: 0,
    business_is_section_1231: true,
  });
  assertEquals(findOutput(result, "form4797")?.fields.ordinary_gain_form4684, -30_000);
  assertEquals(findOutput(result, "schedule_a"), undefined);
  assertEquals(findOutput(result, "schedule_d"), undefined);
});

test("business investment property loss routes to schedule_d", () => {
  const result = compute({
    business_fmv_before: 50_000,
    business_fmv_after: 30_000,
    business_basis: 45_000,
    business_insurance: 0,
    business_is_section_1231: false,
  });
  assertEquals(findOutput(result, "schedule_d")?.fields.line_11_form2439, -20_000);
  assertEquals(findOutput(result, "form4797"), undefined);
});

test("business loss reduced by insurance", () => {
  // Decline: $30,000, basis: $50,000, insurance: $10,000
  // Net loss = $30,000 - $10,000 = $20,000
  const result = compute({
    business_fmv_before: 80_000,
    business_fmv_after: 50_000,
    business_basis: 50_000,
    business_insurance: 10_000,
    business_is_section_1231: true,
  });
  const f4797 = findOutput(result, "form4797");
  assertEquals(f4797?.fields.ordinary_gain_form4684, -20_000);
});
