import {
  calculateForm8941,
  inputSchema,
} from "../../../nodes/inputs/f8941/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../nodes/inputs/schedule_c/model.ts";
import { TS } from "../../../nodes/types.ts";
import type { FilerIdentity } from "../../../mef/header.ts";

/** Compare the one direct employer's wages and reduced premium deduction. */
export function reconcileForm8941ScheduleC(
  pending: Readonly<Record<string, unknown>>,
  filer?: FilerIdentity,
  appliedCredit?: number,
) {
  const source = inputSchema.parse(pending.f8941);
  const lines = calculateForm8941(source);
  const scheduleC = scheduleCInputSchema.parse(pending.schedule_c);
  if (scheduleC.schedule_cs.length !== 1) {
    throw new Error(
      "Form 8941 bounded route needs exactly one Schedule C business",
    );
  }
  const business = scheduleC.schedule_cs[0];
  const wages = source.employees.reduce(
    (sum, employee) => sum + employee.social_security_medicare_wages,
    0,
  );
  if (
    business.business_reference !== source.schedule_c_business_reference ||
    business.proprietor_recipient !== source.proprietor_recipient ||
    business.line_g_material_participation !== true ||
    business.line_d_ein?.replace(/\D/g, "") !== source.employment_ein ||
    business.line_26_wages !== wages
  ) {
    throw new Error(
      "Form 8941 payroll or premium deduction differs from Schedule C",
    );
  }
  if (appliedCredit !== undefined) {
    if (
      !Number.isInteger(appliedCredit) || appliedCredit < 0 ||
      appliedCredit > lines.line16 ||
      business.line_14_employee_benefits !==
        source.other_schedule_c_employee_benefits + lines.line4 - appliedCredit
    ) {
      throw new Error(
        "Form 8941 premium deduction differs from Form 3800 allowed credit",
      );
    }
  }
  if (filer) {
    const ownerSSN = source.proprietor_recipient === TS.T
      ? filer.primarySSN
      : filer.spouse?.ssn;
    if (ownerSSN !== source.owner_ssn) {
      throw new Error("Form 8941 owner SSN differs from Schedule C proprietor");
    }
  }
  return { source, lines };
}

/** Native/PDF preparation must use the same direct source as the pending graph. */
export function reconcileForm8941DocumentSource(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
  filer?: FilerIdentity,
) {
  const source = inputSchema.parse(raw);
  const filed = inputSchema.parse(pending.f8941);
  if (JSON.stringify(source) !== JSON.stringify(filed)) {
    throw new Error("Form 8941 source differs from filed return");
  }
  const form3800 = pending.f3800;
  if (
    !form3800 || typeof form3800 !== "object" ||
    !("f8941_direct_employer_credit" in form3800) ||
    !("form8941_applied_credit" in form3800) ||
    typeof form3800.form8941_applied_credit !== "number"
  ) {
    throw new Error("Form 8941 needs Form 3800 allowed-credit allocation");
  }
  const reconciled = reconcileForm8941ScheduleC(
    pending,
    filer,
    form3800.form8941_applied_credit,
  );
  const credit = form3800.f8941_direct_employer_credit;
  if (
    !credit || typeof credit !== "object" ||
    !("credit_amount" in credit) ||
    !("schedule_c_business_reference" in credit) ||
    !("shop_plan_reference" in credit) ||
    !("subject_to_passive_activity_limit" in credit) ||
    credit.credit_amount !== reconciled.lines.line16 ||
    credit.schedule_c_business_reference !==
      reconciled.source.schedule_c_business_reference ||
    credit.shop_plan_reference !== reconciled.source.shop_plan_reference ||
    credit.subject_to_passive_activity_limit !== false
  ) {
    throw new Error(
      "Form 8941 Form 3800 source credit differs from filed form",
    );
  }
  return reconciled;
}
