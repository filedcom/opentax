import { z } from "zod";
import { FilingStatus } from "../nodes/types.ts";
import {
  calculateForm8962WithPolicy,
  inputSchema as sharedInputSchema,
  validateForm8962AnnualCoverage,
} from "../nodes/intermediate/forms/credits/health/form8962/index.ts";
import { roundForm8962Amounts } from "../nodes/intermediate/forms/credits/health/form8962/money.ts";
import { form8962Policy2026 } from "./form8962-policy.ts";

const signedDollars = z.number().finite().int()
  .min(-Number.MAX_SAFE_INTEGER / 100).max(Number.MAX_SAFE_INTEGER / 100);
const amount = z.number().finite().nonnegative()
  .max(Number.MAX_SAFE_INTEGER / 100)
  .refine(
    (value) => value === Math.round(value * 100) / 100,
    "Form 1095-A amounts must be whole cents",
  );

/** Internal arithmetic input, not a public claim or evidence of eligibility.
 * A future source owner must derive family/income/coverage facts and line 11.
 * Special eligibility and worksheet routes are deliberately absent here.
 */
export const form8962CalculationInput2026Schema = sharedInputSchema.pick({
  annual_line11_eligible: true,
}).extend({
  household_size: z.number().int().positive().safe(),
  fpl_region: z.enum(["contiguous", "alaska", "hawaii"]),
  filing_status: z.enum([
    FilingStatus.Single,
    FilingStatus.MFJ,
    FilingStatus.HOH,
    FilingStatus.QSS,
  ]),
  taxpayer_modified_agi: signedDollars,
  dependents_modified_agi: signedDollars.nonnegative(),
  dependent_income_complete: z.literal(true),
  monthly_premiums: z.array(amount).length(12),
  monthly_slcsps: z.array(amount).length(12),
  monthly_aptcs: z.array(amount).length(12),
  annual_premium: amount.optional(),
  annual_slcsp: amount.optional(),
  annual_aptc: amount.optional(),
}).strict();

export type Form8962CalculationInput2026 = z.input<
  typeof form8962CalculationInput2026Schema
>;

/** Ordinary family-only monthly/annual arithmetic; not registered for filing.
 * Keep returned schedule amounts separate until current source owners and
 * AMT/credit-limit dependencies are connected to the 2026 graph.
 */
export function calculateForm8962_2026(raw: Form8962CalculationInput2026) {
  const input = form8962CalculationInput2026Schema.parse(raw);
  const householdIncome = input.taxpayer_modified_agi +
    input.dependents_modified_agi;
  signedDollars.parse(householdIncome);
  const fpl = form8962Policy2026.federalPovertyLevel(
    input.household_size,
    input.fpl_region,
  );
  signedDollars.parse(fpl);
  let hasPolicyAmounts = false;
  for (
    const [months, annual, label] of [
      [input.monthly_premiums, input.annual_premium, "premium"],
      [input.monthly_slcsps, input.annual_slcsp, "SLCSP"],
      [input.monthly_aptcs, input.annual_aptc, "APTC"],
    ] as const
  ) {
    const cents = months.reduce(
      (sum, value) => sum + Math.round(value * 100),
      0,
    );
    z.number().safe().int().parse(cents);
    amount.parse(cents / 100);
    if (annual !== undefined && Math.round(annual * 100) !== cents) {
      throw new Error(
        `2026 Form 8962 annual ${label} must reconcile to monthly source cents`,
      );
    }
    hasPolicyAmounts ||= cents > 0;
  }
  if (hasPolicyAmounts && householdIncome < fpl) {
    throw new Error(
      "2026 Form 8962 below-100% eligibility needs a current-year source route",
    );
  }
  // Keep source cents for reconciliation; round each actual form entry once.
  // Annual line 11 rounds the annual sums, not twelve rounded month entries.
  if (hasPolicyAmounts) validateForm8962AnnualCoverage(input);
  const calculationInput = input.annual_line11_eligible === true
    ? {
      ...input,
      monthly_premiums: undefined,
      monthly_slcsps: undefined,
      monthly_aptcs: undefined,
      annual_premium: roundForm8962Amounts(input.monthly_premiums),
      annual_slcsp: roundForm8962Amounts(input.monthly_slcsps),
      annual_aptc: roundForm8962Amounts(input.monthly_aptcs),
    }
    : {
      ...input,
      monthly_premiums: input.monthly_premiums.map((v) =>
        roundForm8962Amounts([v])
      ),
      monthly_slcsps: input.monthly_slcsps.map((v) =>
        roundForm8962Amounts([v])
      ),
      monthly_aptcs: input.monthly_aptcs.map((v) => roundForm8962Amounts([v])),
      annual_premium: undefined,
      annual_slcsp: undefined,
      annual_aptc: undefined,
    };
  const result = calculateForm8962WithPolicy(
    calculationInput,
    form8962Policy2026,
  );
  const fields =
    result.outputs.find((row) => row.nodeType === "form8962")!.fields;
  const line26 = z.number().nonnegative().parse(
    fields.net_premium_tax_credit ?? 0,
  );
  const line27 = z.number().nonnegative().parse(
    fields.excess_advance_payment ?? 0,
  );
  return {
    fields,
    schedule3: { line9_premium_tax_credit: line26 },
    schedule2: { line1a_excess_advance_premium: line27 },
    amt: { schedule2_line1z_tax: line27 },
  };
}
