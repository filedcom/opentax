import {
  ForRouting,
  inputSchema as f1098InputSchema,
} from "../nodes/inputs/f1098/index.ts";

/** Reconcile the one reviewed second-home houseboat interest source to AMT line 3. */
export function assertForm6251HouseboatInterestSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const amount = fields.line3_houseboat_interest_addback;
  const source = f1098InputSchema.safeParse(pending?.f1098);
  const hasReview = source.success &&
    source.data.f1098s.some((item) =>
      item.amt_houseboat_second_home_review !== undefined
    );
  if (amount === undefined && !hasReview) return;
  const item = source.success ? source.data.f1098s[0] : undefined;
  const scheduleA = pending?.schedule_a as Record<string, unknown> | undefined;
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const schedule2 = pending?.schedule2 as Record<string, unknown> | undefined;
  const amt = fields.line11_amt;
  if (
    typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 ||
    !source.success || source.data.f1098s.length !== 1 || !item ||
    !item.amt_houseboat_second_home_review ||
    (item.for_routing ?? ForRouting.A) !== ForRouting.A ||
    !item.source_document_reference || !item.lender_name ||
    !item.recipient_tin || !item.box1_deduction_workpaper_reference ||
    item.box1_mortgage_interest <= 0 ||
    item.box1_current_year_deductible_interest !==
      item.box1_mortgage_interest ||
    (item.box6_points_paid ?? 0) !== 0 ||
    (item.box6_current_year_deductible_points ?? 0) !== 0 ||
    source.data.mortgage_limit_review !== undefined ||
    source.data.purchase_points_cross_loan_review !== undefined ||
    source.data.cashout_refinance_review !== undefined ||
    fields.filing_status !== "single" ||
    fields.taking_standard_deduction !== false ||
    fields.line3_form8864_income_exclusion !== undefined ||
    amount !== item.box1_mortgage_interest ||
    scheduleA?.line_8a_mortgage_interest_1098 !== amount ||
    (scheduleA?.line_8b_mortgage_interest_no_1098 ?? 0) !== 0 ||
    (scheduleA?.line_8c_points_no_1098 ?? 0) !== 0 ||
    (scheduleA?.form8396_interest_credit_reduction ?? 0) !== 0 ||
    typeof form1040?.taxpayer_ssn !== "string" ||
    form1040.taxpayer_ssn.replaceAll("-", "") !==
      item.recipient_tin.replaceAll("-", "") ||
    typeof form1040.line12e_itemized_deductions !== "number" ||
    form1040.line12e_itemized_deductions < amount ||
    (form1040.line12a_standard_deduction ?? 0) !== 0 ||
    form1040.line15_taxable_income !== fields.regular_taxable_income ||
    typeof amt !== "number" || amt <= 0 ||
    schedule2?.line2_amt !== amt ||
    typeof form1040.line17_additional_taxes !== "number" ||
    form1040.line17_additional_taxes < amt
  ) {
    throw new Error(
      "Form 6251 houseboat mortgage-interest addback needs the same reviewed 1098, itemized Schedule A, and final AMT return",
    );
  }
}
