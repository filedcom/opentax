import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8611 } from "./f8611.ts";

const owner = {
  source_document_reference: "2025 Building A recapture worksheet",
  recapture_year: 2025,
  building_bin: "TX1234567",
  building_us_address: {
    line1: "10 Housing Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  placed_in_service_date: "2017-08-01",
  financed_with_tax_exempt_bonds: false,
  calculation: {
    source_type: "own_credit",
    recapture_event_type: "DISPOSITION",
    credit_period_start_year: 2017,
    recapture_required_after_exceptions: true,
    line1_prior_form8586_credits: 30_000,
    line2_worksheets: [],
    line6_qualified_basis_decrease_ratio: 1,
    line7_prior_accelerated_recapture_amount: 0,
    line11_interest_from_prior_years: 100,
    prior_unused_credits: 1_000,
    unused_additions_to_qualified_basis_credits: 0,
  },
};

Deno.test("Form 8611 emits one source-backed document per building", () => {
  const xml = form8611.build({
    f8611s: [owner, {
      ...owner,
      building_bin: "TX7654321",
      source_document_reference: "2025 Building B recapture worksheet",
    }],
  });
  assertEquals(xml.length, 2);
  assertStringIncludes(xml[0], "<BuildingUSAddress>");
  assertStringIncludes(xml[0], "<BIN>TX1234567</BIN>");
  assertStringIncludes(
    xml[0],
    "<CreditRecapturePercentRt>0.333</CreditRecapturePercentRt>",
  );
  assertStringIncludes(xml[0], "<RecaptureTaxAmt>9090</RecaptureTaxAmt>");
});

Deno.test("Form 8611 reconciles line 14 totals with Schedule 2 line 16", () => {
  const input = { f8611s: [owner] };
  assertEquals(
    form8611.build(input, {
      pending: { schedule2: { line16_lihtc_recapture: 9_090 } },
    }).length,
    1,
  );
  assertThrows(
    () =>
      form8611.build(input, {
        pending: { schedule2: { line16_lihtc_recapture: 9_091 } },
      }),
    Error,
    "differs from Schedule 2 line 16",
  );
});
