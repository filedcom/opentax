import { assertProducingMiningZeroQbi } from "../../../nodes/intermediate/forms/form8995a/producing-mining.ts";
import { assertProducingMiningZeroQbiReturn } from "../../form8995a_producing_mining_source.ts";
import { assertQualifiedTipQbiSource } from "../../form8995_qualified_tip_source.ts";
import { assertFarmWotcReturn } from "../../form8995_farm_wotc_reconciliation.ts";
import { assertMixedFishingQbiReturn } from "../../form8995a_mixed_fishing_source.ts";
import { calculateFarmWotcLines } from "../../../nodes/intermediate/forms/form8995a/farm-wotc.ts";
import { assertSstbScheduleCSource } from "./f8995a-sstb-source.ts";
import { assertForm8995APatronReturn } from "../../form8995a_patron_reconciliation.ts";
import { inputSchema as w2InputSchema } from "../../../nodes/inputs/w2/index.ts";
import {
  assertMultiBusinessInvestmentSources,
  assertMultiBusinessInvestmentTax,
} from "./f8995-investment.ts";
import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  assertMfsSstbOwner,
  assertPatron1099PATRSource,
  calculateOneBusiness8995ALines,
  calculateOneSstb8995ALines,
  calculateOwnedWotcBusinesses,
  calculateScheduleCLossLines,
  type Form8995AInput,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCInputSchema,
} from "../../../nodes/inputs/schedule_c/model.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { assertScheduleBAggregationJoin } from "./f8995a_schedule_b.ts";
import { assertZeroReductionScheduleAReturn } from "./f8995a_schedule_a.ts";
import { qualifiedReitDividends } from "./f8995-route.ts";
import { assertForm8995AWotcReturn } from "../../form8995a_wotc_reconciliation.ts";

type Input = Form8995AInput | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

export function assertNoFiledForm8995(
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const source = pending?.form8995;
  if (
    source && typeof source === "object" &&
    (Object.hasOwn(source, "qbi_deduction") || Object.hasOwn(source, "line15"))
  ) {
    throw new Error(
      "Form 8995-A and a filed Form 8995 cannot both be pending for one return",
    );
  }
}

// Native parent projection for the single bounded aggregation.
export function buildStagedAggregatedIRS8995A(
  raw: unknown,
  context: MefBuildContext | undefined,
): string {
  const input = inputSchema.strict().parse(raw);
  const { source, parent } = assertScheduleBAggregationJoin(input, context);
  const lines = [
    elements("QBIDeductionInformationGrp", [
      elements("TradeOrBusinessName", [
        element("BusinessNameLine1Txt", source.group_name),
      ]),
      element("AggregatedInd", "X"),
      element("QualifiedBusinessIncomeAmt", parent.line2),
      element("QlfyBusinessIncome20PctAmt", parent.line3),
      element("AllocableShareW2WagesAmt", parent.line4),
      element("AllocableShareW2Wages50PctAmt", parent.line5),
      element("AllocableShareW2Wages25PctAmt", parent.line6),
      element("AllocableShareUBIAQlfyPropAmt", parent.line7),
      element("AllcblShrUBIAQlfyProp025PctAmt", parent.line8),
      element("TotalAllcblW2WgsQlfyPropPctAmt", parent.line9),
      element("GrtrAllcblShrW2WageQlfyPropAmt", parent.line10),
      element("W2WageQlfyPropLimitationAmt", parent.line11),
      element("QBIDedBeforePatronReductionAmt", parent.line13),
      element("QBIComponentAmt", parent.line15),
    ]),
    element("TotalQBIComponentAmt", parent.line16),
    element("QlfyREITDivPTPIncomeLossAmt", 0),
    element("PYQlfyREITDivPTPLossCfwdAmt", 0),
    element("TotQlfyREITDivPTPIncomeAmt", 0),
    element("REITPTPComponentAmt", 0),
    element("QBIDedBfrIncomeLimitationAmt", parent.line32),
    element("TaxableIncomeBeforeQBIDedAmt", parent.line33),
    element("NetCapitalGainAmt", 0),
    element("AdjustedTaxableIncomeAmt", parent.line35),
    element("IncomeLimitationAmt", parent.line36),
    element("QBIDedBeforeDPADSect199AgAmt", parent.line37),
    element("DPADSect199AgAllocAgricHortAmt", 0),
    element("QualifiedBusinessIncomeDedAmt", parent.line39),
    element("TotQlfyREITDivPTPLossCfwdAmt", 0),
  ];
  return elements("IRS8995A", lines);
}

export function validateOneBusiness(fields: Form8995AInput) {
  const details = fields.business_filing_details;
  if (!details) {
    throw new Error(
      "Form 8995-A MeF needs identified per-business QBI source details",
    );
  }
  if (
    (fields.filing_status !== NodeFilingStatus.Single &&
      !((fields.patron_business_source || fields.single_schedule_c_source) &&
        fields.filing_status === NodeFilingStatus.MFJ)) ||
    !fields.patron_business_source && !fields.single_schedule_c_source &&
      !fields.single_schedule_f_source &&
      fields.taxable_income <=
        CONFIG_BY_YEAR[2025].qbiThresholdSingle +
          CONFIG_BY_YEAR[2025].qbiPhaseInRange / 2
  ) {
    throw new Error(
      "Form 8995-A MeF needs its supported filing status and retained business source above the applicable threshold",
    );
  }
  if (
    (fields.sstb_qbi ?? 0) !== 0 ||
    (fields.sstb_w2_wages ?? 0) !== 0 ||
    (fields.sstb_unadjusted_basis ?? 0) !== 0 ||
    (fields.qbi_loss_carryforward ?? 0) !== 0 ||
    (fields.reit_loss_carryforward ?? 0) !== 0 ||
    (fields.aggregation_groups ?? []).length !== 0 ||
    (!fields.single_schedule_f_source && fields.net_capital_gain !== 0)
  ) {
    throw new Error(
      "Form 8995-A MeF does not yet support SSTB, aggregation, loss, or capital-gain paths",
    );
  }
  if (
    fields.patron_of_specified_cooperative === true &&
    !fields.patron_filing_details
  ) {
    throw new Error(
      "Form 8995-A MeF needs Schedule D cooperative and 1099-PATR source details",
    );
  }
  if (
    fields.patron_of_specified_cooperative !== true &&
    fields.patron_filing_details
  ) {
    throw new Error(
      "Form 8995-A MeF cooperative source requires affirmative patron status",
    );
  }
  if (
    fields.qbi === undefined || fields.qbi <= 0 ||
    fields.w2_wages === undefined || fields.unadjusted_basis === undefined ||
    fields.qbi !== details.business_qbi ||
    fields.w2_wages !== details.business_w2_wages ||
    fields.unadjusted_basis !== details.business_ubia ||
    ![
      fields.qbi,
      fields.w2_wages,
      fields.unadjusted_basis,
      fields.taxable_income,
    ]
      .every(Number.isInteger)
  ) {
    throw new Error(
      "Form 8995-A MeF needs matching whole-dollar per-business QBI, W-2 wages, UBIA, and taxable income",
    );
  }
  if (
    !fields.single_schedule_f_source &&
    details.qualified_dividends_zero_confirmed !== true
  ) {
    throw new Error(
      "Form8995A nonzero qualified dividends need an actual source route",
    );
  }
  if (fields.producing_mining_zero_qbi_source) {
    assertProducingMiningZeroQbi(fields);
  }
  const lines = calculateOneBusiness8995ALines(fields);
  if (
    !Object.entries(lines).filter(([key, value]) =>
      /^line\d+$/.test(key) && value !== undefined
    ).every(([, value]) => Number.isInteger(value)) ||
    lines.line39 < 0 ||
    (lines.line39 === 0 && !fields.single_schedule_f_source &&
      !fields.producing_mining_zero_qbi_source)
  ) {
    throw new Error(
      "Form 8995-A MeF needs a sourced whole-dollar calculated QBI deduction",
    );
  }
  return { details, lines };
}

export function assertOneBusinessReitSource(
  fields: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const amount = fields.line6_sec199a_dividends ?? 0;
  if (amount === 0) {
    if (fields.reit_dividend_sources !== undefined) {
      throw new Error("Form 8995-A REIT source needs a positive line 28");
    }
    return;
  }
  const issued = pending?.f1099div as
    | { f1099divs?: unknown[] }
    | undefined;
  if (
    fields.patron_of_specified_cooperative === true ||
    !fields.reit_dividend_sources ||
    fields.reit_dividend_sources.length !== 1 ||
    issued?.f1099divs?.length !== 1 ||
    amount !== qualifiedReitDividends(
        pending?.f1099div,
        fields.reit_dividend_sources,
        0,
      ) ||
    (pending?.f1040 as Record<string, unknown> | undefined)
        ?.line3b_ordinary_dividends !== amount ||
    ((pending?.f1040 as Record<string, unknown> | undefined)
        ?.line3a_qualified_dividends ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8995-A REIT line 28 needs one reviewed issued 1099-DIV and matching Form 1040 ordinary dividends",
    );
  }
}

export function assertScheduleCLossSources(
  fields: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (fields.farm_wotc_filing_source) {
    assertFarmWotcReturn(fields, pending);
    if (!calculateFarmWotcLines(fields).lossSchedule) {
      throw new Error("Farm loss companion needs actual source loss");
    }
    return;
  }
  const lines = calculateScheduleCLossLines(fields);
  if (
    fields.qbi_capital_sources !== undefined ||
    pending?.f1099div !== undefined || pending?.f1099int !== undefined ||
    pending?.f1099b !== undefined
  ) {
    const retained = pending as Record<string, Record<string, unknown>>;
    const investment = assertMultiBusinessInvestmentSources(
      {
        ...fields,
        taxpayer_ssn: String(retained.general.taxpayer_ssn).replace(/\D/g, ""),
      },
      retained,
      true,
    );
    if (fields.net_capital_gain !== investment.filedQbiCapitalLimit) {
      throw new Error(
        "Form 8995-A capital limitation differs from entered source contributions",
      );
    }
    const wages = retained.w2 === undefined
      ? 0
      : w2InputSchema.parse(retained.w2).w2s.reduce(
        (sum, row) => sum + row.box1_wages,
        0,
      );
    const profit = lines.businesses.reduce(
      (sum, business) => sum + business.qbi,
      0,
    );
    const expectedIncome = wages + profit + investment.interest +
      investment.ordinary + investment.returnCapital;
    if (
      !Number.isFinite(retained.f1040.line9_total_income) ||
      !Number.isFinite(retained.f1040.line11_agi) ||
      Math.abs(Number(retained.f1040.line9_total_income) - expectedIncome) >=
        1e-8 ||
      Math.abs(Number(retained.f1040.line11_agi) - expectedIncome) >= 1e-8 ||
      (retained.f1040.line10_adjustments ?? 0) !== 0 ||
      (retained.f1040.line1a_wages ?? 0) !== wages ||
      (retained.f1040.line1z_total_wages ?? 0) !== wages
    ) {
      throw new Error(
        "Form 8995-A investment taxable income differs from retained wage, business and investment sources",
      );
    }
    assertMultiBusinessInvestmentTax(retained, investment);
  }

  const source = scheduleCInputSchema.safeParse(pending?.schedule_c);
  if (
    !source.success || !source.data.schedule_cs ||
    source.data.schedule_cs.length !== lines.businesses.length ||
    (pending?.general as Record<string, unknown> | undefined)
        ?.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    fields.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    pending?.form8829 !== undefined || pending?.form5884 !== undefined
  ) {
    throw new Error(
      "Form 8995-A Schedule C needs all retained unadjusted Schedule C source items",
    );
  }
  for (const business of lines.businesses) {
    const sourceItem = source.data.schedule_cs.find((item) =>
      item.business_reference === business.business_reference
    );
    if (
      !sourceItem ||
      JSON.stringify(sourceItem) !==
        JSON.stringify(business.source_schedule_c) ||
      computeNetProfit(sourceItem) !== business.qbi ||
      (sourceItem.line_26_wages ?? 0) < business.w2_wages
    ) {
      throw new Error(
        "Form 8995-A Schedule C QBI, payroll, and business source differ from the retained Schedule C return",
      );
    }
  }
  const schedule1 = z.object({
    line3_schedule_c: z.number(),
    line10_total_additional_income: z.number(),
    line15_se_deduction: z.number().nonnegative().optional(),
    line16_sep_simple: z.number().nonnegative().optional(),
    line17_se_health_insurance: z.number().nonnegative().optional(),
  }).passthrough().safeParse(pending?.schedule1);
  const form1040 = z.object({
    line8_additional_income: z.number(),
    line13_qbi_deduction: z.number().nonnegative(),
    line13b_additional_deductions: z.number().nonnegative().optional(),
    line15_taxable_income: z.number().nonnegative(),
  }).passthrough().safeParse(pending?.f1040);
  if (
    !schedule1.success || !form1040.success ||
    schedule1.data.line3_schedule_c !==
      lines.businesses.reduce((sum, business) => sum + business.qbi, 0) ||
    schedule1.data.line10_total_additional_income !==
      form1040.data.line8_additional_income ||
    form1040.data.line13_qbi_deduction !== lines.parent.line39 ||
    form1040.data.line15_taxable_income +
          form1040.data.line13_qbi_deduction +
          (form1040.data.line13b_additional_deductions ?? 0) !==
      fields.taxable_income ||
    (schedule1.data.line15_se_deduction ?? 0) !== 0 ||
    (schedule1.data.line16_sep_simple ?? 0) !== 0 ||
    (schedule1.data.line17_se_health_insurance ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8995-A Schedule C net profit and zero QBI adjustments must match filed Schedule 1 and Form 1040",
    );
  }
}

function reconcileReturn(
  context: MefBuildContext | undefined,
  deduction: number,
  fields: Form8995AInput,
): void {
  if (!context?.filer || !context.pending) {
    throw new Error(
      "Form 8995-A MeF needs return header and pending deduction reconciliation context",
    );
  }
  const expectedStatus = fields.filing_status === NodeFilingStatus.MFJ
    ? HeaderFilingStatus.MarriedFilingJointly
    : fields.filing_status === NodeFilingStatus.MFS
    ? HeaderFilingStatus.MarriedFilingSeparately
    : fields.filing_status === NodeFilingStatus.HOH
    ? HeaderFilingStatus.HeadOfHousehold
    : fields.filing_status === NodeFilingStatus.QSS
    ? HeaderFilingStatus.QualifyingSurvivingSpouse
    : HeaderFilingStatus.Single;
  if (
    context.filer.filingStatus !== expectedStatus ||
    (fields.filing_status !== NodeFilingStatus.Single &&
      fields.filing_status !== NodeFilingStatus.HOH &&
      fields.filing_status !== NodeFilingStatus.QSS &&
      fields.filing_status !== NodeFilingStatus.MFS &&
      fields.filing_status !== NodeFilingStatus.MFJ) ||
    ((fields.filing_status === NodeFilingStatus.MFJ ||
      fields.filing_status === NodeFilingStatus.MFS ||
      fields.filing_status === NodeFilingStatus.HOH ||
      fields.filing_status === NodeFilingStatus.QSS) &&
      !fields.sstb_filing_details &&
      !(fields.filing_status === NodeFilingStatus.MFJ &&
        (fields.patron_business_source || fields.single_schedule_c_source ||
          fields.wotc_business_sources || fields.farm_wotc_filing_source ||
          fields.mixed_fishing_qbi_source?.joint_se_source)))
  ) {
    throw new Error("Form 8995-A filing status differs from the return header");
  }
  const jointWotc = fields.single_schedule_c_source?.joint_se_source ??
    fields.wotc_business_sources?.[0].joint_se_source ??
    fields.farm_wotc_filing_source?.joint_se_source;
  if (
    jointWotc &&
    (jointWotc.identity.primary_ssn !==
        context.filer.primarySSN.replaceAll("-", "") ||
      jointWotc.identity.spouse_ssn !==
        context.filer.spouse?.ssn.replaceAll("-", ""))
  ) {
    throw new Error(
      "Form8995A joint WOTC owners differ from actual return header",
    );
  }
  if (
    fields.farm_wotc_filing_source &&
    fields.farm_wotc_filing_source.taxpayer_ssn !==
      context.filer.primarySSN.replaceAll("-", "")
  ) {
    throw new Error(
      "Farm WOTC primary owner differs from actual return header",
    );
  }
  assertMfsSstbOwner(fields, context.filer.primarySSN);
  if (
    (fields.patron_filing_details?.source_1099patr
        .box6_section199ag_deduction ?? 0) > 0 &&
    fields.patron_filing_details?.source_1099patr.recipient_tin !==
      context.filer.primarySSN.replaceAll("-", "")
  ) {
    throw new Error(
      "Form 8995-A cooperative box 6 recipient differs from the final filer",
    );
  }
  assertNoFiledForm8995(context.pending);
  const companion = context.pending.form8995a_schedule_d;
  const sstbCompanion = context.pending.form8995a_schedule_a;
  const aggregationCompanion = context.pending.form8995a_schedule_b;
  const lossCompanion = context.pending.form8995a_schedule_c;
  if (fields.sstb_filing_details) {
    assertSstbScheduleCSource(
      fields,
      context.pending,
      context.filer.primarySSN,
      context.filer,
    );
    const parsed = inputSchema.strict().safeParse(sstbCompanion);
    if (
      !parsed.success || JSON.stringify(parsed.data) !== JSON.stringify(fields)
    ) {
      throw new Error(
        "Form 8995-A Schedule A companion is missing or differs from its parent source",
      );
    }
  } else if (sstbCompanion !== undefined) {
    throw new Error("Form 8995-A Schedule A companion has no SSTB parent");
  }
  if (
    fields.schedule_c_qbi_businesses?.some((business) => business.qbi < 0) ||
    (fields.farm_wotc_filing_source &&
      calculateFarmWotcLines(fields).lossSchedule)
  ) {
    if (aggregationCompanion !== undefined) {
      throw new Error(
        "Form 8995-A Schedule C loss cannot accompany Schedule B aggregation",
      );
    }
    assertScheduleCLossSources(fields, context.pending);
    const parsed = inputSchema.strict().safeParse(lossCompanion);
    if (
      !parsed.success || JSON.stringify(parsed.data) !== JSON.stringify(fields)
    ) {
      throw new Error(
        "Form 8995-A Schedule C companion is missing or differs from its parent source",
      );
    }
  } else if (lossCompanion !== undefined) {
    throw new Error("Form 8995-A Schedule C companion has no loss parent");
  }
  if (fields.patron_of_specified_cooperative === true) {
    assertPatron1099PATRSource(fields, context.pending.f1099patr);
    const parsed = inputSchema.strict().safeParse(companion);
    if (
      !parsed.success || JSON.stringify(parsed.data) !== JSON.stringify(fields)
    ) {
      throw new Error(
        "Form 8995-A Schedule D companion is missing or differs from its parent source",
      );
    }
  } else if (companion !== undefined) {
    throw new Error("Form 8995-A Schedule D companion has no patron parent");
  }
  const form1040 = z.object({ line13_qbi_deduction: z.number() })
    .safeParse(context.pending.f1040);
  if (!form1040.success || form1040.data.line13_qbi_deduction !== deduction) {
    throw new Error("Form 8995-A line 39 differs from Form 1040 line 13");
  }
}

function ownedWotcGroup(
  fields: Form8995AInput,
  details: NonNullable<Form8995AInput["business_filing_details"]>,
  lines: ReturnType<typeof calculateOneBusiness8995ALines>,
): string {
  return elements("QBIDeductionInformationGrp", [
    elements("TradeOrBusinessName", [
      element("BusinessNameLine1Txt", details.business_name),
    ]),
    element("EIN", details.ein),
    ...(fields.patron_of_specified_cooperative === true
      ? [element("PatronInd", "X")]
      : []),
    element("QualifiedBusinessIncomeAmt", lines.line2),
    element("QlfyBusinessIncome20PctAmt", lines.line3),
    ...(fields.patron_business_source &&
        fields.taxable_income <= lines.patronThreshold!
      ? []
      : [
        element("AllocableShareW2WagesAmt", lines.line4),
        element("AllocableShareW2Wages50PctAmt", lines.line5),
        element("AllocableShareW2Wages25PctAmt", lines.line6),
        element("AllocableShareUBIAQlfyPropAmt", lines.line7),
        element("AllcblShrUBIAQlfyProp025PctAmt", lines.line8),
        element("TotalAllcblW2WgsQlfyPropPctAmt", lines.line9),
        element("GrtrAllcblShrW2WageQlfyPropAmt", lines.line10),
        element("W2WageQlfyPropLimitationAmt", lines.line11),
      ]),
    element("QBIDedBeforePatronReductionAmt", lines.line13),
    ...(fields.patron_of_specified_cooperative === true
      ? [element("PatronReductionAmt", lines.line14)]
      : []),
    element("QBIComponentAmt", lines.line15),
    ...(lines.phaseInRequired
      ? [
        element("QBI20PctLessGrtrAllcblShareAmt", lines.line19),
        element("TotalPhaseInReductionAmt", lines.line25),
        element("QBIAfterPhaseInReductionAmt", lines.line26),
      ]
      : []),
  ]);
}

function buildIRS8995A(rawFields: Input, context?: MefBuildContext): string {
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  if (Object.keys(rawFields).length === 0) {
    throw new Error("Form 8995-A MeF cannot file an empty pending record");
  }
  const fields = inputSchema.strict().parse(rawFields);
  assertProducingMiningZeroQbiReturn(fields, context?.pending);
  if (fields.farm_wotc_filing_source) {
    assertQualifiedTipQbiSource(
      fields as unknown as Record<string, unknown>,
      context?.pending,
    );
  }
  assertFarmWotcReturn(
    fields as unknown as Record<string, unknown>,
    context?.pending,
  );
  if (!fields.farm_wotc_filing_source) {
    assertForm8995AWotcReturn(fields, context?.pending);
  }
  assertForm8995APatronReturn(fields, context?.pending);
  if (
    fields.aggregation_filing_details ||
    (fields.aggregation_groups ?? []).length > 0
  ) {
    return buildStagedAggregatedIRS8995A(fields, context);
  }
  if (fields.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)) {
    const lines = calculateScheduleCLossLines(fields);
    reconcileReturn(context, lines.parent.line39, fields);
    const parent = lines.parent;
    return elements("IRS8995A", [
      ...lines.businesses.map((business) => {
        const adjusted = business.qbi > 0;
        return elements("QBIDeductionInformationGrp", [
          elements("TradeOrBusinessName", [
            element("BusinessNameLine1Txt", business.business_name!),
          ]),
          element("EIN", business.ein!),
          element("QualifiedBusinessIncomeAmt", adjusted ? parent.line2 : 0),
          element("QlfyBusinessIncome20PctAmt", adjusted ? parent.line3 : 0),
          element("AllocableShareW2WagesAmt", adjusted ? parent.line4 : 0),
          element("AllocableShareW2Wages50PctAmt", adjusted ? parent.line5 : 0),
          element("AllocableShareW2Wages25PctAmt", adjusted ? parent.line6 : 0),
          element("AllocableShareUBIAQlfyPropAmt", adjusted ? parent.line7 : 0),
          element(
            "AllcblShrUBIAQlfyProp025PctAmt",
            adjusted ? parent.line8 : 0,
          ),
          element(
            "TotalAllcblW2WgsQlfyPropPctAmt",
            adjusted ? parent.line9 : 0,
          ),
          element(
            "GrtrAllcblShrW2WageQlfyPropAmt",
            adjusted ? parent.line10 : 0,
          ),
          element("W2WageQlfyPropLimitationAmt", adjusted ? parent.line11 : 0),
          element(
            "QBIDedBeforePatronReductionAmt",
            adjusted ? parent.line13 : 0,
          ),
          element("QBIComponentAmt", adjusted ? parent.line15 : 0),
        ]);
      }),
      element("TotalQBIComponentAmt", parent.line16),
      element("QlfyREITDivPTPIncomeLossAmt", 0),
      element("PYQlfyREITDivPTPLossCfwdAmt", 0),
      element("TotQlfyREITDivPTPIncomeAmt", 0),
      element("REITPTPComponentAmt", 0),
      element("QBIDedBfrIncomeLimitationAmt", parent.line32),
      element("TaxableIncomeBeforeQBIDedAmt", parent.line33),
      element("NetCapitalGainAmt", parent.line34),
      element("AdjustedTaxableIncomeAmt", parent.line35),
      element("IncomeLimitationAmt", parent.line36),
      element("QBIDedBeforeDPADSect199AgAmt", parent.line37),
      element("DPADSect199AgAllocAgricHortAmt", 0),
      element("QualifiedBusinessIncomeDedAmt", parent.line39),
      element("TotQlfyREITDivPTPLossCfwdAmt", 0),
    ]);
  }
  if (
    fields.sstb_filing_details || (fields.sstb_qbi ?? 0) !== 0 ||
    (fields.sstb_w2_wages ?? 0) !== 0 ||
    (fields.sstb_unadjusted_basis ?? 0) !== 0
  ) {
    const lines = calculateOneSstb8995ALines(fields);
    reconcileReturn(context, lines.line39, fields);
    assertZeroReductionScheduleAReturn(fields, lines, context?.pending);
    return elements("IRS8995A", [
      elements("QBIDeductionInformationGrp", [
        elements("TradeOrBusinessName", [
          element("BusinessNameLine1Txt", lines.source.business_name),
        ]),
        element("SpecifiedServiceInd", "X"),
        element("EIN", lines.source.ein),
        element("QualifiedBusinessIncomeAmt", lines.line2),
        element("QlfyBusinessIncome20PctAmt", lines.line3),
        element("AllocableShareW2WagesAmt", lines.line4),
        element("AllocableShareW2Wages50PctAmt", lines.line5),
        element("AllocableShareW2Wages25PctAmt", lines.line6),
        element("AllocableShareUBIAQlfyPropAmt", lines.line7),
        element("AllcblShrUBIAQlfyProp025PctAmt", lines.line8),
        element("TotalAllcblW2WgsQlfyPropPctAmt", lines.line9),
        element("GrtrAllcblShrW2WageQlfyPropAmt", lines.line10),
        element("W2WageQlfyPropLimitationAmt", lines.line11),
        element("QBIDedBeforePatronReductionAmt", lines.line13),
        element("QBIComponentAmt", lines.line15),
        element("QBI20PctLessGrtrAllcblShareAmt", lines.line19),
        element("TotalPhaseInReductionAmt", lines.line25),
        element("QBIAfterPhaseInReductionAmt", lines.line26),
      ]),
      element("TotalQBIComponentAmt", lines.line16),
      element(
        "FilingStatusThresholdCd",
        lines.threshold,
      ),
      element(
        "TXIBfrQBIDedLessThresholdAmt",
        lines.line33 - lines.threshold,
      ),
      element("FilingStatusPhaseInRangeCd", lines.phaseInRange),
      element("PhaseInPct", lines.phaseIn.toFixed(5)),
      element("QlfyREITDivPTPIncomeLossAmt", 0),
      element("PYQlfyREITDivPTPLossCfwdAmt", 0),
      element("TotQlfyREITDivPTPIncomeAmt", 0),
      element("REITPTPComponentAmt", 0),
      element("QBIDedBfrIncomeLimitationAmt", lines.line32),
      element("TaxableIncomeBeforeQBIDedAmt", lines.line33),
      element("NetCapitalGainAmt", 0),
      element("AdjustedTaxableIncomeAmt", lines.line35),
      element("IncomeLimitationAmt", lines.line36),
      element("QBIDedBeforeDPADSect199AgAmt", lines.line37),
      element("DPADSect199AgAllocAgricHortAmt", 0),
      element("QualifiedBusinessIncomeDedAmt", lines.line39),
      element("TotQlfyREITDivPTPLossCfwdAmt", 0),
    ]);
  }
  const mixed = assertMixedFishingQbiReturn(fields, context?.pending);
  const oldMulti = fields.farm_wotc_filing_source
    ? calculateFarmWotcLines(fields)
    : fields.wotc_business_sources
    ? calculateOwnedWotcBusinesses(fields)
    : undefined;
  const multi = mixed ?? oldMulti;
  const multiRows = mixed
    ? mixed.rows.map((row) => ({
      input: { ...fields, business_filing_details: row.details },
      details: row.details,
      lines: row.lines,
    }))
    : oldMulti?.rows.map((row) => ({
      input: row.input,
      details: row.input.business_filing_details!,
      lines: row.lines,
    }));
  const { details, lines } = multi
    ? {
      details: multiRows![0].details,
      lines: multi.parent,
    }
    : validateOneBusiness(fields);
  if (!multi) assertOneBusinessReitSource(fields, context?.pending);
  reconcileReturn(context, lines.line39, fields);
  return elements("IRS8995A", [
    ...(multiRows
      ? multiRows.map((row) =>
        ownedWotcGroup(row.input, row.details, row.lines)
      )
      : [ownedWotcGroup(fields, details, lines)]),
    element("TotalQBIComponentAmt", lines.line16),
    ...(lines.phaseInRequired
      ? [
        element("FilingStatusThresholdCd", lines.patronThreshold),
        element(
          "TXIBfrQBIDedLessThresholdAmt",
          lines.line33 - lines.patronThreshold!,
        ),
        element("FilingStatusPhaseInRangeCd", lines.patronPhaseInRange),
        element("PhaseInPct", lines.phaseIn!.toFixed(5)),
      ]
      : []),
    element("QlfyREITDivPTPIncomeLossAmt", lines.line28),
    element("PYQlfyREITDivPTPLossCfwdAmt", lines.line29),
    element("TotQlfyREITDivPTPIncomeAmt", lines.line30),
    element("REITPTPComponentAmt", lines.line31),
    element("QBIDedBfrIncomeLimitationAmt", lines.line32),
    element("TaxableIncomeBeforeQBIDedAmt", lines.line33),
    element("NetCapitalGainAmt", lines.line34),
    element("AdjustedTaxableIncomeAmt", lines.line35),
    element("IncomeLimitationAmt", lines.line36),
    element("QBIDedBeforeDPADSect199AgAmt", lines.line37),
    element("DPADSect199AgAllocAgricHortAmt", lines.line38),
    element("QualifiedBusinessIncomeDedAmt", lines.line39),
    element("TotQlfyREITDivPTPLossCfwdAmt", 0),
  ]);
}

export const form8995a: MefFormDescriptor<"form8995a", Input> = {
  pendingKey: "form8995a",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995a.pdf",
  build(fields, context) {
    return buildIRS8995A(fields, context);
  },
};
