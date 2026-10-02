import { inputSchema as f8288InputSchema } from "../nodes/inputs/f8288/index.ts";
import { inputSchema as w2gInputSchema } from "../nodes/inputs/w2g/index.ts";

/** Keep Form 8288-A withholding in the 2025 Form 1040 other-forms bucket. */
export function assertF8288OtherWithholding(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (pending?.f8288 === undefined) return;
  const source = f8288InputSchema.parse(pending.f8288);
  const withheld = source.f8288s.reduce(
    (total, row) => total + row.amount_withheld,
    0,
  );
  if (withheld === 0) return;
  const gamblingWithheld = pending.w2g === undefined
    ? 0
    : w2gInputSchema.parse(pending.w2g).w2gs.reduce(
      (total, row) => total + (row.box4_federal_withheld ?? 0),
      0,
    );
  const filed = fields.line25c_total;
  if (
    typeof filed !== "number" || !Number.isFinite(filed) ||
    filed + 0.01 < withheld + gamblingWithheld
  ) {
    throw new Error(
      gamblingWithheld > 0
        ? "Form 1040 line 25c is less than combined sourced Form 8288-A and W-2G withholding"
        : "Form 1040 line 25c is less than sourced Form 8288-A withholding",
    );
  }
}
