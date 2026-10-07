import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  carryoverReviewSchema,
  categorySummarySchema,
  IncomeCategory,
  priorYearCarryoverSchema,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { assertForm1116CarryoverSource } from "../../form1116_carryover_source.ts";

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
  remaining_prior_year_carryover: z.number().int().nonnegative(),
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
      const expired = vintage.vintage_tax_year === 2015 ? amount - used : 0;
      return {
        year: vintage.vintage_tax_year,
        tag: vintage.vintage_tax_year === 2015
          ? "TenthPrecedingTYAmt"
          : vintage.vintage_tax_year === 2016
          ? "NinthPrecedingTYAmt"
          : vintage.vintage_tax_year === 2017
          ? "EighthPrecedingTYAmt"
          : vintage.vintage_tax_year === 2018
          ? "SeventhPrecedingTYAmt"
          : vintage.vintage_tax_year === 2019
          ? "SixthPrecedingTYAmt"
          : vintage.vintage_tax_year === 2020
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
        expired,
        remaining: amount - used - expired,
      };
    });
    const expired = rows.reduce((sum, row) => sum + row.expired, 0);
    if (
      capacity !== 0 ||
      fields.used_prior_year_carryover +
            fields.remaining_prior_year_carryover + expired !==
        fields.prior_year_carryover
    ) {
      throw new Error(
        "Form 1116 Schedule B prior-year balance, use, and expiry do not reconcile",
      );
    }
    return {
      case: fields.case,
      category: fields.category,
      indicator,
      balance: fields.prior_year_carryover,
      used: fields.used_prior_year_carryover,
      expired,
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
  build(raw, context) {
    if (Array.isArray(raw) && raw.length === 0) return "";
    const presentation = scheduleBPresentation(raw);
    const pending = context?.pending;
    if (
      presentation.case !== "current_year_excess" &&
      (pending?.f1040 !== undefined ||
        pending?.form1116_prior_carryover !== undefined)
    ) {
      const parsed = scheduleBFieldsSchema.parse(raw);
      if (parsed.case === "current_year_excess") {
        throw new Error("Form 1116 Schedule B prior-year source is missing");
      }
      assertForm1116CarryoverSource(
        pending,
        parsed.prior_year_carryover_source,
      );
    }
    if (pending?.f1040 !== undefined) {
      const parent = pending.form_1116 as
        | { category_summaries?: unknown }
        | undefined;
      const summaries = Array.isArray(parent?.category_summaries)
        ? parent.category_summaries.map((summary) =>
          categorySummarySchema.parse(summary)
        )
        : [];
      const matching = summaries.filter((summary) =>
        summary.category === presentation.category
      );
      const summary = matching.length === 1 ? matching[0] : undefined;
      const parentCredit = summaries.reduce(
        (total, entry) => total + entry.allowedCredit,
        0,
      );
      const schedule3 = pending.schedule3 as
        | { line1_foreign_tax_credit?: unknown; line8_total?: unknown }
        | undefined;
      const form1040 = pending.f1040 as
        | { line20_nonrefundable_credits?: unknown }
        | undefined;
      if (
        !summary ||
        (presentation.case === "current_year_excess"
          ? summary.currentYearExcessTax !== presentation.amount
          : summary.priorYearCarryover !== presentation.balance ||
            summary.usedPriorYearCarryover !== presentation.used ||
            (presentation.case === "combined_current_excess_prior_balance" &&
              summary.currentYearExcessTax !== presentation.amount)) ||
        typeof schedule3?.line1_foreign_tax_credit !== "number" ||
        schedule3.line1_foreign_tax_credit !== parentCredit ||
        typeof schedule3.line8_total !== "number" ||
        form1040?.line20_nonrefundable_credits !== schedule3.line8_total
      ) {
        throw new Error(
          "Form 1116 Schedule B native attachment differs from the parent, Schedule 3, or Form 1040",
        );
      }
    }
    if (presentation.case !== "current_year_excess") {
      const { indicator, balance, used, expired, remaining, rows } =
        presentation;
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
        expired > 0
          ? elements("ForeignTxCyovExprUnsdCurrTYGrp", [
            element("TenthPrecedingTYAmt", -expired),
            element("SubtotalAmt", -expired),
            element("TotalAmt", -expired),
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
