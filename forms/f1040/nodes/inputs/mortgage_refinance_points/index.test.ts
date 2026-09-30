import { assertEquals, assertThrows } from "@std/assert";
import {
  assertRefinancePointsSource,
  inputSchema,
  mortgage_refinance_points,
  refinancePointsDeduction,
} from "./index.ts";

const refinance = {
  mortgage_id: "loan-1",
  recipient_tin: "111223333",
  lender_name: "Refinance Lender",
  form1098_source_document_reference: "2025 payer copy",
  closing_disclosure_reference: "2025 closing disclosure",
  pub936_workpaper_reference: "2025 Pub. 936 workpaper",
  refinance_close_month_2025: 6,
  prior_qualified_home_debt: 100_000,
  refinanced_principal: 100_000,
  loan_term_months: 180,
  total_points_charged: 3_000,
  points_for_nondeductible_services: 1_000,
  monthly_payment_records: [7, 8, 9, 10, 11, 12].map((month) => ({
    month,
    document_reference: `payment-${month}`,
  })),
  qualified_home_secured_verified: true as const,
  points_not_reported_in_box6_verified: true as const,
  points_paid_directly_verified: true as const,
  acquisition_debt_limit_verified: true as const,
};
const source = { refinances: [refinance] };
const form1098 = { f1098s: [{
  lender_name: refinance.lender_name,
  recipient_tin: refinance.recipient_tin,
  source_document_reference: refinance.form1098_source_document_reference,
  box1_mortgage_interest: 0,
}] };

Deno.test("ordinary refinance points amortize once and reconcile to line 8c", () => {
  assertEquals(refinancePointsDeduction(source), 67);
  const result = mortgage_refinance_points.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(source),
  );
  assertEquals(result.outputs[0].fields.line_8c_points_no_1098, 67);
  assertRefinancePointsSource(source, form1098, ["111-22-3333"], 67);
});

Deno.test("refinance points reject mismatched payer, owner, and filed amount", () => {
  assertThrows(
    () => assertRefinancePointsSource(source, undefined, ["111223333"], 67),
    Error,
    "linked payer-issued Form 1098",
  );
  assertThrows(
    () => assertRefinancePointsSource(source, form1098, ["999887777"], 67),
    Error,
    "recipient must match",
  );
  assertThrows(
    () => assertRefinancePointsSource(source, form1098, ["111223333"], 68),
    Error,
    "line 8c must equal",
  );
  assertThrows(
    () => assertRefinancePointsSource(source, { f1098s: [{
      ...form1098.f1098s[0],
      box6_points_paid: 100,
      box6_current_year_deductible_points: 0,
      box6_deduction_workpaper_reference: "2025 points workpaper",
    }] }, ["111223333"], 67),
    Error,
    "no box 6 points",
  );
});

Deno.test("refinance points reject cash-out, service fees, and payment gaps", () => {
  for (const change of [
    { refinanced_principal: 101_000 },
    { points_for_nondeductible_services: 3_000 },
    { monthly_payment_records: refinance.monthly_payment_records.filter((record) => record.month !== 9) },
    { monthly_payment_records: refinance.monthly_payment_records.map((record) => ({
      ...record,
      document_reference: "same payment",
    })) },
  ]) {
    assertEquals(inputSchema.safeParse({
      refinances: [{ ...refinance, ...change }],
    }).success, false);
  }
});
