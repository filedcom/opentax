import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  carryoverReviewSchema,
  IncomeCategory,
  priorYearCarryoverSchema,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

const currentYearExcessFieldsSchema = z.object({
  case: z.literal("current_year_excess"),
  category: z.nativeEnum(IncomeCategory),
  current_year_excess_tax: z.number().int().positive(),
  prior_year_review: carryoverReviewSchema,
}).strict();

const priorYearUseFieldsSchema = z.object({
  case: z.literal("prior_year_use"),
  category: z.nativeEnum(IncomeCategory),
  prior_year_carryover: z.number().int().positive(),
  used_prior_year_carryover: z.number().int().nonnegative(),
  remaining_prior_year_carryover: z.number().int().nonnegative(),
  prior_year_carryover_source: priorYearCarryoverSchema,
}).strict();

export const scheduleBFieldsSchema = z.discriminatedUnion("case", [
  currentYearExcessFieldsSchema,
  priorYearUseFieldsSchema,
]);

const INDICATOR: Partial<Record<IncomeCategory, string>> = {
  [IncomeCategory.Passive]: "ForeignIncPassiveCategoryInd",
  [IncomeCategory.General]: "ForeignIncGeneralCategoryInd",
};

export const form1116ScheduleB: MefFormDescriptor<
  "form1116_schedule_b",
  z.infer<typeof scheduleBFieldsSchema> | readonly []
> = {
  pendingKey: "form1116_schedule_b",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116sb.pdf",
  build(raw) {
    if (Array.isArray(raw) && raw.length === 0) return "";
    const fields = scheduleBFieldsSchema.parse(raw);
    const indicator = INDICATOR[fields.category];
    if (!indicator) {
      throw new Error("Form 1116 Schedule B category is unsupported");
    }
    if (fields.case === "prior_year_use") {
      if (
        fields.prior_year_carryover_source.income_category !==
          fields.category ||
        fields.prior_year_carryover_source
            .prior_year_schedule_b_line8_current_year_amount !==
          fields.prior_year_carryover ||
        fields.used_prior_year_carryover +
              fields.remaining_prior_year_carryover !==
          fields.prior_year_carryover
      ) {
        throw new Error(
          "Form 1116 Schedule B prior-year balance and utilization do not reconcile",
        );
      }
      const balance = fields.prior_year_carryover;
      const used = fields.used_prior_year_carryover;
      const remaining = fields.remaining_prior_year_carryover;
      return elements("IRS1116ScheduleB", [
        element(indicator, "X"),
        elements("ForeignTxCyovPrTYGrp", [
          element("FirstPrecedingTYAmt", balance),
          element("TotalAmt", balance),
        ]),
        elements("AdjForeignTxCyovPrTYGrp", [
          element("FirstPrecedingTYAmt", balance),
          element("TotalAmt", balance),
        ]),
        used > 0
          ? elements("ForeignTxCyovUsedCurrTYGrp", [
            element("FirstPrecedingTYAmt", -used),
            element("TotalAmt", -used),
          ])
          : "",
        elements("ForeignTxCyovFollowingTYGrp", [
          element("FirstPrecedingTYAmt", remaining),
          element("TotalAmt", remaining),
        ]),
      ]);
    }
    if (fields.prior_year_review.income_category !== fields.category) {
      throw new Error(
        "Form 1116 Schedule B category does not match its review",
      );
    }
    if (
      fields.prior_year_review.prior_year_form1116_line24_allowed_credit >
        fields.prior_year_review.prior_year_form1116_line23_limit
    ) {
      throw new Error(
        "Form 1116 Schedule B prior-year line 24 exceeds line 23",
      );
    }
    if (
      fields.prior_year_review.prior_year_form1116_line23_limit >
        fields.prior_year_review.prior_year_form1116_line24_allowed_credit
    ) {
      throw new Error(
        "Form 1116 Schedule B needs a resolved prior-year carryback",
      );
    }
    const amount = fields.current_year_excess_tax;
    return elements("IRS1116ScheduleB", [
      element(indicator, "X"),
      // With no previous carryover and no 2024 excess limitation, line 7 is
      // zero. Only the 2025-generated amount appears on lines 6 and 8.
      elements("ForeignTxCyovGenCurrTYGrp", [
        element("CurrentTaxYearAmt", amount),
        element("TotalAmt", amount),
      ]),
      elements("ForeignTxCyovFollowingTYGrp", [
        element("CurrentTaxYearAmt", amount),
        element("TotalAmt", amount),
      ]),
    ]);
  },
};
