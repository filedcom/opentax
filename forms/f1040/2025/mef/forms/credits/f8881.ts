import { element, elements } from "../../../../mef/xml.ts";
import {
  calculateForm8881,
  inputSchema,
} from "../../../../nodes/inputs/f8881/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../../nodes/inputs/schedule_c/model.ts";
import type { MefFormDescriptor } from "../../form-descriptor.ts";

export function reconcileForm8881Credit(
  sourceRaw: unknown,
  form3800Raw: unknown,
): ReturnType<typeof calculateForm8881> {
  const lines = calculateForm8881(inputSchema.parse(sourceRaw));
  const source = inputSchema.parse(sourceRaw);
  if (
    !form3800Raw || typeof form3800Raw !== "object" ||
    !("f8881_credit" in form3800Raw)
  ) {
    throw new Error("Form 8881 needs its Form 3800 source credit");
  }
  const credit = form3800Raw.f8881_credit;
  if (
    !credit || typeof credit !== "object" ||
    !("part_i_credit" in credit) ||
    !("part_ii_credit" in credit) ||
    !("part_iii_credit" in credit) ||
    !("schedule_c_business_reference" in credit) ||
    !("subject_to_passive_activity_limit" in credit) ||
    credit.part_i_credit !== lines.line8 ||
    credit.part_ii_credit !== lines.line11 ||
    credit.part_iii_credit !== lines.line15 ||
    credit.schedule_c_business_reference !==
      source.schedule_c_business_reference ||
    credit.subject_to_passive_activity_limit !== false
  ) {
    throw new Error("Form 8881 parts do not reconcile to Form 3800 source");
  }
  return lines;
}

export function reconcileForm8881DirectEmployer(
  pending: Readonly<Record<string, unknown>>,
): ReturnType<typeof calculateForm8881> {
  const source = inputSchema.parse(pending.f8881);
  const lines = reconcileForm8881Credit(source, pending.f3800);
  const scheduleC = scheduleCInputSchema.parse(pending.schedule_c);
  const matches = scheduleC.schedule_cs.filter((business) =>
    business.business_reference === source.schedule_c_business_reference
  );
  if (
    matches.length !== 1 || matches[0].line_g_material_participation !== true
  ) {
    throw new Error(
      "Form 8881 direct employer needs one participating Schedule C business",
    );
  }
  return lines;
}

/** Exact TY2025 IRS8881.xsd element order. */
export const form8881: MefFormDescriptor<"f8881", unknown> = {
  pendingKey: "f8881",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8881.pdf",
  build(raw, context) {
    if (raw === undefined || raw === null) return "";
    const source = inputSchema.parse(raw);
    if (
      !context?.pending ||
      (context.phase !== "discovery" &&
        context.documentIdsByPendingKey?.f3800?.length !== 1)
    ) {
      throw new Error("Form 8881 needs one attached sourced Form 3800");
    }
    if (
      JSON.stringify(source) !==
        JSON.stringify(inputSchema.parse(context.pending.f8881))
    ) {
      throw new Error("Form 8881 source differs from filed return");
    }
    const lines = reconcileForm8881DirectEmployer(context.pending);
    return elements("IRS8881", [
      source.startup
        ? element(
          "QualifiedEmployeeCnt",
          source.startup.preceding_first_credit_year_qualified_employee_count,
        )
        : "",
      source.startup
        ? element("QualifiedStartupCostsIncurdAmt", lines.line1)
        : "",
      source.startup
        ? element("QlfyStartupCostsIncurdPctAmt", lines.line2)
        : "",
      source.startup
        ? element(
          "PensionPlanEligibleEmplCnt",
          source.startup.eligible_non_hce_count,
        )
        : "",
      source.startup ? element("PensionPlanEmplBaseCalcAmt", lines.line3) : "",
      source.startup
        ? element("PensionPlanEmplLimitedCalcAmt", lines.line4)
        : "",
      source.startup
        ? element("SmllrStartupCostEmplLtdCalcAmt", lines.line5)
        : "",
      source.contributions
        ? element("PrecedingTaxYrEmployeeCnt", lines.line6a)
        : "",
      source.contributions
        ? element("SmllEmplrContriToPnsnPlanAmt", lines.line6b)
        : "",
      source.contributions
        ? element("EligibleCreditEmplContriAmt", lines.line6c)
        : "",
      source.contributions
        ? element("TotSmllEmplrCrEmplContriAmt", lines.line6d)
        : "",
      source.contributions && lines.line6a > 50
        ? element("NetPrecedingTaxYrEmployeeCnt", lines.line6e1)
        : "",
      source.contributions && lines.line6a > 50
        ? element("NetPrecTaxYrEmplCntByPct", lines.line6e2)
        : "",
      source.contributions && lines.line6a > 50
        ? element("MultNetPrecTYEmplByCntPctAmt", lines.line6e3)
        : "",
      source.contributions && lines.line6a > 50
        ? element("NetEligibleCreditEmplContriAmt", lines.line6e4)
        : "",
      source.contributions
        ? element("PhaseoutEligCrEmplContriAmt", lines.line6f)
        : "",
      source.contributions
        ? element("AddnlCrEmplrContriEligEmplrAmt", lines.line6g)
        : "",
      lines.line8 > 0
        ? element("PensionPlanStartupCostsCrAmt", lines.line8)
        : "",
      source.auto_enrollment
        ? element("AutoEnrlmtOptForRetireSavCrAmt", lines.line9)
        : "",
      source.auto_enrollment
        ? element("SmllEmplrAutoEnrlmtCrAmt", lines.line11)
        : "",
      source.military_spouses
        ? element(
          "MilSpsEmplPrtcptEligPlanCnt",
          source.military_spouses.employees.length,
        )
        : "",
      source.military_spouses
        ? element("MilSpsEmplPrtcptEligPlanAmt", lines.line12)
        : "",
      source.military_spouses
        ? element("EmplrContriPaidMilSpsAmt", lines.line13)
        : "",
      source.military_spouses
        ? element("MilSpsParticipationCrAmt", lines.line15)
        : "",
    ]);
  },
};
