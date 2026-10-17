import { inputSchema as f8936InputSchema } from "../../../../nodes/inputs/credits/individual/f8936/index.ts";
import { form8936Lines } from "./form8936/form8936_lines.ts";

/** Require retained Form 8936 transfer facts for Schedule 2 dealer repayments. */
export function assertSchedule2Form8936Repayment(
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule2 = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const newRepayment = schedule2?.line1b_new_clean_vehicle_repayment ?? 0;
  const usedRepayment = schedule2?.line1c_prev_owned_clean_vehicle_repayment ??
    0;
  const raw = pending.f8936;
  if (raw === undefined) {
    if (newRepayment !== 0 || usedRepayment !== 0) {
      throw new Error(
        "Schedule 2 dealer repayment differs from retained Form 8936",
      );
    }
    return;
  }
  const source = f8936InputSchema.parse(raw);
  const lines = form8936Lines(source, pending);
  if (lines === undefined && (newRepayment !== 0 || usedRepayment !== 0)) {
    throw new Error(
      "Schedule 2 dealer repayment differs from retained Form 8936",
    );
  }
}
