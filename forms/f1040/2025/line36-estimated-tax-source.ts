import { inputSchema as generalInputSchema } from "../nodes/inputs/general/index.ts";

export function assertLine36EstimatedTaxSource(
  filed: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const line36 = filed.line36_applied_to_2026_estimated_tax;
  const general = pending?.general;
  const rawElection = general !== null && typeof general === "object" &&
      !Array.isArray(general)
    ? (general as Record<string, unknown>)
      .apply_overpayment_to_2026_estimated_tax_amount
    : undefined;
  if (rawElection === undefined) {
    if (line36 !== undefined && line36 !== null) {
      throw new Error(
        "Form 1040 line 36 needs retained filer-owned election source",
      );
    }
    return;
  }
  const applied = generalInputSchema.parse(general)
    .apply_overpayment_to_2026_estimated_tax_amount!;
  const overpaid = filed.line34_overpayment;
  const refunded = filed.line35a_refund;
  const penalty = filed.line38_underpayment_penalty ?? 0;
  if (
    line36 !== applied ||
    typeof overpaid !== "number" || !Number.isSafeInteger(overpaid) ||
    typeof refunded !== "number" || !Number.isSafeInteger(refunded) ||
    typeof penalty !== "number" || !Number.isFinite(penalty) ||
    applied > Math.max(0, overpaid - Math.round(penalty)) ||
    refunded !== Math.max(0, overpaid - Math.round(penalty)) - applied ||
    (typeof filed.line37_amount_owed === "number" &&
      filed.line37_amount_owed > 0)
  ) {
    throw new Error(
      "Form 1040 line 36 and line 35a must match the retained election and available overpayment",
    );
  }
}
