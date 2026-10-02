import { inputSchema as form1099gSchema } from "../nodes/inputs/f1099g/index.ts";

/** Reconcile current-year payer copies to the filed Schedule 1 and Form 1040. */
export function assert1099GUnemploymentSource(
  pending: Record<string, unknown>,
): void {
  if (pending.f1099g === undefined) return;
  const rows = form1099gSchema.parse(pending.f1099g).f1099gs;
  const received = rows.reduce(
    (sum, row) => sum + (row.box_1_unemployment ?? 0),
    0,
  );
  const repaid = rows.reduce((sum, row) => sum + (row.box_1_repaid ?? 0), 0);
  if (received === 0 && repaid === 0) return;
  if (
    !Number.isSafeInteger(received) || !Number.isSafeInteger(repaid) ||
    repaid > received
  ) {
    throw new Error(
      "1099-G current-year unemployment and repayment need valid whole-dollar payer totals",
    );
  }
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  const form1040 = pending.f1040 as Record<string, unknown> | undefined;
  const line10 = schedule1?.line10_total_additional_income;
  const line8 = form1040?.line8_additional_income;
  if (
    schedule1?.line7_unemployment !== received - repaid ||
    typeof line10 !== "number" ||
    (line8 !== line10 && !(line10 === 0 && line8 === undefined))
  ) {
    throw new Error(
      "1099-G unemployment must reconcile to Schedule 1 line 7 and Form 1040 line 8",
    );
  }
}
