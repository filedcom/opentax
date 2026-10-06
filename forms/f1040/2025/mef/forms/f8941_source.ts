import {
  calculateForm8941,
  commonControlForm8941Shares,
  inputSchema,
} from "../../../nodes/inputs/f8941/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../nodes/inputs/schedule_c/model.ts";
import { TS } from "../../../nodes/types.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import { inputSchema as generalInputSchema } from "../../../nodes/inputs/general/index.ts";

/** Compare the one direct employer's wages and reduced premium deduction. */
export function reconcileForm8941ScheduleC(
  pending: Readonly<Record<string, unknown>>,
  filer?: FilerIdentity,
  appliedCredit?: number,
) {
  const source = inputSchema.parse(pending.f8941);
  const lines = calculateForm8941(source);
  const scheduleC = scheduleCInputSchema.parse(pending.schedule_c);
  if ("group_members" in source) {
    const group = commonControlForm8941Shares(source);
    const reductions = scheduleC.form8941_premium_reductions;
    if (
      scheduleC.schedule_cs.length !== 2 || reductions?.length !== 2 ||
      group.shares.some((share) => share <= 0) ||
      (appliedCredit !== undefined &&
        (!Number.isInteger(appliedCredit) || appliedCredit < 0 ||
          appliedCredit > lines.line16))
    ) {
      throw new Error("Form 8941 common-control two-business return differs");
    }
    if (
      filer &&
      (filer.primarySSN !== source.owner_ssn ||
        (filer.fullName && filer.fullName !== source.owner_name))
    ) {
      throw new Error("Form 8941 common-control owner differs from filer");
    }
    source.group_members.forEach((member, index) => {
      const business = scheduleC.schedule_cs.find((item) =>
        item.business_reference === member.schedule_c_business_reference
      );
      const reduction = reductions.find((item) =>
        item.business_reference === member.schedule_c_business_reference
      );
      const wages = member.employees.reduce(
        (sum, employee) => sum + employee.social_security_medicare_wages,
        0,
      ) + (member.excluded_workers ?? []).reduce(
        (sum, worker) => sum + worker.actual_social_security_medicare_wages,
        0,
      );
      const paidExcluded = (member.excluded_workers ?? []).some((worker) =>
        worker.coverage_records.some((record) => record.employer_payment > 0)
      );
      if (
        !business || !reduction ||
        business.proprietor_recipient !== TS.T ||
        business.line_g_material_participation !== true ||
        business.line_d_ein?.replace(/\D/g, "") !== member.employment_ein ||
        business.line_26_wages !== wages ||
        (paidExcluded && member.other_schedule_c_employee_benefits !== 0) ||
        business.line_14_employee_benefits !==
          member.other_schedule_c_employee_benefits +
            group.memberPremiums[index] ||
        reduction.credit_amount !== group.shares[index]
      ) {
        throw new Error(
          "Form 8941 common-control payroll or full credit deduction differs from filed Schedule C",
        );
      }
    });
    if (
      source.group_members.some((member) =>
        (member.excluded_workers ?? []).some((worker) =>
          worker.exclusion === "proprietor" &&
          worker.coverage_records.some((record) => record.employer_payment > 0)
        )
      ) && pending.form7206 && typeof pending.form7206 === "object" &&
      "single_schedule_c_plan" in pending.form7206 &&
      pending.form7206.single_schedule_c_plan !== undefined
    ) {
      throw new Error(
        "Form 8941 common-control owner coverage needs separately reconciled Form 7206 source",
      );
    }
    return {
      source,
      lines,
      planReferences: undefined,
      groupBusinessReferences: source.group_members.map((member) =>
        member.schedule_c_business_reference
      ),
    };
  }
  if (scheduleC.schedule_cs.length !== 1) {
    throw new Error(
      "Form 8941 bounded route needs exactly one Schedule C business",
    );
  }
  const business = scheduleC.schedule_cs[0];
  const wages = source.employees.reduce(
    (sum, employee) => sum + employee.social_security_medicare_wages,
    0,
  ) + ("excluded_workers" in source
    ? (source.excluded_workers ?? []).reduce(
      (sum, worker) => sum + worker.actual_social_security_medicare_wages,
      0,
    )
    : 0);
  const excludedPaid = "excluded_workers" in source
    ? (source.excluded_workers ?? []).reduce(
      (sum, worker) =>
        sum + worker.coverage_records.reduce(
          (premium, record) => premium + record.employer_payment,
          0,
        ),
      0,
    )
    : 0;
  const ownerPaid = "excluded_workers" in source
    ? (source.excluded_workers ?? []).filter((worker) =>
      worker.exclusion === "proprietor"
    ).reduce((sum, worker) =>
      sum + worker.coverage_records.reduce(
        (premium, record) => premium + record.employer_payment,
        0,
      ), 0)
    : 0;
  const healthSource = pending.form7206;
  if (
    ownerPaid > 0 && healthSource && typeof healthSource === "object" &&
    "single_schedule_c_plan" in healthSource &&
    healthSource.single_schedule_c_plan !== undefined
  ) {
    throw new Error(
      "Form 8941 excluded proprietor coverage needs a separately reconciled Form 7206 source",
    );
  }
  if (
    business.business_reference !== source.schedule_c_business_reference ||
    business.proprietor_recipient !== source.proprietor_recipient ||
    business.line_g_material_participation !== true ||
    business.line_d_ein?.replace(/\D/g, "") !== source.employment_ein ||
    business.line_26_wages !== wages ||
    (excludedPaid > 0 && source.other_schedule_c_employee_benefits !== 0) ||
    business.line_14_employee_benefits !==
      source.other_schedule_c_employee_benefits + lines.line4
  ) {
    throw new Error(
      "Form 8941 payroll or premium deduction differs from Schedule C",
    );
  }
  const reductions = scheduleC.form8941_premium_reductions;
  if (
    !reductions || reductions.length !== 1 ||
    reductions[0].business_reference !== source.schedule_c_business_reference ||
    reductions[0].credit_amount !== lines.line16
  ) {
    throw new Error(
      "Form8941 premium reduction differs from determined source credit",
    );
  }
  if (appliedCredit !== undefined) {
    if (
      !Number.isInteger(appliedCredit) || appliedCredit < 0 ||
      appliedCredit > lines.line16
    ) {
      throw new Error(
        "Form 8941 tax-use allocation exceeds determined credit",
      );
    }
  }
  if (filer) {
    const ownerSSN = source.proprietor_recipient === TS.T
      ? filer.primarySSN
      : filer.spouse?.ssn;
    if (
      source.proprietor_recipient === TS.T && filer.fullName &&
      source.owner_name !== filer.fullName
    ) {
      throw new Error(
        "Form 8941 owner name differs from Schedule C proprietor",
      );
    }
    if (ownerSSN !== source.owner_ssn) {
      throw new Error("Form 8941 owner SSN differs from Schedule C proprietor");
    }
    if (
      "excluded_workers" in source &&
      (source.excluded_workers ?? []).some((worker) =>
        worker.exclusion === "owner_spouse" &&
        worker.employee_ssn !== filer.spouse?.ssn
      )
    ) {
      throw new Error(
        "Form 8941 excluded spouse differs from the filed spouse identity",
      );
    }
    if ("excluded_workers" in source) {
      const household = (source.excluded_workers ?? []).filter((worker) =>
        worker.exclusion === "owner_household_dependent"
      );
      if (household.length > 0) {
        const general = generalInputSchema.parse(pending.general);
        if (
          household.some((worker) =>
            !general.dependents?.some((dependent) =>
              dependent.ssn?.replaceAll("-", "") === worker.employee_ssn &&
              dependent.relationship === "other" &&
              dependent.months_in_home === 12 &&
              dependent.gross_income !== undefined &&
              dependent.gross_income < 5200 &&
              dependent.provided_over_half_own_support === false &&
              dependent.filed_joint_return_except_refund_only === false &&
              dependent.us_citizen_national_or_resident === true &&
              dependent.dependent_on_another_return !== true
            )
          )
        ) {
          throw new Error(
            "Form 8941 excluded household dependent differs from filed dependent evidence",
          );
        }
      }
    }
  }
  const planReferences = "offered_qhps" in source
    ? source.offered_qhps.map((p) => p.shop_plan_reference)
    : undefined;
  return { source, lines, planReferences, groupBusinessReferences: undefined };
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
  // The sole-source public route finalizes the actual section38 tax use.
  // Mixed-source allocations are independently reconciled by Form3800 preparation.
  if (
    "tax_context" in form3800 && form3800.tax_context &&
    typeof form3800.tax_context === "object" &&
    "specifiedCredit" in form3800.tax_context &&
    form3800.tax_context.specifiedCredit === reconciled.lines.line16 &&
    "specified_credit_allowed" in form3800 &&
    form3800.specified_credit_allowed !== form3800.form8941_applied_credit
  ) {
    throw new Error(
      "Form 8941 tax-use allocation differs from finalized Form3800",
    );
  }
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
    credit.subject_to_passive_activity_limit !== false ||
    JSON.stringify(
        "shop_plan_references" in credit
          ? credit.shop_plan_references
          : undefined,
      ) !== JSON.stringify(reconciled.planReferences) ||
    JSON.stringify(
        "group_business_references" in credit
          ? credit.group_business_references
          : undefined,
      ) !== JSON.stringify(reconciled.groupBusinessReferences)
  ) {
    throw new Error(
      "Form 8941 Form 3800 source credit differs from filed form",
    );
  }
  return reconciled;
}
