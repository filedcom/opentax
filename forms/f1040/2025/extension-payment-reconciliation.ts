import { z } from "zod";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { inputSchema as extInputSchema } from "../nodes/inputs/ext/index.ts";

const printed = z.object({
  schedule3: z.object({
    line10_amount_paid_extension: z.number().optional(),
    line15_total: z.number().optional(),
  }).passthrough().optional(),
  f1040: z.object({
    line25d_total_withholding: z.number().optional(),
    line26_estimated_tax: z.number().optional(),
    line27_eitc: z.number().optional(),
    line28_actc: z.number().optional(),
    line29_refundable_aoc: z.number().optional(),
    line30_refundable_adoption: z.number().optional(),
    line31_additional_payments: z.number().optional(),
    line32_refundable_credits_total: z.number().optional(),
    line33_total_payments: z.number().optional(),
  }).passthrough().optional(),
}).passthrough();

const ssn = (value: string): string => value.replaceAll("-", "");

/** Reconcile the entered extension-payment record to the filed 2025 return. */
export function assertExtensionPaymentSource(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  const fields = printed.parse(pending);
  const line10 = fields.schedule3?.line10_amount_paid_extension ?? 0;
  const rawExt = pending.ext;
  if (line10 <= 0 && rawExt === undefined) return;
  if (!rawExt) {
    throw new Error(
      "Schedule 3 extension payment needs owner-matched ext source",
    );
  }
  const extension = extInputSchema.parse(rawExt);
  const evidence = extension.payment_evidence;
  const amount = extension.line_7_amount_paying ?? 0;
  if (line10 === 0 && amount === 0 && evidence === undefined) return;
  if (!filer) {
    throw new Error(
      "Schedule 3 extension payment needs owner-matched ext source",
    );
  }
  if (
    extension.produce_4868 !== "X" || amount <= 0 || !evidence ||
    evidence.amount !== amount || line10 !== amount ||
    ssn(evidence.primary_ssn) !== ssn(filer.primarySSN) ||
    (filer.filingStatus === FilingStatus.MarriedFilingJointly
      ? !filer.spouse?.ssn || !evidence.spouse_ssn ||
        ssn(evidence.spouse_ssn) !== ssn(filer.spouse.ssn)
      : evidence.spouse_ssn !== undefined)
  ) {
    throw new Error(
      "Schedule 3 extension payment source, owner, year, and line 10 must reconcile",
    );
  }
  const form = fields.f1040;
  const schedule3Total = fields.schedule3?.line15_total;
  const otherPayments = (form?.line27_eitc ?? 0) + (form?.line28_actc ?? 0) +
    (form?.line29_refundable_aoc ?? 0) +
    (form?.line30_refundable_adoption ?? 0);
  if (
    !form || schedule3Total === undefined || schedule3Total < amount ||
    form.line31_additional_payments !== schedule3Total ||
    form.line32_refundable_credits_total !==
      schedule3Total + otherPayments ||
    form.line33_total_payments !==
      (form.line25d_total_withholding ?? 0) +
        (form.line26_estimated_tax ?? 0) +
        (form.line32_refundable_credits_total ?? 0)
  ) {
    throw new Error(
      "Extension payment must reconcile through Schedule 3 and Form 1040 lines 31–33",
    );
  }
}
