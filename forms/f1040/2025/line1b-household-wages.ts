import { inputSchema as householdWagesSchema } from "../nodes/inputs/household_wages/index.ts";

/** Reconcile Form 1040 line 1b with retained household wages not on W-2. */
export function assertLine1bHouseholdWageSource(
  pending: Record<string, unknown>,
): void {
  const source = pending.household_wages === undefined
    ? undefined
    : householdWagesSchema.parse(pending.household_wages);
  const expected = source?.household_wages.reduce(
    (sum, row) => sum + row.wages_received,
    0,
  ) ?? 0;
  const filed = (pending.f1040 as Record<string, unknown> | undefined)
    ?.line1b_household_wages ?? 0;
  const agi = (pending.agi_aggregator as Record<string, unknown> | undefined)
    ?.line1b_household_wages;
  if (
    !Number.isFinite(expected) || filed !== expected ||
    (expected > 0 && agi !== expected) ||
    (expected === 0 && agi !== undefined && agi !== 0)
  ) {
    throw new Error(
      "Form 1040 line 1b and AGI household wages differ from retained household-employment sources",
    );
  }
}
