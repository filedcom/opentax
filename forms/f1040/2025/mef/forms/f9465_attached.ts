import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import { inputSchema } from "../../../nodes/inputs/f9465/index.ts";
import type { MefBuildContext } from "../form-descriptor.ts";

const finalForm1040Schema = z.object({
  line37_amount_owed: z.number().refine(
    (amount) => Number.isSafeInteger(amount) && amount > 0,
  ),
  line34_overpayment: z.number().nonnegative().optional(),
  line35a_refund: z.number().nonnegative().optional(),
}).passthrough();

/** Staged source-to-native projection; not registered for return export. */
export function buildAttachedForm9465(
  raw: unknown,
  context: MefBuildContext,
): string {
  const source = inputSchema.parse(raw);
  const pending = context.pending;
  const pendingForm = pending?.f9465;
  const filer = context.filer;
  const final1040 = finalForm1040Schema.parse(pending?.f1040);
  if (
    !filer || filer.filingStatus !== FilingStatus.Single ||
    !filer.firstName || !filer.lastName ||
    !filer.nameControl?.trim() || !/^\d{9}$/.test(filer.primarySSN) ||
    pendingForm === undefined ||
    JSON.stringify(source) !== JSON.stringify(inputSchema.parse(pendingForm)) ||
    final1040.line37_amount_owed !== source.final_1040_line37_amount_owed ||
    (final1040.line34_overpayment ?? 0) > 0 ||
    (final1040.line35a_refund ?? 0) > 0
  ) {
    throw new Error(
      "Form 9465 attached request needs one identified filer and the exact positive final Form 1040 balance",
    );
  }
  const amount = source.final_1040_line37_amount_owed;
  const minimumMonthly = Math.ceil(amount / 72);
  return elements("IRS9465", [
    element("F9465TaxReturnTypeCd", "FORM 1040"),
    element("IATaxYrDt", 2025),
    elements("PersonFullName", [
      element("PersonFirstNm", filer.firstName),
      element("PersonLastNm", filer.lastName),
    ]),
    element("PrimaryNameControlTxt", filer.nameControl),
    element("PrimarySSN", filer.primarySSN),
    element("TaxDueAmt", amount),
    element("TotalBalanceDueAmt", amount),
    element("TotalTaxDueAmt", amount),
    element("CalculatedMonthlyPymtAmt", minimumMonthly),
    element("PaymentDueAmt", source.proposed_monthly_payment),
    element("PaymentDueDayNum", source.payment_due_day),
  ]);
}
