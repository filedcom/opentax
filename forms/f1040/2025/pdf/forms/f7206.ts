import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateSingleScheduleCForm7206,
  form7206LinesSchema,
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
import { form7206 as nativeForm7206 } from "../../mef/forms/f7206.ts";

// TY2025 AcroForm has two identity fields followed by printed lines 1-14.
// Line 11 is blank for this Schedule C route, and line 6 prints a percentage.
const page = "topmostSubform[0].Page1[0]";
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "recipient_name", pdfField: `${page}.f1_1[0]` },
  { kind: "text", domainKey: "recipient_ssn", pdfField: `${page}.f1_2[0]` },
  ...([1, 2, 3, 4, 5] as const).map((line) => ({
    kind: "text" as const,
    domainKey: `line${line}`,
    pdfField: `${page}.f1_${line + 2}[0]`,
  })),
  { kind: "text", domainKey: "line6_pct", pdfField: `${page}.f1_8[0]` },
  ...([7, 8, 9, 10] as const).map((line) => ({
    kind: "text" as const,
    domainKey: `line${line}`,
    pdfField: `${page}.f1_${line + 2}[0]`,
  })),
  ...([12, 13, 14] as const).map((line) => ({
    kind: "text" as const,
    domainKey: `line${line}`,
    pdfField: `${page}.f1_${line + 2}[0]`,
  })),
];

function projectFields(
  fields: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
) {
  if (
    !nativeForm7206.FIELD_MAP.some(([key]) => fields[key] !== undefined)
  ) return fields;
  const allowed = new Set([
    "single_schedule_c_plan",
    "recipient_name",
    "recipient_ssn",
    ...Object.keys(form7206LinesSchema.shape),
  ]);
  const unsupported = Object.keys(fields).filter((key) => !allowed.has(key));
  if (unsupported.length > 0) {
    throw new Error(
      `Form 7206 PDF does not accept unreviewed fields: ${unsupported.join(", ")}`,
    );
  }
  const source = singleScheduleCPlanSchema.parse(fields.single_schedule_c_plan);
  const lines = form7206LinesSchema.parse(fields);
  const expected = calculateSingleScheduleCForm7206(source);
  if (
    Object.entries(expected).some(([key, amount]) => fields[key] !== amount) ||
    fields.recipient_name !== source.taxpayer_identity.name ||
    fields.recipient_ssn !== source.taxpayer_identity.ssn.replaceAll("-", "")
  ) {
    throw new Error("Form 7206 PDF fields differ from the identified plan");
  }
  const scheduleC = scheduleCInputSchema.parse(allPending.schedule_c);
  if (
    scheduleC.schedule_cs.length !== 1 ||
    scheduleC.form8829_line30 !== undefined ||
    (scheduleC.wotc_wage_reductions?.length ?? 0) > 0 ||
    Object.keys(scheduleC).some((key) =>
      key !== "schedule_cs" && key !== "filing_status"
    )
  ) {
    throw new Error("Form 7206 PDF needs one unadjusted Schedule C");
  }
  const business = scheduleC.schedule_cs[0];
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
  }).passthrough().parse(allPending.schedule1);
  const scheduleSE = scheduleSEInputSchema.parse(allPending.schedule_se);
  const computedSELine13 = schedule_se.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleSE,
  ).outputs.find((row) => row.nodeType === "schedule1")?.fields
    .line15_se_deduction ?? 0;
  const form1040 = z.object({
    line10_adjustments: z.number(),
  }).passthrough().parse(allPending.f1040);
  if (
    business.business_reference !== source.business_reference ||
    business.proprietor_recipient !== source.recipient ||
    business.at_risk_simplified !== undefined ||
    computeNetProfit(business) !== lines.line4 ||
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
    (schedule1.line8d_foreign_earned_income_exclusion ?? 0) !== 0 ||
    Object.keys(allPending.form2555 ?? {}).length > 0 ||
    Object.keys(allPending.f1095a ?? {}).length > 0 ||
    Object.keys(allPending.sep_retirement ?? {}).length > 0 ||
    Object.keys(allPending.schedule_f ?? {}).length > 0 ||
    Object.keys(allPending.schedule_e ?? {}).length > 0 ||
    Object.keys(allPending.f4835 ?? {}).length > 0 ||
    Object.keys(allPending.form4797 ?? {}).length > 0
  ) {
    throw new Error("Form 7206 PDF does not reconcile to the return");
  }
  const form8962 = z.object({
    annual_premium: z.number().optional(),
    monthly_premiums: z.array(z.number()).optional(),
    monthly_ptc_rows: z.array(z.unknown()).optional(),
  }).passthrough().parse(allPending.form8962 ?? {});
  if (
    (form8962.annual_premium ?? 0) > 0 ||
    (form8962.monthly_premiums?.length ?? 0) > 0 ||
    (form8962.monthly_ptc_rows?.length ?? 0) > 0
  ) {
    throw new Error("Form 7206 PDF excludes Marketplace/PTC overlap");
  }
  return { ...fields, line6_pct: `${lines.line6 * 100}%` };
}

export const form7206Pdf: PdfFormDescriptor = {
  pendingKey: "form7206",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f7206--2025.pdf",
  projectFields,
  fields,
};
