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

const usAddressSchema = z.object({
  kind: z.literal("US"),
  line1: z.string().trim().min(1),
  line2: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1),
  state: z.string().regex(/^[A-Z]{2}$/),
  zip: z.string().regex(/^\d{5}(?:\d{4}|\d{7})?$/),
});

const foreignAddressSchema = z.object({
  kind: z.literal("FOREIGN"),
  line1: z.string().trim().min(1),
  line2: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  province_or_state: z.string().trim().min(1).optional(),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  postal_code: z.string().trim().min(1).optional(),
});

export const partISchema = z.object({
  mailing_address: z.discriminatedUnion("kind", [
    usAddressSchema,
    foreignAddressSchema,
  ]),
  telephone: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("US"), number: z.string().regex(/^\d{10}$/) }),
    z.object({
      kind: z.literal("FOREIGN"),
      number: z.string().regex(/^\d{1,30}$/),
    }),
  ]),
  foreign_residence_address: foreignAddressSchema.optional(),
  foreign_tax_residence_country_code: z.string().regex(/^[A-Z]{2}$/).optional(),
  notification: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("CITIZEN_STATE_DEPARTMENT"), date: dateSchema }),
    z.object({ kind: z.literal("LTR_HOMELAND_SECURITY"), date: dateSchema }),
    z.object({ kind: z.literal("LTR_DUAL_RESIDENT"), date: dateSchema }),
  ]),
  citizenships: z.array(z.object({
    country_code: z.string().regex(/^[A-Z]{2}$/),
    acquired_date: dateSchema,
  })).min(1).max(2),
  us_citizenship_acquisition: z.enum(["BIRTH", "NATURALIZATION"]).optional(),
  lawful_permanent_resident_date: dateSchema.optional(),
  lawful_permanent_resident_rescinded_date: dateSchema.optional(),
  permanent_resident_card_relinquished_date: dateSchema.optional(),
});

export const exceptionFactsSchema = z.object({
  dual_citizen: z.object({
    us_citizen_at_birth: z.boolean(),
    other_country_citizen_at_birth: z.boolean(),
    other_country_code: z.string().regex(/^[A-Z]{2}$/),
    other_country_citizen_at_expatriation: z.boolean(),
    other_country_tax_resident_at_expatriation: z.boolean(),
    us_resident_tax_years_in_last_15: z.number().int().min(0).max(15),
  }).nullable(),
  minor: z.object({
    date_of_birth: dateSchema,
    us_resident_tax_years_before_expatriation: z.number().int().min(0),
  }).nullable(),
});

const moneySchema = z.number().finite().nonnegative().refine(
  (amount) =>
    Number.isSafeInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
  "Form 8854 amounts must have safe cent precision",
);

export const priorYearTaxSchema = z.object({
  year_2024: moneySchema,
  year_2023: moneySchema,
  year_2022: moneySchema,
  year_2021: moneySchema,
  year_2020: moneySchema,
});

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
  part_i: partISchema,
  prior_year_us_income_tax_less_foreign_tax_credit: priorYearTaxSchema,
  net_worth_at_expatriation: z.number().nonnegative(),
  certified_tax_compliance: z.boolean(),
  exception_facts: exceptionFactsSchema,
  significant_asset_liability_changes_prior_5_years: z.boolean(),
  significant_change_explanation: z.string().trim().min(1).optional(),
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
  const partI = input.part_i;
  const citizen = input.expatriate_type === ExpatriateType.CITIZEN;
  if (
    citizen !==
      (partI.notification.kind === "CITIZEN_STATE_DEPARTMENT")
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8854 notification must match citizen or long-term resident status",
      path: ["part_i", "notification"],
    });
  }
  if (partI.notification.date !== input.expatriation_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Part I notification date must match the expatriation date",
      path: ["part_i", "notification", "date"],
    });
  }
  if (citizen && !partI.us_citizenship_acquisition) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Former citizens must state how U.S. citizenship was acquired",
      path: ["part_i", "us_citizenship_acquisition"],
    });
  }
  if (!citizen && partI.us_citizenship_acquisition) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Long-term residents cannot claim U.S. citizenship acquisition",
      path: ["part_i", "us_citizenship_acquisition"],
    });
  }
  const citizenshipCountryCodes = partI.citizenships.map((row) =>
    row.country_code
  );
  if (
    new Set(citizenshipCountryCodes).size !== citizenshipCountryCodes.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8854 citizenship countries must be unique",
      path: ["part_i", "citizenships"],
    });
  }
  if (citizen && !partI.citizenships.some((row) => row.country_code === "US")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Former citizens must list U.S. citizenship in Part I",
      path: ["part_i", "citizenships"],
    });
  }
  if (!citizen && !partI.lawful_permanent_resident_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Long-term residents must provide the lawful-permanent-resident date",
      path: ["part_i", "lawful_permanent_resident_date"],
    });
  }
  const exceptions = input.exception_facts;
  const dual = exceptions.dual_citizen;
  if (
    dual?.us_citizen_at_birth && partI.us_citizenship_acquisition !== "BIRTH"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Dual-citizen-at-birth facts require Part I citizenship by birth",
      path: ["part_i", "us_citizenship_acquisition"],
    });
  }
  if (
    dual?.other_country_citizen_at_expatriation &&
    !partI.citizenships.some((row) =>
      row.country_code === dual.other_country_code
    )
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Dual-citizen exception country must appear in Part I citizenships",
      path: ["part_i", "citizenships"],
    });
  }
  if (
    dual?.other_country_tax_resident_at_expatriation &&
    partI.foreign_tax_residence_country_code !== dual.other_country_code
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Dual-citizen exception country must match foreign tax residence",
      path: ["part_i", "foreign_tax_residence_country_code"],
    });
  }
  if (
    (exceptions.dual_citizen || exceptions.minor) &&
    input.expatriate_type !== ExpatriateType.CITIZEN
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "The dual-citizen and minor exceptions require relinquished U.S. citizenship",
      path: ["exception_facts"],
    });
  }
  if (
    exceptions.minor &&
    exceptions.minor.date_of_birth >= input.expatriation_date
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8854 birth date must precede expatriation",
      path: ["exception_facts", "minor", "date_of_birth"],
    });
  }
  if (
    input.significant_asset_liability_changes_prior_5_years &&
    !input.significant_change_explanation
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Significant asset or liability changes require an explanation",
      path: ["significant_change_explanation"],
    });
  }
});

export type F8854Input = z.infer<typeof inputSchema>;

export function averageAnnualNetIncomeTax(input: F8854Input): number {
  const taxes = input.prior_year_us_income_tax_less_foreign_tax_credit;
  return (
    taxes.year_2024 + taxes.year_2023 + taxes.year_2022 +
    taxes.year_2021 + taxes.year_2020
  ) / 5;
}

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

export function sectionAExceptionAnswers(rawInput: F8854Input) {
  const input = inputSchema.parse(rawInput);
  const dual = input.exception_facts.dual_citizen;
  const minor = input.exception_facts.minor;
  const dualCitizenBirth = Boolean(
    dual?.us_citizen_at_birth &&
      dual.other_country_citizen_at_birth &&
      dual.other_country_citizen_at_expatriation &&
      dual.other_country_tax_resident_at_expatriation,
  );
  const usResidentNoMoreThan10Of15 = dualCitizenBirth && dual
    ? dual.us_resident_tax_years_in_last_15 <= 10
    : undefined;
  const minorQualifies = Boolean(
    minor &&
      underEighteenAndHalf(minor.date_of_birth, input.expatriation_date) &&
      minor.us_resident_tax_years_before_expatriation <= 10,
  );
  return { dualCitizenBirth, usResidentNoMoreThan10Of15, minorQualifies };
}

export function isCoveredExpatriate(rawInput: F8854Input): boolean {
  const input = inputSchema.parse(rawInput);
  if (!input.certified_tax_compliance) return true;
  const answers = sectionAExceptionAnswers(input);
  if (answers.dualCitizenBirth && answers.usResidentNoMoreThan10Of15) {
    return false;
  }
  if (answers.minorQualifies) return false;
  return averageAnnualNetIncomeTax(input) >
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
