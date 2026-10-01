import { inputSchema as f8288InputSchema } from "../nodes/inputs/f8288/index.ts";

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
  const filed = fields.line25c_total;
  if (
    typeof filed !== "number" || !Number.isFinite(filed) ||
    filed + 0.01 < withheld
  ) {
    throw new Error(
      "Form 1040 line 25c is less than sourced Form 8288-A withholding",
    );
  }
}
