import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { balanceSheetSchema, calculateBalanceSheet } from "./balance-sheet.ts";
import { ReportedFormCode, sectionCSchema } from "./section-c.ts";
import { sectionDSchema } from "./section-d.ts";
import { configForYear } from "../../../../config/index.ts";

export const NET_WORTH_THRESHOLD = 2_000_000;

/** The indexed amounts for an expatriation in a year (IRC §§877(a)(2)(A), 877A(a)(3)). */
export function form8854YearAmounts(expatriationDate: string): {
  averageTaxThreshold: number;
  markToMarketExclusion: number;
} {
  const cfg = configForYear(Number(expatriationDate.slice(0, 4)));
  return {
    averageTaxThreshold: cfg.expatriationAverageTaxThreshold,
    markToMarketExclusion: cfg.expatriationMarkToMarketExclusion,
  };
}

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

export const dateSchema = z.string().refine(
  validISODate,
  "Date must be valid ISO YYYY-MM-DD",
);

export const taxStatusSchema = z.enum([
  "FULL_YEAR_US_CITIZEN_OR_RESIDENT",
  "NONRESIDENT_OR_DUAL_STATUS",
]);

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

/** Part II Section A line 1: the five tax years before the expatriation year, nearest first. */
export const PRIOR_YEAR_TAX_KEYS = [
  "first_year_before",
  "second_year_before",
  "third_year_before",
  "fourth_year_before",
  "fifth_year_before",
] as const;

export const priorYearTaxSchema = z.object({
  first_year_before: moneySchema,
  second_year_before: moneySchema,
  third_year_before: moneySchema,
  fourth_year_before: moneySchema,
  fifth_year_before: moneySchema,
  year_2024: z.never().optional(),
  year_2023: z.never().optional(),
  year_2022: z.never().optional(),
  year_2021: z.never().optional(),
  year_2020: z.never().optional(),
});

const priorFiledReturnSchema = z.object({
  tax_year: z.number().int(),
  filed_form1040_document_id: z.string().trim().min(1),
  filed_form1040_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  form1040_line24_total_tax: moneySchema,
  schedule3_line1_foreign_tax_credit: moneySchema,
  irs_acceptance_reference: z.string().trim().min(1),
}).strict().refine(
  (source) =>
    source.schedule3_line1_foreign_tax_credit <=
      source.form1040_line24_total_tax,
  "Form 8854 prior-year foreign tax credit cannot exceed total tax",
);

export const inputSchema = z.object({
  // The initial statement is for the expatriation year; compute checks it is
  // the return year.
  expatriation_date: dateSchema,
  expatriate_type: z.nativeEnum(ExpatriateType),
  tax_status: taxStatusSchema,
  tax_status_2025: z.never().optional(),
  part_i: partISchema,
  prior_year_us_income_tax_less_foreign_tax_credit: priorYearTaxSchema,
  prior_year_filed_return_sources: z.array(priorFiledReturnSchema).length(5),
  balance_sheet: balanceSheetSchema,
  certified_tax_compliance: z.boolean(),
  exception_facts: exceptionFactsSchema,
  significant_asset_liability_changes_prior_5_years: z.boolean(),
  significant_change_explanation: z.string().trim().min(1).optional(),
  section_c: sectionCSchema.nullable(),
  section_d: sectionDSchema,
}).strict().superRefine((input, ctx) => {
  const expatriationYear = Number(input.expatriation_date.slice(0, 4));
  const priorYears = PRIOR_YEAR_TAX_KEYS.map((_, index) =>
    expatriationYear - 1 - index
  );
  const sourceYears = input.prior_year_filed_return_sources.map((row) =>
    row.tax_year
  );
  const sourceIds = input.prior_year_filed_return_sources.map((row) =>
    row.filed_form1040_document_id
  );
  const acceptanceRefs = input.prior_year_filed_return_sources.map((row) =>
    row.irs_acceptance_reference
  );
  const sourceDigests = input.prior_year_filed_return_sources.map((row) =>
    row.filed_form1040_sha256
  );
  if (
    new Set(sourceYears).size !== 5 ||
    priorYears.some((year) => !sourceYears.includes(year)) ||
    new Set(sourceIds).size !== 5 ||
    new Set(acceptanceRefs).size !== 5 ||
    new Set(sourceDigests).size !== 5
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Form 8854 needs five distinct filed ${
        expatriationYear - 5
      }-${expatriationYear - 1} return sources`,
      path: ["prior_year_filed_return_sources"],
    });
  }
  for (const source of input.prior_year_filed_return_sources) {
    const key = PRIOR_YEAR_TAX_KEYS[expatriationYear - 1 - source.tax_year];
    const reported = key === undefined
      ? undefined
      : input.prior_year_us_income_tax_less_foreign_tax_credit[key];
    if (
      reported !== source.form1040_line24_total_tax -
          source.schedule3_line1_foreign_tax_credit
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `Form 8854 ${source.tax_year} net tax differs from filed Form 1040 and Schedule 3`,
        path: ["prior_year_us_income_tax_less_foreign_tax_credit"],
      });
    }
  }
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
  if (
    citizen && partI.us_citizenship_acquisition !== "NATURALIZATION" &&
    input.section_c?.mark_to_market_assets.some((asset) =>
      asset.basis_irrevocable_election_h2
    )
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Section 877A(h)(2) basis election requires naturalization or long-term resident status",
      path: ["section_c", "mark_to_market_assets"],
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
  return PRIOR_YEAR_TAX_KEYS.reduce((sum, key) => sum + taxes[key], 0) / 5;
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
      form8854YearAmounts(input.expatriation_date).averageTaxThreshold ||
    calculateBalanceSheet(input.balance_sheet).netWorth >= NET_WORTH_THRESHOLD;
}

/** Scope the registered initial filing path before its MeF source reconciliation. */
export function assertForm8854FilingScope(rawInput: F8854Input): void {
  const input = inputSchema.parse(rawInput);
  if (input.tax_status !== "FULL_YEAR_US_CITIZEN_OR_RESIDENT") {
    throw new Error(
      "Initial Form 8854 nonresident or dual-status returns cannot use this Form 1040 MeF path",
    );
  }
  const covered = isCoveredExpatriate(input);
  if (input.section_d.elect_deferral && !covered) {
    throw new Error("Only covered expatriates can elect Section D deferral");
  }
  if (covered) {
    const section = input.section_c;
    if (
      section === null ||
      section.mark_to_market_assets.some((asset) =>
        asset.reported_form_code !== ReportedFormCode.Form8949
      ) ||
      section.eligible_deferred_compensation.length > 0 ||
      section.ineligible_deferred_compensation.length > 0 ||
      section.specified_tax_deferred_accounts.length > 0 ||
      section.nongrantor_trust_interests.length > 0
    ) {
      throw new Error(
        "Form 8854 covered filing needs reconciled income forms for non-Form 8949 Section C items",
      );
    }
  } else if (input.section_c !== null) {
    throw new Error("Noncovered Form 8854 cannot include Section C");
  }
}

class F8854Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8854";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(ctx: NodeContext, rawInput: F8854Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (!input.expatriation_date.startsWith(`${ctx.taxYear}-`)) {
      throw new Error(
        `Initial Form 8854 expatriation date must be in tax year ${ctx.taxYear}`,
      );
    }
    assertForm8854FilingScope(input);
    // Deemed gain is reported by the asset's income-form character. The
    // registered IRS8854 builder reconciles its identified Form 8949 rows.
    return { outputs: [] };
  }
}

export const f8854 = new F8854Node();
