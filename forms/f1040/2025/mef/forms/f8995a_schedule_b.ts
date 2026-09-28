import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import {
  calculateTwoBusinessAggregationLines,
  type Form8995AInput,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCInputSchema,
} from "../../../nodes/inputs/schedule_c/model.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

// The bounded two-business companion must reconcile the retained parent,
// Schedule C sources, Schedule 1 adjustments, and finalized Form 1040.
export function assertScheduleBAggregationJoin(
  input: Form8995AInput,
  context: MefBuildContext | undefined,
): ReturnType<typeof calculateTwoBusinessAggregationLines> {
  const calculated = calculateTwoBusinessAggregationLines(input);
  const pending = context?.pending;
  const filer = context?.filer;
  const source = scheduleCInputSchema.safeParse(pending?.schedule_c);
  const retainedParent = inputSchema.strict().safeParse(pending?.form8995a);
  const retainedCompanion = inputSchema.strict().safeParse(
    pending?.form8995a_schedule_b,
  );
  if (
    !filer || !pending || filer.filingStatus !== FilingStatus.Single ||
    filer.primarySSN.replaceAll("-", "") !==
      calculated.source.common_owner_ssn ||
    !retainedParent.success || !retainedCompanion.success ||
    JSON.stringify(retainedParent.data) !== JSON.stringify(input) ||
    JSON.stringify(retainedCompanion.data) !== JSON.stringify(input) ||
    pending.form8995 !== undefined ||
    pending.form8995a_schedule_a !== undefined ||
    pending.form8995a_schedule_c !== undefined ||
    pending.form8995a_schedule_d !== undefined ||
    !source.success || source.data.schedule_cs.length !== 2 ||
    source.data.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    source.data.form8829_line30 !== undefined ||
    (source.data.wotc_wage_reductions?.length ?? 0) > 0 ||
    pending.form8829 !== undefined || pending.form5884 !== undefined
  ) {
    throw new Error(
      "Form 8995-A Schedule B needs matching parent, companion, filer, and two unadjusted Schedule C sources",
    );
  }
  for (const member of calculated.source.members) {
    const retained = source.data.schedule_cs.find((item) =>
      item.business_reference === member.business_reference
    );
    if (
      !retained ||
      JSON.stringify(retained) !== JSON.stringify(member.source_schedule_c) ||
      computeNetProfit(retained) -
            member.qbi_adjustments.deductible_se_tax -
            member.qbi_adjustments.self_employed_health_insurance -
            member.qbi_adjustments.qualified_retirement_plan !== member.qbi
    ) {
      throw new Error(
        "Form 8995-A Schedule B member differs from the retained Schedule C source",
      );
    }
  }
  const adjustmentTotal = (
    key:
      | "deductible_se_tax"
      | "self_employed_health_insurance"
      | "qualified_retirement_plan",
  ) =>
    calculated.source.members.reduce(
      (sum, member) => sum + member.qbi_adjustments[key],
      0,
    );
  const schedule1 = z.object({
    line15_se_deduction: z.number().nonnegative().optional(),
    line16_sep_simple: z.number().nonnegative().optional(),
    line17_se_health_insurance: z.number().nonnegative().optional(),
  }).passthrough().safeParse(pending.schedule1);
  if (
    !schedule1.success ||
    (schedule1.data.line15_se_deduction ?? 0) !==
      adjustmentTotal("deductible_se_tax") ||
    (schedule1.data.line16_sep_simple ?? 0) !==
      adjustmentTotal("qualified_retirement_plan") ||
    (schedule1.data.line17_se_health_insurance ?? 0) !==
      adjustmentTotal("self_employed_health_insurance")
  ) {
    throw new Error(
      "Form 8995-A Schedule B per-member QBI adjustments must reconcile to Schedule 1 lines 15-17",
    );
  }
  const form1040 = z.object({
    line3a_qualified_dividends: z.number().nonnegative().optional(),
    line7_capital_gain: z.number().optional(),
    line13_qbi_deduction: z.number(),
    line15_taxable_income: z.number().nonnegative(),
  }).passthrough().safeParse(pending.f1040);
  if (
    !form1040.success ||
    form1040.data.line13_qbi_deduction !== calculated.parent.line39 ||
    form1040.data.line15_taxable_income + calculated.parent.line39 !==
      input.taxable_income ||
    (form1040.data.line3a_qualified_dividends ?? 0) !== 0 ||
    (form1040.data.line7_capital_gain ?? 0) > 0
  ) {
    throw new Error(
      "Form 8995-A Schedule B income limit, dividends, and grouped deduction differ from Form 1040",
    );
  }
  return calculated;
}

export function buildStagedIRS8995AScheduleB(
  raw: unknown,
  context: MefBuildContext | undefined,
): string {
  const input = inputSchema.strict().parse(raw);
  const { source, schedule } = assertScheduleBAggregationJoin(input, context);
  return elements("IRS8995AScheduleB", [
    elements("BusOperationAggregationGrp", [
      element("TradeOrBusinessAggregationDesc", source.group_description),
      ...schedule.rows.map((row) =>
        elements("BusinessAggregationInfoGrp", [
          elements("TradeOrBusinessName", [
            element("BusinessNameLine1Txt", row.name),
          ]),
          element("EIN", row.ein),
          element("QlfyBusinessIncomeOrLossAmt", row.qbi),
          element("W2WagesAmt", row.w2Wages),
          element("UBIAAmt", row.ubia),
        ])
      ),
      element("TotQlfyBusinessIncomeOrLossAmt", schedule.totalQbi),
      element("TotalW2WagesAmt", schedule.totalW2Wages),
      element("TotalUBIAAmt", schedule.totalUbia),
    ]),
  ]);
}

export const form8995aScheduleB: MefFormDescriptor<
  "form8995a_schedule_b",
  Form8995AInput | readonly []
> = {
  pendingKey: "form8995a_schedule_b",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995ab--2022.pdf",
  build(fields, context) {
    if (Array.isArray(fields) && fields.length === 0) return "";
    return buildStagedIRS8995AScheduleB(fields, context);
  },
};
