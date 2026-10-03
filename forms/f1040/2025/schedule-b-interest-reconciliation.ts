import {
  inputSchema as scheduleBSchema,
  line4TaxableInterest,
  totalTaxableInterest,
} from "../nodes/intermediate/aggregation/schedule_b/index.ts";

/** Reconcile finalized Schedule B taxable interest to Form 1040 and AGI. */
export function assertScheduleBInterestJoin(
  pending: Readonly<Record<string, unknown>>,
): void {
  const scheduleB = pending.schedule_b === undefined
    ? undefined
    : scheduleBSchema.parse(pending.schedule_b);
  const form1040 = pending.f1040 as Record<string, unknown> | undefined;
  const agi = pending.agi_aggregator as Record<string, unknown> | undefined;
  const line2b = form1040?.line2b_taxable_interest ?? 0;
  const line4 = scheduleB === undefined ? 0 : line4TaxableInterest(scheduleB);
  const line2 = scheduleB === undefined ? 0 : totalTaxableInterest(scheduleB);
  if (scheduleB && (scheduleB.ee_bond_exclusion ?? 0) > line2) {
    throw new Error("Schedule B savings bond exclusion exceeds interest");
  }
  if (
    typeof line2b !== "number" || !Number.isFinite(line2b) || line2b < 0 ||
    typeof line4 !== "number" || !Number.isFinite(line4) || line4 < 0 ||
    Math.abs(line2b - line4) >= 0.01
  ) {
    throw new Error(
      "Form 1040 line 2b must equal Schedule B line 4 taxable interest",
    );
  }
  if (line4 > 0 && agi?.line2b_taxable_interest === undefined) {
    throw new Error(
      "Retained AGI taxable interest must equal Schedule B line 4",
    );
  }
  if (agi?.line2b_taxable_interest !== undefined) {
    const agiInterest = agi.line2b_taxable_interest;
    if (
      typeof agiInterest !== "number" || !Number.isFinite(agiInterest) ||
      Math.abs(agiInterest - line4) >= 0.01
    ) {
      throw new Error(
        "Retained AGI taxable interest must equal Schedule B line 4",
      );
    }
  }
}
