import { f1099r } from "../nodes/inputs/f1099r/index.ts";

/** Bind the distinct retirement contribution, including substitute copies once. */
export function assertRetirementStateLocalTaxSource(
  pending: Readonly<Record<string, unknown>> | undefined,
  fields: { retirement_state_local_withholding?: number | null },
): void {
  const items = pending?.f1099r === undefined
    ? []
    : f1099r.inputSchema.parse(pending.f1099r).f1099rs;
  const expected = items.filter((item) =>
    item.no_distribution_received !== true
  )
    .reduce(
      (sum, item) =>
        sum + (item.box14_state_tax ?? 0) + (item.box17_local_tax ?? 0),
      0,
    );
  if (
    Math.abs(expected - (fields.retirement_state_local_withholding ?? 0)) >
      0.0000001
  ) {
    throw new Error(
      "Schedule A retirement withholding differs from actual Form1099R sources",
    );
  }
}
