import {
  calculateForm8844,
  inputSchema as f8844InputSchema,
} from "../../../../nodes/inputs/f8844/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../../nodes/inputs/schedule_c/model.ts";
import { z } from "zod";

const form3800SourceSchema = z.object({
  f8844_direct_employer_credit: z.object({
    credit_amount: z.number().int().positive(),
    schedule_c_business_reference: z.string().trim().min(1),
    payroll_ledger_reference: z.string().trim().min(1),
    subject_to_passive_activity_limit: z.literal(false),
  }).strict(),
});

/** Reconcile a direct sole proprietor's payroll, deduction and Form 3800 source. */
export function reconcileForm8844DirectEmployer(
  pending: Readonly<Record<string, unknown>>,
) {
  const source = f8844InputSchema.parse(pending.f8844);
  const lines = calculateForm8844(source);
  if (lines.line2 <= 0) {
    throw new Error("Form 8844 direct employer has no current-year credit");
  }
  const credit = form3800SourceSchema.parse(pending.f3800)
    .f8844_direct_employer_credit;
  if (
    !credit || credit.credit_amount !== lines.line2 ||
    credit.schedule_c_business_reference !==
      source.schedule_c_business_reference ||
    credit.payroll_ledger_reference !== source.payroll_ledger_reference ||
    credit.subject_to_passive_activity_limit !== false
  ) {
    throw new Error(
      "Form 8844 direct-employer credit differs from Form 3800 source",
    );
  }
  const scheduleC = scheduleCInputSchema.parse(pending.schedule_c);
  const matches = scheduleC.schedule_cs.filter((business) =>
    business.business_reference === source.schedule_c_business_reference
  );
  if (
    matches.length !== 1 ||
    (matches[0].line_26_wages ?? 0) <
      source.f8844s.reduce((sum, item) => sum + item.qualified_zone_wages, 0) ||
    matches[0].line_26_other_employment_credits !== lines.line2
  ) {
    throw new Error(
      "Form 8844 payroll or wage deduction differs from linked Schedule C",
    );
  }
  return { source, lines };
}

/** Only this reviewed direct Schedule C input is eligible for native export. */
export function isSupportedForm8844DirectEmployerInput(
  fields: unknown,
): boolean {
  const parsed = f8844InputSchema.safeParse(fields);
  if (!parsed.success) return false;
  try {
    return calculateForm8844(parsed.data).line2 > 0;
  } catch {
    return false;
  }
}
