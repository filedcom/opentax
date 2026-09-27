import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// 2025 Form 8854 and instructions. The $206,000 average-tax threshold and
// $890,000 mark-to-market exclusion apply to TY2025, not the 2024 amounts.
export const AVG_ANNUAL_TAX_THRESHOLD_2025 = 206_000;
export const NET_WORTH_THRESHOLD = 2_000_000;
export const MARK_TO_MARKET_EXCLUSION_2025 = 890_000;

export enum ExpatriateType {
  CITIZEN = "CITIZEN",
  LONG_TERM_RESIDENT = "LONG_TERM_RESIDENT",
}

function validISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

const dateSchema = z.string().refine(
  validISODate,
  "Date must be valid ISO YYYY-MM-DD",
);

export const exceptionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("DUAL_CITIZEN_AT_BIRTH"),
    us_citizen_at_birth: z.boolean(),
    other_country_citizen_at_birth: z.boolean(),
    other_country_citizen_at_expatriation: z.boolean(),
    other_country_tax_resident_at_expatriation: z.boolean(),
    us_resident_tax_years_in_last_15: z.number().int().min(0).max(15),
  }),
  z.object({
    kind: z.literal("MINOR"),
    date_of_birth: dateSchema,
    us_resident_tax_years_before_expatriation: z.number().int().min(0),
  }),
]);

const moneySchema = z.number().finite().nonnegative().refine(
  (amount) =>
    Number.isSafeInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
  "Form 8854 asset amounts must have safe cent precision",
);

export const assetSchema = z.object({
  asset_id: z.string().trim().min(1),
  description: z.string().trim().min(1),
  fmv_at_expatriation: moneySchema,
  basis: moneySchema,
});

export const inputSchema = z.object({
  expatriation_date: dateSchema.refine(
    (date) => date.startsWith("2025-"),
    "This Form 8854 input covers initial expatriation in 2025 only",
  ),
  expatriate_type: z.nativeEnum(ExpatriateType),
  average_annual_tax_prior_5_years: z.number().nonnegative(),
  net_worth_at_expatriation: z.number().nonnegative(),
  certified_tax_compliance: z.boolean(),
  covered_expatriate_exception: exceptionSchema.optional(),
  assets: z.array(assetSchema).superRefine((assets, ctx) => {
    const ids = new Set<string>();
    for (const [index, asset] of assets.entries()) {
      if (ids.has(asset.asset_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate Form 8854 asset ID: ${asset.asset_id}`,
          path: [index, "asset_id"],
        });
      }
      ids.add(asset.asset_id);
    }
  }).optional(),
}).superRefine((input, ctx) => {
  const exception = input.covered_expatriate_exception;
  if (exception && input.expatriate_type !== ExpatriateType.CITIZEN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "The dual-citizen and minor exceptions require relinquished U.S. citizenship",
      path: ["covered_expatriate_exception"],
    });
  }
  if (
    exception?.kind === "MINOR" &&
    exception.date_of_birth >= input.expatriation_date
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8854 birth date must precede expatriation",
      path: ["covered_expatriate_exception", "date_of_birth"],
    });
  }
});

export type F8854Input = z.infer<typeof inputSchema>;

function underEighteenAndHalf(
  dateOfBirth: string,
  expatriationDate: string,
): boolean {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const cutoffMonth = birth.getUTCMonth() + 6;
  const cutoffYear = birth.getUTCFullYear() + 18 + Math.floor(cutoffMonth / 12);
  const month = cutoffMonth % 12;
  const lastDayOfMonth = new Date(Date.UTC(cutoffYear, month + 1, 0))
    .getUTCDate();
  const cutoff = new Date(Date.UTC(
    cutoffYear,
    month,
    Math.min(birth.getUTCDate(), lastDayOfMonth),
  ));
  return new Date(`${expatriationDate}T00:00:00Z`) < cutoff;
}

export function isCoveredExpatriate(rawInput: F8854Input): boolean {
  const input = inputSchema.parse(rawInput);
  if (!input.certified_tax_compliance) return true;
  const exception = input.covered_expatriate_exception;
  if (exception?.kind === "DUAL_CITIZEN_AT_BIRTH") {
    if (
      exception.us_citizen_at_birth &&
      exception.other_country_citizen_at_birth &&
      exception.other_country_citizen_at_expatriation &&
      exception.other_country_tax_resident_at_expatriation &&
      exception.us_resident_tax_years_in_last_15 <= 10
    ) return false;
  }
  if (exception?.kind === "MINOR") {
    if (
      underEighteenAndHalf(exception.date_of_birth, input.expatriation_date) &&
      exception.us_resident_tax_years_before_expatriation <= 10
    ) return false;
  }
  return input.average_annual_tax_prior_5_years >
      AVG_ANNUAL_TAX_THRESHOLD_2025 ||
    input.net_worth_at_expatriation >= NET_WORTH_THRESHOLD;
}

class F8854Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8854";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: F8854Input): NodeResult {
    inputSchema.parse(rawInput);
    // A deemed gain is income reported by asset character on Form 8949,
    // Form 4797, Schedule E, etc. It is not a dollar-for-dollar Schedule 2 tax.
    // Filing also requires an IRS8854 attachment, which is not built yet.
    throw new Error(
      "Form 8854 is not filing-ready: asset-specific deemed gain reporting and the IRS8854 attachment are required",
    );
  }
}

export const f8854 = new F8854Node();
