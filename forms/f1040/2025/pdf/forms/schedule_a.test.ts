import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { scheduleAPdf } from "./schedule_a.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { purchasePointsCrossLoanFixture } from "../../../nodes/inputs/f1098/purchase_points_cross_loan.fixture.ts";

Deno.test("Schedule A PDF replays purchase points and the second mortgage", () => {
  const fixture = purchasePointsCrossLoanFixture();
  const source = {
    f1098s: fixture.f1098,
    ...fixture.f1098_purchase_points_cross_loan_review,
  };
  const filer = {
    primarySSN: "111223333",
    nameLine1: "Test Taxpayer",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
  };
  const pending = {
    f1040: { line12e_itemized_deductions: 21_000 },
    f1098: source,
  };
  const [instance] = scheduleAPdf.instances?.(
    { line_8a_mortgage_interest_1098: 21_000 },
    filer,
    pending,
  ) ?? [];
  assertEquals(instance?.line_8a_mortgage_interest_1098, 21_000);
  assertThrows(
    () =>
      scheduleAPdf.instances?.(
        { line_8a_mortgage_interest_1098: 21_001 },
        filer,
        pending,
      ),
    Error,
    "exact sourced line 8a",
  );
  assertThrows(
    () =>
      scheduleAPdf.instances?.(
        { line_8a_mortgage_interest_1098: 21_000 },
        filer,
        {
          ...pending,
          f1098: {
            ...source,
            f1098s: [source.f1098s[0], {
              ...source.f1098s[1],
              recipient_tin: "999-88-7777",
            }],
          },
        },
      ),
    Error,
    "same single filer",
  );
});

Deno.test("Schedule A PDF box 6 points reject a wrong recipient or missing filed amount", () => {
  const filer = {
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
  const source = {
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
    }],
  };
  const pending = {
    f1040: { line12e_itemized_deductions: 20_400 },
    f1098: source,
  };
  const [instance] = scheduleAPdf.instances?.(
    { line_8a_mortgage_interest_1098: 20_400 },
    filer,
    pending,
  ) ?? [];
  assertEquals(instance?.line_8a_mortgage_interest_1098, 20_400);
  assertThrows(
    () =>
      scheduleAPdf.instances?.(
        { line_8a_mortgage_interest_1098: 2_399 },
        filer,
        { ...pending, f1040: { line12e_itemized_deductions: 2_399 } },
      ),
    Error,
    "less than sourced Form 1098 box 6",
  );
  assertThrows(
    () =>
      scheduleAPdf.instances?.(
        { line_8a_mortgage_interest_1098: 20_400 },
        filer,
        {
          ...pending,
          f1098: {
            f1098s: [{ ...source.f1098s[0], recipient_tin: "999887777" }],
          },
        },
      ),
    Error,
    "recipient must match",
  );
});

Deno.test("Schedule A PDF rejects a finalized capital-gain election without reconciled Form 8283 source", () => {
  assertThrows(
    () =>
      scheduleAPdf.includeWhen?.({
        line_12_noncash_contributions: 24_000,
        line_13_contribution_carryover: 5_000,
        charitable_limits_finalized: true,
        capital_gain_election_finalized: true,
      }, { f1040: { line12e_itemized_deductions: 29_000 } }),
    Error,
    "complete Schedule A source",
  );
  assertEquals(
    scheduleAPdf.includeWhen?.({ capital_gain_election_finalized: true }, {
      f1040: { line12a_standard_deduction: 15_750 },
    }),
    false,
  );
});

Deno.test("Schedule A PDF prints the ordinary gift on the official line 12 widget", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-ordinary-noncash-gift"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const [instance] = scheduleAPdf.instances?.(
    result.pending.schedule_a,
    fixture.filer,
    result.pending,
  ) ?? [];
  assertEquals(instance?.filer_name, "ALEX EXAMPLE");
  assertEquals(instance?.line_5e_salt_deduction, 24_000);
  assertEquals(instance?.line_12_noncash_contributions, 1_200);
  assertEquals(instance?.line_17_itemized, 37_200);
  assertEquals(
    scheduleAPdf.fields.find((field) =>
      field.domainKey === "line_12_noncash_contributions"
    )?.pdfField,
    "form1[0].Page1[0].f1_24[0]",
  );
});
