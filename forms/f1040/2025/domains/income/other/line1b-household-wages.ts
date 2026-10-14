import { inputSchema as householdWagesSchema } from "../../../../nodes/inputs/income/wages/household_wages/index.ts";

/** Reconcile Form 1040 line 1b with retained household wages not on W-2. */
export function assertLine1bHouseholdWageSource(
  pending: Record<string, unknown>,
): void {
  const source = pending.household_wages === undefined
    ? undefined
    : householdWagesSchema.parse(pending.household_wages);
  if (
    source?.household_wages.some((row) =>
      (row.federal_income_tax_withheld ?? 0) > 0
    )
  ) {
    throw new Error(
      "Household federal withholding must use a W-2 or Form 4852 line 1a source",
    );
  }
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
