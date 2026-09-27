import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  carryoverReviewSchema,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const scheduleBFieldsSchema = z.object({
  category: z.nativeEnum(IncomeCategory),
  current_year_excess_tax: z.number().int().positive(),
  prior_year_review: carryoverReviewSchema,
}).strict();

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
    if (
      !indicator || fields.prior_year_review.income_category !== fields.category
    ) {
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
