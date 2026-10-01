import {
  calculateForm8994,
  inputSchema as form8994InputSchema,
} from "../nodes/inputs/f8994/index.ts";
import { inputSchema as scheduleCInputSchema } from "../nodes/inputs/schedule_c/model.ts";

/** Reconcile the direct-employer credit to the prepared proprietor and wages. */
export function reconcileForm8994DirectEmployer(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
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
  const businesses = scheduleCInputSchema.parse(pending.schedule_c).schedule_cs;
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
    (business.line_26_wages ?? 0) < paidWages ||
    business.line_26_other_employment_credits !== lines.line1
  ) {
    throw new Error(
      "Form 8994 credit and qualifying wages must reconcile to Schedule C line 26 deduction reduction",
    );
  }
  return { source, lines };
}
