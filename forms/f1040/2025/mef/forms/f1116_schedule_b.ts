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

const combinedFieldsSchema = z.object({
  case: z.literal("combined_current_excess_prior_balance"),
  category: z.nativeEnum(IncomeCategory),
  current_year_excess_tax: z.number().int().positive(),
  prior_year_review: carryoverReviewSchema,
  prior_year_carryover: z.number().int().positive(),
  used_prior_year_carryover: z.literal(0),
  remaining_prior_year_carryover: z.number().int().positive(),
  prior_year_carryover_source: priorYearCarryoverSchema,
}).strict();

export const scheduleBFieldsSchema = z.discriminatedUnion("case", [
  currentYearExcessFieldsSchema,
  priorYearUseFieldsSchema,
  combinedFieldsSchema,
]);

const INDICATOR: Partial<Record<IncomeCategory, string>> = {
  [IncomeCategory.Passive]: "ForeignIncPassiveCategoryInd",
  [IncomeCategory.General]: "ForeignIncGeneralCategoryInd",
};

export function scheduleBPresentation(raw: unknown) {
  const fields = scheduleBFieldsSchema.parse(raw);
  const indicator = INDICATOR[fields.category];
  if (!indicator) {
    throw new Error("Form 1116 Schedule B category is unsupported");
  }
  if (fields.case !== "prior_year_use") {
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
    if (
      fields.prior_year_review.prior_year_schedule_b_line8_balance !==
        (fields.case === "combined_current_excess_prior_balance"
          ? fields.prior_year_carryover
          : 0)
    ) {
      throw new Error(
        "Form 1116 Schedule B carryback review balance does not match its prior-year source",
      );
    }
  }
  if (fields.case !== "current_year_excess") {
    if (
      fields.prior_year_carryover_source.income_category !==
        fields.category ||
      fields.prior_year_carryover_source
          .prior_year_schedule_b_line8_total !==
        fields.prior_year_carryover ||
      fields.used_prior_year_carryover +
            fields.remaining_prior_year_carryover !==
        fields.prior_year_carryover
    ) {
      throw new Error(
        "Form 1116 Schedule B prior-year balance and utilization do not reconcile",
      );
    }
    let capacity = fields.used_prior_year_carryover;
    const rows = [...fields.prior_year_carryover_source.vintages].sort(
      (a, b) => a.vintage_tax_year - b.vintage_tax_year,
    ).map((vintage) => {
      const amount = vintage.prior_year_schedule_b_line8_vintage_amount;
      const used = Math.min(amount, capacity);
      capacity -= used;
      return {
        year: vintage.vintage_tax_year,
        tag: vintage.vintage_tax_year === 2020
          ? "FifthPrecedingTYAmt"
          : vintage.vintage_tax_year === 2021
          ? "FourthPrecedingTYAmt"
          : vintage.vintage_tax_year === 2022
          ? "ThirdPrecedingTYAmt"
          : vintage.vintage_tax_year === 2023
          ? "SecondPrecedingTYAmt"
          : "FirstPrecedingTYAmt",
        amount,
        used,
        remaining: amount - used,
      };
    });
    return {
      case: fields.case,
      category: fields.category,
      indicator,
      balance: fields.prior_year_carryover,
      used: fields.used_prior_year_carryover,
      remaining: fields.remaining_prior_year_carryover,
      rows,
      amount: fields.case === "combined_current_excess_prior_balance"
        ? fields.current_year_excess_tax
        : 0,
    } as const;
  }
  return {
    case: fields.case,
    category: fields.category,
    indicator,
    amount: fields.current_year_excess_tax,
  } as const;
}

export const form1116ScheduleB: MefFormDescriptor<
  "form1116_schedule_b",
  z.infer<typeof scheduleBFieldsSchema> | readonly []
> = {
  pendingKey: "form1116_schedule_b",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116sb.pdf",
  build(raw) {
    if (Array.isArray(raw) && raw.length === 0) return "";
    const presentation = scheduleBPresentation(raw);
    if (presentation.case !== "current_year_excess") {
      const { indicator, balance, used, remaining, rows } = presentation;
      const currentExcess = presentation.case ===
          "combined_current_excess_prior_balance"
        ? presentation.amount
        : 0;
      return elements("IRS1116ScheduleB", [
        element(indicator, "X"),
        elements("ForeignTxCyovPrTYGrp", [
          ...rows.map((row) => element(row.tag, row.amount)),
          element("TotalAmt", balance),
        ]),
        elements("AdjForeignTxCyovPrTYGrp", [
          ...rows.map((row) => element(row.tag, row.amount)),
          element("TotalAmt", balance),
        ]),
        used > 0
          ? elements("ForeignTxCyovUsedCurrTYGrp", [
            ...rows.filter((row) => row.used > 0).map((row) =>
              element(row.tag, -row.used)
            ),
            element("TotalAmt", -used),
          ])
          : "",
        currentExcess > 0
          ? elements("ForeignTxCyovGenCurrTYGrp", [
            element("CurrentTaxYearAmt", currentExcess),
            element("TotalAmt", currentExcess),
          ])
          : "",
        elements("ForeignTxCyovFollowingTYGrp", [
          ...rows.map((row) => element(row.tag, row.remaining)),
          ...(currentExcess > 0
            ? [element("CurrentTaxYearAmt", currentExcess)]
            : []),
          element("TotalAmt", remaining + currentExcess),
        ]),
      ]);
    }
    const { indicator, amount } = presentation;
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
