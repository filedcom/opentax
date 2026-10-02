import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { scheduleA } from "./schedule_a.ts";
import { purchasePointsCrossLoanFixture } from "../../../nodes/inputs/f1098/purchase_points_cross_loan.fixture.ts";

// Descriptor tests exercise source ownership; final bundle tests verify Copy B bytes.
const descriptorCopy = {
  file_name: "Test1098.pdf",
  pdf_sha256: "0".repeat(64),
  bytes: new Uint8Array(),
};

Deno.test("Schedule A native replays purchase points and the second mortgage", () => {
  const fixture = purchasePointsCrossLoanFixture();
  const source = {
    f1098s: fixture.f1098.map((item) => ({
      ...item,
      issuer_copy: descriptorCopy,
    })),
    ...fixture.f1098_purchase_points_cross_loan_review,
  };
  const fields = { line_8a_mortgage_interest_1098: 21_000 };
  const context = {
    filer: pointsFiler,
    pending: { f1098: source, f1040: { line12e_itemized_deductions: 21_000 } },
  };
  assertStringIncludes(
    scheduleA.build(fields, context),
    "<RptHomeMortgIntAndPointsAmt>21000</RptHomeMortgIntAndPointsAmt>",
  );
  assertThrows(
    () => scheduleA.build({ line_8a_mortgage_interest_1098: 21_001 }, context),
    Error,
    "exact sourced line 8a",
  );
  assertThrows(
    () =>
      scheduleA.build(fields, {
        ...context,
        pending: {
          ...context.pending,
          f1098: {
            ...source,
            f1098s: [source.f1098s[0], {
              ...source.f1098s[1],
              recipient_tin: "999-88-7777",
            }],
          },
        },
      }),
    Error,
    "same single filer",
  );
});

const pointsFiler = {
  primarySSN: "111223333",
  nameLine1: "Test Taxpayer",
  nameControl: "TAXP",
  address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};
const pointsSource = {
  f1098s: [{
    lender_name: "Home Lender",
    recipient_tin: "111-22-3333",
    source_document_reference: "2025 Form 1098 copy",
    box1_mortgage_interest: 18_000,
    box1_current_year_deductible_interest: 18_000,
    box1_deduction_workpaper_reference: "2025 interest workpaper",
    box6_points_paid: 2_400,
    box6_current_year_deductible_points: 2_400,
    box6_deduction_workpaper_reference: "2025 points workpaper",
    issuer_copy: descriptorCopy,
  }],
};

Deno.test("Schedule A native box 6 points require matching recipient and filed amount", () => {
  const fields = { line_8a_mortgage_interest_1098: 20_400 };
  const context = { filer: pointsFiler, pending: { f1098: pointsSource } };
  assertStringIncludes(
    scheduleA.build(fields, context),
    "<RptHomeMortgIntAndPointsAmt>20400</RptHomeMortgIntAndPointsAmt>",
  );
  assertThrows(
    () => scheduleA.build({ line_8a_mortgage_interest_1098: 2_399 }, context),
    Error,
    "less than sourced Form 1098 box 6",
  );
  assertThrows(
    () =>
      scheduleA.build(fields, {
        filer: pointsFiler,
        pending: {
          f1098: {
            f1098s: [{ ...pointsSource.f1098s[0], recipient_tin: "999887777" }],
          },
        },
      }),
    Error,
    "recipient must match",
  );
});

const itemized = { line_5a_state_income_tax: 8_000 };

Deno.test("Schedule A XML is omitted when finalized Form 1040 uses standard deduction", () => {
  const xml = scheduleA.build(itemized, {
    pending: { f1040: { line12a_standard_deduction: 15_750 } },
  });
  assertEquals(xml, "");
});

Deno.test("Schedule A XML is present when finalized Form 1040 itemizes", () => {
  const xml = scheduleA.build(itemized, {
    pending: { f1040: { line12e_itemized_deductions: 20_000 } },
  });
  assertStringIncludes(xml, "<IRS1040ScheduleA>");
});

Deno.test("standalone Schedule A descriptor retains its form-level rendering", () => {
  assertStringIncludes(scheduleA.build(itemized), "<IRS1040ScheduleA>");
});

Deno.test("Schedule A XML keeps elected capital-gain property fail-closed until Form 8283 filing is complete", () => {
  assertThrows(
    () =>
      scheduleA.build({
        line_12_noncash_contributions: 24_000,
        line_13_contribution_carryover: 5_000,
        charitable_limits_finalized: true,
        capital_gain_election_finalized: true,
      }, { pending: { f1040: { line12e_itemized_deductions: 29_000 } } }),
    Error,
    "filed Form 8283, complete Schedule A source",
  );
});

Deno.test("Schedule A refuses a prior noncash carryover without its carryover-year Form 8283 source", () => {
  const carryovers = [{
    contribution_id: "2024-land",
    contribution_year: 2024,
    original_category: "capital_gain_30",
    original_fmv: 20_000,
    adjusted_basis: 12_000,
    previously_deducted: 3_000,
    ordinary_carryover_rules_confirmed: true,
  }];
  const fields = {
    line_13_contribution_carryover: 9_000,
    charitable_limits_finalized: true,
    capital_gain_election_finalized: true,
  };
  assertThrows(
    () =>
      scheduleA.build({
        ...fields,
        capital_gain_property_carryovers: carryovers,
      }),
    Error,
    "completed previous-year Form 8283 copy",
  );
  assertThrows(
    () =>
      scheduleA.build(fields, {
        pending: {
          schedule_a: { capital_gain_property_carryovers: carryovers },
        },
      }),
    Error,
    "any previously required appraisal",
  );
});

Deno.test("Schedule A deducts the full Form 8396 line 3 even when the allowed credit is smaller", () => {
  const fields = {
    line_8a_mortgage_interest_1098: 15_000,
    form8396_interest_credit_reduction: 2_000,
    form8396_interest_reporting_line: "8a" as const,
  };
  const pending = {
    f1040: { line12e_itemized_deductions: 13_000 },
    form8396: { line3: 2_000, line9: 1_100, interest_reporting_line: "8a" },
  };
  const xml = scheduleA.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<RptHomeMortgIntAndPointsAmt>13000</RptHomeMortgIntAndPointsAmt>",
  );
  assertThrows(
    () =>
      scheduleA.build(fields, {
        pending: { ...pending, form8396: { line3: 1_100 } },
      }),
    Error,
    "differs from Form 8396 line 3",
  );
});
