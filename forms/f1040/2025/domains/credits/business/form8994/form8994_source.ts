import {
  calculateForm8994,
  inputSchema as form8994InputSchema,
} from "../../../../../nodes/inputs/credits/business/f8994/index.ts";
import {
  inputSchema as scheduleCInputSchema,
  projectScheduleCItems,
} from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";

/** Reconcile the direct-employer credit to the prepared proprietor and wages. */
export function reconcileForm8994DirectEmployer(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
  appliedCredit?: number,
) {
  const source = form8994InputSchema.parse(raw);
  if (
    JSON.stringify(source) !==
      JSON.stringify(form8994InputSchema.parse(pending.f8994))
  ) {
    throw new Error("Form 8994 source differs from the prepared return");
  }
  const form1040 = pending.f1040 as Record<string, unknown> | undefined;
  if (
    typeof form1040?.taxpayer_ssn !== "string" ||
    form1040.taxpayer_ssn.replaceAll("-", "") !== source.proprietor_ssn
  ) {
    throw new Error("Form 8994 proprietor differs from finalized Form 1040");
  }
  const scheduleC = scheduleCInputSchema.parse(pending.schedule_c);
  const businesses = projectScheduleCItems(scheduleC);
  const matches = businesses.filter((business) =>
    business.business_reference === source.schedule_c_business_reference
  );
  if (
    matches.length !== 1 ||
    matches[0].proprietor_recipient !== "T" ||
    matches[0].line_g_material_participation !== true ||
    matches[0].line_d_ein !== source.employer_ein ||
    matches[0].statutory_employee === true ||
    matches[0].disposed_of_business === true
  ) {
    throw new Error(
      "Form 8994 needs one taxpayer-owned Schedule C employer with the same EIN",
    );
  }
  const business = matches[0];
  const lines = calculateForm8994(source);
  const paidWages = source.employees.reduce(
    (sum, employee) => sum + employee.employer_paid_qualifying_leave_wages,
    0,
  );
  if (
    business.line_26_wages !== source.other_schedule_c_wages + paidWages
  ) {
    throw new Error(
      "Form 8994 qualifying wages differ from Schedule C gross wage ledger",
    );
  }
  if (
    business.line_26_other_employment_credits !== lines.line1 ||
    scheduleC.form8994_wage_reductions?.length !== 1 ||
    scheduleC.form8994_wage_reductions[0].business_reference !==
      source.schedule_c_business_reference ||
    scheduleC.form8994_wage_reductions[0].credit_amount !== lines.line1
  ) {
    throw new Error(
      "Form 8994 Schedule C wage deduction reduction differs from full determined credit",
    );
  }
  if (
    appliedCredit !== undefined && (
      !Number.isInteger(appliedCredit) || appliedCredit < 0 ||
      appliedCredit > lines.line3 ||
      business.line_26_other_employment_credits !== lines.line1
    )
  ) {
    throw new Error(
      "Form 8994 Schedule C wage deduction reduction differs from full determined credit",
    );
  }
  return { source, lines };
}

/** Document and print projection require the same current-credit claim. */
export function reconcileForm8994DocumentSource(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const form3800 = pending.f3800;
  if (
    !form3800 || typeof form3800 !== "object" ||
    !("f8994_direct_employer_credit" in form3800) ||
    !("form8994_applied_credit" in form3800) ||
    typeof form3800.form8994_applied_credit !== "number"
  ) {
    throw new Error("Form 8994 needs Form 3800 allowed-credit allocation");
  }
  const reconciled = reconcileForm8994DirectEmployer(
    raw,
    pending,
    form3800.form8994_applied_credit,
  );
  const credit = form3800.f8994_direct_employer_credit;
  if (
    !credit || typeof credit !== "object" ||
    !("credit_amount" in credit) ||
    !("schedule_c_business_reference" in credit) ||
    !("schedule_c_wage_ledger_reference" in credit) ||
    !("subject_to_passive_activity_limit" in credit) ||
    credit.credit_amount !== reconciled.lines.line3 ||
    credit.schedule_c_business_reference !==
      reconciled.source.schedule_c_business_reference ||
    credit.schedule_c_wage_ledger_reference !==
      reconciled.source.schedule_c_wage_ledger_reference ||
    credit.subject_to_passive_activity_limit !== false
  ) {
    throw new Error(
      "Form 8994 Form 3800 source credit differs from filed form",
    );
  }
  return reconciled;
}
