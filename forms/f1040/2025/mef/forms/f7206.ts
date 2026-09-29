import {
  calculateSingleScheduleCForm7206,
  type Form7206Lines,
  form7206LinesSchema,
  type SingleScheduleCPlan,
  singleScheduleCPlanSchema,
} from "../../../nodes/intermediate/forms/form7206/index.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCInputSchema,
} from "../../../nodes/inputs/schedule_c/model.ts";
import {
  inputSchema as scheduleSEInputSchema,
  schedule_se,
} from "../../../nodes/intermediate/forms/schedule_se/index.ts";
import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<
  Form7206Lines & {
    single_schedule_c_plan: SingleScheduleCPlan;
    recipient_name: string;
    recipient_ssn: string;
  }
>;

// TY2025 v5.4 IRS7206.xsd sequence. Line 11 is blank for a Schedule C plan.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Form7206Lines, string]> =
  [
    ["line1", "TotalHealthInsurancePaidAmt"],
    ["line2", "TotQlfyLTCareInsDedAmt"],
    ["line3", "TotHlthInsQlfyLTCareInsDedAmt"],
    ["line4", "NetPrftOthEarnedIncmAmt"],
    ["line5", "TotNetPrftIncmAmt"],
    ["line6", "OthEarnedIncmDivTotNetPrftPct"],
    ["line7", "DedSETaxMultiplyPctAmt"],
    ["line8", "PctLessNetPrftOthEarnedIncmAmt"],
    ["line9", "SelfEmpldSepSimpleQlfyPlansAmt"],
    ["line10", "PctMinusSEQlfyPlansAmt"],
    ["line12", "Form2555Amt"],
    ["line13", "SubtractForm2555Amt"],
    ["line14", "SelfEmpldHealthInsDedAmt"],
  ];

function buildIRS7206(fields: Input, context?: MefBuildContext): string {
  if (!FIELD_MAP.some(([key]) => fields[key] !== undefined)) return "";
  const allowed = new Set([
    "single_schedule_c_plan",
    "recipient_name",
    "recipient_ssn",
    ...FIELD_MAP.map(([key]) => key),
  ]);
  const unsupported = Object.keys(fields).filter((key) => !allowed.has(key));
  if (unsupported.length > 0) {
    throw new Error(
      `Form 7206 MeF does not accept unreviewed fields: ${
        unsupported.join(", ")
      }`,
    );
  }
  const source = singleScheduleCPlanSchema.parse(fields.single_schedule_c_plan);
  const lines = form7206LinesSchema.parse(fields);
  const expected = calculateSingleScheduleCForm7206(source);
  if (
    (Object.keys(expected) as (keyof Form7206Lines)[]).some((key) =>
      lines[key] !== expected[key]
    )
  ) {
    throw new Error("Form 7206 printed lines differ from the source plan");
  }
  const ssn = source.taxpayer_identity.ssn.replaceAll("-", "");
  const filer = context?.filer;
  if (
    !filer?.primarySSN || ssn !== filer.primarySSN.replaceAll("-", "") ||
    source.taxpayer_identity.name.trim().toUpperCase() !==
      (filer.fullName ?? filer.nameLine1).trim().toUpperCase() ||
    fields.recipient_name !== source.taxpayer_identity.name ||
    fields.recipient_ssn !== ssn
  ) {
    throw new Error("Form 7206 recipient must match the taxpayer");
  }
  const pending = context?.pending;
  const scheduleC = scheduleCInputSchema.parse(pending?.schedule_c);
  if (
    scheduleC.schedule_cs.length !== 1 ||
    scheduleC.form8829_line30 !== undefined ||
    (scheduleC.wotc_wage_reductions?.length ?? 0) > 0 ||
    Object.keys(scheduleC).some((key) =>
      key !== "schedule_cs" && key !== "filing_status"
    )
  ) {
    throw new Error("Form 7206 needs one unadjusted Schedule C source");
  }
  const business = scheduleC.schedule_cs[0];
  if (
    business.business_reference !== source.business_reference ||
    business.proprietor_recipient !== source.recipient ||
    business.at_risk_simplified !== undefined ||
    computeNetProfit(business) !== lines.line4
  ) {
    throw new Error("Form 7206 Schedule C owner or line 31 differs");
  }
  const schedule1 = z.object({
    line3_schedule_c: z.number(),
    line15_se_deduction: z.number().optional(),
    line16_sep_simple: z.number().optional(),
    line17_se_health_insurance: z.number(),
    line26_total_adjustments: z.number(),
    line4_other_gains: z.number().optional(),
    line5_schedule_e: z.number().optional(),
    line6_schedule_f: z.number().optional(),
    line8d_foreign_earned_income_exclusion: z.number().optional(),
  }).passthrough().parse(pending?.schedule1);
  const scheduleSE = scheduleSEInputSchema.parse(pending?.schedule_se);
  const computedSELine13 = schedule_se.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleSE,
  ).outputs.find((row) => row.nodeType === "schedule1")?.fields
    .line15_se_deduction ?? 0;
  const form1040 = z.object({
    line10_adjustments: z.number(),
  }).passthrough().parse(pending?.f1040);
  if (
    schedule1.line3_schedule_c !== lines.line4 ||
    (schedule1.line15_se_deduction ?? 0) !== lines.line7 ||
    computedSELine13 !== lines.line7 ||
    (schedule1.line16_sep_simple ?? 0) !== 0 ||
    schedule1.line17_se_health_insurance !== lines.line14 ||
    schedule1.line26_total_adjustments !== form1040.line10_adjustments ||
    scheduleSE.net_profit_schedule_c !== lines.line4 ||
    (scheduleSE.net_profit_schedule_f ?? 0) !== 0 ||
    scheduleSE.farm_optional_method_elected === true ||
    (schedule1.line4_other_gains ?? 0) !== 0 ||
    (schedule1.line5_schedule_e ?? 0) !== 0 ||
    (schedule1.line6_schedule_f ?? 0) !== 0 ||
    (schedule1.line8d_foreign_earned_income_exclusion ?? 0) !== 0
  ) {
    throw new Error("Form 7206 does not reconcile to the filed return");
  }
  const present = (key: string) => {
    const value = pending?.[key];
    return value !== null && typeof value === "object" &&
      Object.keys(value).length > 0;
  };
  const marketplace = z.object({
    annual_premium: z.number().optional(),
    monthly_premiums: z.array(z.number()).optional(),
    monthly_ptc_rows: z.array(z.unknown()).optional(),
  }).passthrough().parse(pending?.form8962 ?? {});
  if (
    present("form2555") || present("f1095a") ||
    present("sep_retirement") || present("schedule_f") ||
    present("schedule_e") || present("f4835") || present("form4797") ||
    (marketplace.annual_premium ?? 0) > 0 ||
    (marketplace.monthly_premiums?.length ?? 0) > 0 ||
    (marketplace.monthly_ptc_rows?.length ?? 0) > 0
  ) {
    throw new Error(
      "Form 7206 one-plan filing excludes other business, retirement, Form 2555, and Marketplace/PTC sources",
    );
  }
  return elements("IRS7206", [
    element("NameLine1Txt", source.taxpayer_identity.name),
    element("SSN", ssn),
    ...FIELD_MAP.map(([key, tag]) => element(tag, lines[key])),
  ]);
}

export const form7206: MefFormDescriptor<"form7206", Input> = {
  pendingKey: "form7206",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f7206--2025.pdf",
  build: buildIRS7206,
};
