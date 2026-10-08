import { inputSchema as dividendSchema } from "../../../nodes/inputs/f1099div/index.ts";
import { inputSchema as interestSchema } from "../../../nodes/inputs/f1099int/index.ts";
import { inputSchema as oidSchema } from "../../../nodes/inputs/f1099oid/index.ts";

function total(value: unknown): number {
  if (value === undefined || value === null) return 0;
  const amounts = Array.isArray(value) ? value : [value];
  if (
    !amounts.every((amount) =>
      typeof amount === "number" && Number.isFinite(amount) && amount >= 0
    )
  ) {
    throw new Error("Tax-exempt interest needs finite nonnegative amounts");
  }
  return amounts.reduce((sum: number, amount: number) => sum + amount, 0);
}

/** Replay issued tax-exempt interest into both filed and retained totals. */
export function assertTaxExemptInterestSource(
  pending: Readonly<Record<string, unknown>>,
): void {
  const dividends = pending.f1099div === undefined
    ? []
    : dividendSchema.parse(pending.f1099div).f1099divs;
  const interest = pending.f1099int === undefined
    ? []
    : interestSchema.parse(pending.f1099int).f1099ints;
  const oid = pending.f1099oid === undefined
    ? []
    : oidSchema.parse(pending.f1099oid).f1099oids;
  const sourced = dividends.reduce(
    (sum, row) =>
      sum + (row.box12 ?? 0) -
      (row.isNominee ? row.nominee_distribution?.box12 ?? 0 : 0),
    0,
  ) + interest.reduce(
    (sum, row) => sum + (row.box8 ?? 0) - (row.box13 ?? 0),
    0,
  ) + oid.reduce(
    (sum, row) =>
      sum + (row.box11_tax_exempt_oid ?? 0) -
      (row.box6_applies_to === "tax_exempt_oid"
        ? row.box6_acquisition_premium ?? 0
        : 0) -
      (row.box10_applies_to === "tax_exempt_oid"
        ? row.box10_bond_premium ?? 0
        : 0),
    0,
  );
  if (!Number.isFinite(sourced) || sourced < 0) {
    throw new Error("Issued tax-exempt interest adjustments exceed sources");
  }
  const form1040 = pending.f1040 as Record<string, unknown> | undefined;
  const agi = pending.agi_aggregator as Record<string, unknown> | undefined;
  if (
    Math.abs(total(form1040?.line2a_tax_exempt) - sourced) >= 0.01 ||
    Math.abs(total(agi?.tax_exempt_interest) - sourced) >= 0.01
  ) {
    throw new Error(
      "Form 1040 line 2a and retained tax-exempt interest must match issued Forms 1099",
    );
  }
}
