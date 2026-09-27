import { z } from "zod";
import {
  form3800SpecifiedCreditLineSchema,
  form3800StandardCreditLineSchema,
  PassiveCreditReportingRoute,
} from "./credit-route.ts";

export enum PassiveCreditCategory {
  ActiveRental = "active_rental",
  RehabilitationOrPre1990Housing = "rehabilitation_or_pre1990_housing",
  LowIncomeHousing = "low_income_housing_post1989",
  Other = "other",
}

export enum PassiveCreditSourceOrigin {
  Self = "self",
  Partnership = "partnership",
  SCorporation = "s_corporation",
  Estate = "estate",
  Trust = "trust",
  Cooperative = "cooperative",
}

const passThroughOriginFields = {
  entity_reference: z.string().trim().min(1),
  ein: z.string().regex(/^\d{9}$/).optional(),
  missing_ein_reason: z.literal("APPLD FOR").optional(),
};

export const passiveCreditSourceOriginSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal(PassiveCreditSourceOrigin.Self) }).strict(),
  z.object({
    kind: z.literal(PassiveCreditSourceOrigin.Partnership),
    ...passThroughOriginFields,
  }).strict(),
  z.object({
    kind: z.literal(PassiveCreditSourceOrigin.SCorporation),
    ...passThroughOriginFields,
  }).strict(),
  z.object({
    kind: z.literal(PassiveCreditSourceOrigin.Estate),
    ...passThroughOriginFields,
  }).strict(),
  z.object({
    kind: z.literal(PassiveCreditSourceOrigin.Trust),
    ...passThroughOriginFields,
  }).strict(),
  z.object({
    kind: z.literal(PassiveCreditSourceOrigin.Cooperative),
    ...passThroughOriginFields,
  }).strict(),
]).superRefine((origin, ctx) => {
  if (
    origin.kind !== PassiveCreditSourceOrigin.Self &&
    (origin.ein === undefined) ===
      (origin.missing_ein_reason === undefined)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pass-through passive credit needs an EIN or APPLD FOR reason",
    });
  }
});

const creditSourceBaseSchema = z.object({
  activity_reference: z.string().trim().min(1),
  source_form: z.string().trim().min(1),
  source_document_reference: z.string().trim().min(1),
  source_statement_reference: z.string().trim().min(1).optional(),
  source_origin: passiveCreditSourceOriginSchema,
  category: z.nativeEnum(PassiveCreditCategory),
  current_year_credit: z.number().int().nonnegative(),
  prior_unallowed_credits: z.array(z.object({
    originating_tax_year: z.number().int().min(1900).max(2024),
    credit_amount: z.number().int().positive(),
    source_document_reference: z.string().trim().min(1),
    actively_participated_origin_year: z.boolean().optional(),
  })),
  publicly_traded_partnership: z.boolean(),
});

export const creditSourceSchema = z.discriminatedUnion("reporting_route", [
  creditSourceBaseSchema.extend({
    reporting_route: z.literal(PassiveCreditReportingRoute.Form3800Line3),
    form3800_credit_line: form3800StandardCreditLineSchema,
  }),
  creditSourceBaseSchema.extend({
    reporting_route: z.literal(PassiveCreditReportingRoute.Form3800Line24),
    form3800_credit_line: z.literal("3"),
  }),
  creditSourceBaseSchema.extend({
    reporting_route: z.literal(PassiveCreditReportingRoute.Form3800Line33),
    form3800_credit_line: form3800SpecifiedCreditLineSchema,
  }),
  creditSourceBaseSchema.extend({
    reporting_route: z.literal(PassiveCreditReportingRoute.Form8834),
    form3800_credit_line: z.never().optional(),
  }),
]).refine(
  (source) =>
    source.current_year_credit > 0 || source.prior_unallowed_credits.length > 0,
  { message: "Form 8582-CR source must have current or prior credit" },
).superRefine((source, ctx) => {
  if (
    source.reporting_route !== PassiveCreditReportingRoute.Form8834 &&
    source.current_year_credit > 0 &&
    (source.form3800_credit_line.startsWith("2") ||
      source.form3800_credit_line === "4y")
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["form3800_credit_line"],
      message:
        "Form 3800 carryover-only line cannot contain current-year credit",
    });
  }
  if (
    source.current_year_credit > 0 &&
    source.form3800_credit_line === "1e" &&
    (source.source_origin.kind === PassiveCreditSourceOrigin.Estate ||
      source.source_origin.kind === PassiveCreditSourceOrigin.Trust) &&
    !source.source_statement_reference
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["source_statement_reference"],
      message:
        "Estate/trust passive disabled-access credit needs its code ZZ statement reference",
    });
  }
  if (
    source.current_year_credit > 0 &&
    source.form3800_credit_line === "1i" &&
    (source.source_origin.kind === PassiveCreditSourceOrigin.Estate ||
      source.source_origin.kind === PassiveCreditSourceOrigin.Trust) &&
    !source.source_statement_reference
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["source_statement_reference"],
      message:
        "Estate/trust passive New Markets Credit needs its code ZZ statement reference",
    });
  }
});

export type PassiveCreditSource = z.infer<typeof creditSourceSchema>;

/** Same source identity plus Form 8582-CR worksheet 9 allocations. */
export const sourceAllocationSchema = creditSourceSchema.and(z.object({
  total_credit: z.number().int().nonnegative(),
  special_allowed_credit: z.number().int().nonnegative(),
  unallowed_credit: z.number().int().nonnegative(),
  allowed_credit: z.number().int().nonnegative(),
})).superRefine((source, ctx) => {
  if (
    source.total_credit !== source.current_year_credit +
        source.prior_unallowed_credits.reduce(
          (sum, credit) => sum + credit.credit_amount,
          0,
        ) ||
    source.allowed_credit + source.unallowed_credit !== source.total_credit ||
    source.special_allowed_credit > source.allowed_credit
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8582-CR source allocation does not reconcile",
    });
  }
});
