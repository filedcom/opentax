import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm8611,
  f8611,
  itemSchema,
  recapturePercentage,
  RecaptureEventType,
} from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";

function owner(overrides: Record<string, unknown> = {}) {
  return itemSchema.parse({
    source_document_reference: "2025 Building A recapture worksheet",
    building_bin: "TX1234567",
    building_us_address: {
      line1: "10 Housing Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    placed_in_service_date: "2017-08-01",
    calculation: {
      source_type: "own_credit",
      recapture_event_type: RecaptureEventType.DISPOSITION,
      credit_year_first_claimed: 2017,
      recapture_year: 2025,
      line1_prior_form8586_credits: 30_000,
      line2_additions_to_qualified_basis_credits: 0,
      line6_qualified_basis_decrease_ratio: 1,
      line7_prior_accelerated_recapture_amount: 0,
      line11_interest_from_prior_years: 100,
      prior_unused_credits: 1_000,
      unused_additions_to_qualified_basis_credits: 0,
      ...overrides,
    },
  });
}

function flowThrough(overrides: Record<string, unknown> = {}) {
  return itemSchema.parse({
    source_document_reference: "2025 Partnership K-1 recapture statement",
    building_bin: "TX7654321",
    building_us_address: {
      line1: "20 Housing Way",
      city: "Austin",
      state: "TX",
      zip: "78702",
    },
    placed_in_service_date: "2018-01-01",
    calculation: {
      source_type: "pass_through",
      line8_flow_through_recapture: 2_000,
      line9_unused_accelerated_credit: 100,
      line11_interest_from_prior_years: 50,
      prior_unused_credits: 400,
      section42j5_partnership_interest_included: false,
      ...overrides,
    },
  });
}

Deno.test("Form 8611 uses the IRS printed recapture-percentage table", () => {
  for (const year of [2, 3, 10, 11]) {
    assertEquals(recapturePercentage(year), 0.333);
  }
  assertEquals(recapturePercentage(12), 0.267);
  assertEquals(recapturePercentage(13), 0.200);
  assertEquals(recapturePercentage(14), 0.133);
  assertEquals(recapturePercentage(15), 0.067);
  assertThrows(() => recapturePercentage(1));
  assertThrows(() => recapturePercentage(16));
});

Deno.test("Form 8611 owner lines include the unused-credit and interest adjustments", () => {
  const lines = calculateForm8611(owner());
  assertEquals(lines.line1, 30_000);
  assertEquals(lines.line3, 30_000);
  assertEquals(lines.line4, 0.333);
  assertEquals(lines.line7, 9_990);
  assertEquals(lines.line9, 333);
  assertEquals(lines.line10, 9_657);
  assertEquals(lines.line12, 9_757);
  assertEquals(lines.line13, 667);
  assertEquals(lines.line14, 9_090);
});

Deno.test("Form 8611 pass-through amount starts on line 8", () => {
  const lines = calculateForm8611(flowThrough());
  assertEquals(lines.line1, undefined);
  assertEquals(lines.line8, 2_000);
  assertEquals(lines.line10, 1_900);
  assertEquals(lines.line12, 1_950);
  assertEquals(lines.line13, 300);
  assertEquals(lines.line14, 1_650);
});

Deno.test("Form 8611 combines building line 14 amounts on Schedule 2 line 16", () => {
  const result = f8611.compute(
    { taxYear: 2025, formType: "f1040" },
    { f8611s: [owner(), flowThrough()] },
  );
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line16_lihtc_recapture,
    10_740,
  );
});

Deno.test("Form 8611 rejects missing source facts and inconsistent prior credits", () => {
  assertThrows(() => itemSchema.parse({
    ...owner(),
    building_bin: undefined,
  }));
  assertThrows(() => owner({
    line2_additions_to_qualified_basis_credits: 31_000,
  }));
  assertThrows(() => owner({
    line6_qualified_basis_decrease_ratio: 0.5,
  }));
  assertThrows(() => flowThrough({
    section42j5_partnership_interest_included: true,
  }));
});
