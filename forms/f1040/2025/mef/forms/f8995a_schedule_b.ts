import { mefBusinessNameLine1 } from "../../../mef/business-name.ts";
import {
  AGGREGATION_DISCLOSURE_DESCRIPTION,
  AGGREGATION_DISCLOSURE_FILE,
  aggregationAnnualDisclosureBytes,
  aggregationChangeDescription,
  checkedIssuedRpeStatementBytes,
} from "../../pdf/forms/f8995a_aggregation_statement.ts";
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
import { inputSchema as sCorpInputSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";
import { currentSCorpRpeAggregation } from "../../../nodes/inputs/k1_rpe_aggregation_source.ts";
import { isDeepStrictEqual } from "node:util";

function assertRpeScheduleBJoin(
  input: Form8995AInput,
  context: MefBuildContext | undefined,
) {
  const calculated = calculateTwoBusinessAggregationLines(input),
    pending = context?.pending,
    filer = context?.filer;
  const source = input.rpe_aggregation_source!;
  const k1 = sCorpInputSchema.parse(pending?.k1_s_corp);
  if (k1.k1_s_corps.length !== 1) {
    throw Error("RPE Schedule B needs the complete actual issuer K1 inventory");
  }
  const issued = currentSCorpRpeAggregation(k1.k1_s_corps[0]);
  const parent = inputSchema.strict().parse(pending?.form8995a);
  const companion = inputSchema.strict().parse(pending?.form8995a_schedule_b);
  const upstream = pending?.form8995 as Record<string, unknown> | undefined;
  const general = pending?.general as Record<string, unknown> | undefined;
  const s1 = pending?.schedule1 as Record<string, number> | undefined;
  const f = pending?.f1040 as Record<string, number> | undefined;
  // These nodes can retain inert executor inputs without a filed deduction or
  // passive activity. Do not treat their presence as another business route.
  const passive = pending?.form8582 as Record<string, unknown> | undefined;
  const health = pending?.form7206 as Record<string, unknown> | undefined;
  const zeroSe = health?.schedule_se_source as
    | Record<string, unknown>
    | undefined;
  const record = (value: unknown) =>
    typeof value === "object" && value !== null && !Array.isArray(value);
  const passiveInert = passive === undefined ||
    (record(passive) &&
      Object.entries(passive).every(([key, value]) =>
        value === undefined || (key === "filing_status" && value === "single")
      ));
  const healthInert = health === undefined ||
    (record(health) &&
      Object.entries(health).every(([key, value]) =>
        value === undefined || key === "schedule_se_source"
      ) &&
      (zeroSe === undefined ||
        (record(zeroSe) &&
          Object.entries(zeroSe).every(([key, value]) =>
            value === undefined ||
            (key === "farm_optional_method_elected" && value === false) ||
            ([
              "net_profit_schedule_c",
              "net_profit_schedule_f",
              "line13_deduction",
            ]
              .includes(key) && value === 0)
          ))));
  if (
    !issued || !isDeepStrictEqual(issued.source, source) ||
    !isDeepStrictEqual(parent, input) || !isDeepStrictEqual(companion, input) ||
    !filer || filer.filingStatus !== FilingStatus.Single ||
    filer.primarySSN.replaceAll("-", "") !== source.recipient_tin ||
    general?.filing_status !== "single" ||
    general?.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    !upstream || !isDeepStrictEqual(upstream.rpe_aggregation_source, source) ||
    upstream.line15 !== undefined || upstream.qbi_deduction !== undefined ||
    !s1 || s1.line5_schedule_e !== issued.qbi ||
    (s1.line15_se_deduction ?? 0) !== 0 ||
    (s1.line16_sep_simple ?? 0) !== 0 ||
    (s1.line17_se_health_insurance ?? 0) !== 0 ||
    !f || f.line8_additional_income !== issued.qbi ||
    f.line13_qbi_deduction !== calculated.parent.line39 ||
    f.line15_taxable_income + calculated.parent.line39 !==
      input.taxable_income ||
    (f.line3a_qualified_dividends ?? 0) !== 0 ||
    (f.line7_capital_gain ?? 0) !== 0 ||
    !passiveInert || !healthInert || [
      "schedule_c",
      "schedule_f",
      "k1_partnership",
      "k1_trust",
      "form7203",
      "sep_retirement",
      "form8995a_schedule_a",
      "form8995a_schedule_c",
      "form8995a_schedule_d",
      "form5884",
      "form8829",
    ].some((key) => pending?.[key] !== undefined)
  ) {
    throw Error(
      "RPE Schedule B must join actual issuer/recipient source, intact aggregation, Schedule E income and finalized 1040 deduction",
    );
  }
  return calculated;
}

// The bounded two-business companion must reconcile the retained parent,
// Schedule C sources, Schedule 1 adjustments, and finalized Form 1040.
export function assertScheduleBAggregationJoin(
  input: Form8995AInput,
  context: MefBuildContext | undefined,
): ReturnType<typeof calculateTwoBusinessAggregationLines> {
  if (input.rpe_aggregation_source) {
    return assertRpeScheduleBJoin(input, context);
  }
  const calculated = calculateTwoBusinessAggregationLines(input);
  const pending = context?.pending;
  const filer = context?.filer;
  const source = scheduleCInputSchema.safeParse(pending?.schedule_c);
  const retainedParent = inputSchema.strict().safeParse(pending?.form8995a);
  const retainedCompanion = inputSchema.strict().safeParse(
    pending?.form8995a_schedule_b,
  );
  const simplified = z.object({
    qbi_deduction: z.unknown().optional(),
    line15: z.unknown().optional(),
  }).passthrough().safeParse(pending?.form8995);
  const general = z.object({
    qbi_no_prior_loss_or_suspended_loss_confirmed: z.literal(true),
  }).passthrough().safeParse(pending?.general);
  if (
    !filer || !pending || filer.filingStatus !== FilingStatus.Single ||
    filer.primarySSN.replaceAll("-", "") !==
      calculated.source.common_owner_ssn ||
    !retainedParent.success || !retainedCompanion.success ||
    JSON.stringify(retainedParent.data) !== JSON.stringify(input) ||
    JSON.stringify(retainedCompanion.data) !== JSON.stringify(input) ||
    // The graph retains Form8995's upstream QBI inputs when it delegates to
    // the advanced form. Only a second finalized simplified deduction conflicts.
    (pending.form8995 !== undefined && (!simplified.success ||
      simplified.data.qbi_deduction !== undefined ||
      simplified.data.line15 !== undefined)) ||
    pending.form8995a_schedule_a !== undefined ||
    pending.form8995a_schedule_c !== undefined ||
    pending.form8995a_schedule_d !== undefined ||
    !source.success ||
    source.data.schedule_cs.length !== calculated.source.members.length ||
    (source.data.qbi_no_prior_loss_or_suspended_loss_confirmed !== true &&
      !general.success) ||
    source.data.form8829_line30 !== undefined ||
    (source.data.wotc_wage_reductions?.length ?? 0) > 0 ||
    pending.form8829 !== undefined || pending.form5884 !== undefined
  ) {
    throw new Error(
      "Form 8995-A Schedule B needs matching parent, companion, filer, and complete unadjusted owned Schedule C sources",
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
  const attachmentId = context?.documentIdsByAttachmentFileName
    ?.[AGGREGATION_DISCLOSURE_FILE];
  const issuedFile = input.rpe_aggregation_source?.issued_statement_pdf
    .file_name;
  const issuedId = issuedFile
    ? context?.documentIdsByAttachmentFileName?.[issuedFile]
    : undefined;
  if (
    !context?.binaryAttachmentFileNames?.includes(
      AGGREGATION_DISCLOSURE_FILE,
    ) ||
    (context.phase === "final" && !attachmentId) ||
    (issuedFile !== undefined &&
      (!context?.binaryAttachmentFileNames?.includes(issuedFile) ||
        (context.phase === "final" && !issuedId)))
  ) {
    throw new Error(
      "Form 8995-A aggregation requires its bundled annual disclosure PDF",
    );
  }
  return elements(
    "IRS8995AScheduleB",
    [
      elements("BusOperationAggregationGrp", [
        element("TradeOrBusinessAggregationDesc", source.group_description),
        element("PriorYearChangeDesc", aggregationChangeDescription(input)),
        ...schedule.rows.map((row) =>
          elements("BusinessAggregationInfoGrp", [
            elements("TradeOrBusinessName", [
              element("BusinessNameLine1Txt", mefBusinessNameLine1(row.name)),
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
    ],
    attachmentId
      ? {
        referenceDocumentId: issuedId
          ? attachmentId + " " + issuedId
          : attachmentId,
        referenceDocumentName: "BinaryAttachment",
      }
      : undefined,
  );
}

export const form8995aScheduleB: MefFormDescriptor<
  "form8995a_schedule_b",
  Form8995AInput | readonly []
> = {
  pendingKey: "form8995a_schedule_b",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995ab--2022.pdf",
  async buildBinaryAttachments(fields, context) {
    if (Array.isArray(fields) || Object.keys(fields).length === 0) return [];
    const input = inputSchema.strict().parse(fields);
    const attachments = [{
      fileName: AGGREGATION_DISCLOSURE_FILE,
      description: AGGREGATION_DISCLOSURE_DESCRIPTION,
      bytes: await aggregationAnnualDisclosureBytes(input, context?.filer),
    }];
    if (input.rpe_aggregation_source) {
      attachments.push({
        fileName: input.rpe_aggregation_source.issued_statement_pdf.file_name,
        description:
          "Issued RPE aggregation disclosure attached to Schedule K-1",
        bytes: await checkedIssuedRpeStatementBytes(input),
      });
    }
    return attachments;
  },
  build(fields, context) {
    if (Array.isArray(fields) && fields.length === 0) return "";
    return buildStagedIRS8995AScheduleB(fields, context);
  },
};
